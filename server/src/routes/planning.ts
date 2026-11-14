import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import { formatSuccessResponse, formatErrorResponse } from '../types';
import {
  UnderstandRequestSchema,
  GeneratePlanRequestSchema,
} from '../services/planning/schemas';
import { PlanningPipeline } from '../services/planning/pipeline';
import { getRepository } from '../repository';
import { Task, TaskStep, ExecutionEvent } from '../types/models';
import { SSEBroker } from '../sse/broker';
import {
  getActiveProviderName,
  setAIProviderOverride,
  GeminiProvider,
  OpenAICompatibleProvider,
} from '../services/ai';

export const planningRouter = Router();
const pipeline = new PlanningPipeline();

// GET /api/planning/config - Get active AI engine status
planningRouter.get('/config', (_req: Request, res: Response) => {
  const provider = getActiveProviderName();
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  res.json(
    formatSuccessResponse(
      {
        provider,
        hasKey,
        model:
          provider === 'gemini'
            ? 'gemini-1.5-pro'
            : provider === 'openai'
            ? 'gpt-4o'
            : 'template-v1',
      },
      'AI configuration loaded'
    )
  );
});

// POST /api/planning/config - Dynamically connect Gemini or OpenAI API Key
planningRouter.post('/config', requireAuth, async (req: Request, res: Response) => {
  const { provider, apiKey, model } = req.body || {};

  try {
    if (provider === 'gemini') {
      const key = (apiKey && typeof apiKey === 'string' && apiKey.trim()) || process.env.GEMINI_API_KEY;
      if (!key) {
        res.status(400).json(formatErrorResponse('Gemini API key is required.'));
        return;
      }
      process.env.GEMINI_API_KEY = key;
      setAIProviderOverride(new GeminiProvider(key, model || 'gemini-1.5-pro'));
    } else if (provider === 'openai') {
      const key = (apiKey && typeof apiKey === 'string' && apiKey.trim()) || process.env.OPENAI_API_KEY;
      if (!key) {
        res.status(400).json(formatErrorResponse('OpenAI API key is required.'));
        return;
      }
      process.env.OPENAI_API_KEY = key;
      setAIProviderOverride(new OpenAICompatibleProvider(key, undefined, model || 'gpt-4o'));
    } else {
      // Revert to template offline planner
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      setAIProviderOverride(null);
    }

    const currentProvider = getActiveProviderName();
    res.json(
      formatSuccessResponse(
        {
          provider: currentProvider,
          connected: true,
          model: model || (currentProvider === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4o'),
        },
        `Successfully connected ${currentProvider.toUpperCase()} AI engine to Tasknova planner!`
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to configure AI engine';
    res.status(500).json(formatErrorResponse(msg));
  }
});

// POST /api/planning/understand
planningRouter.post('/understand', requireAuth, async (req: Request, res: Response) => {
  const parsed = UnderstandRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  try {
    const analysis = await pipeline.understand(parsed.data.instruction);
    res.json(formatSuccessResponse(analysis, 'Intent analysis completed'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to analyze instruction';
    res.status(500).json(formatErrorResponse(message));
  }
});

// POST /api/planning/generate
planningRouter.post('/generate', requireAuth, async (req: Request, res: Response) => {
  const parsed = GeneratePlanRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const { instruction, clarifications, taskId } = parsed.data;
  const repo = getRepository();

  try {
    const result = await pipeline.generate(instruction, req.user!.id, clarifications);
    const now = new Date().toISOString();

    let targetTask: Task | null = null;

    if (taskId) {
      targetTask = await repo.getTaskById(taskId, req.user!.id);
      if (targetTask) {
        targetTask = await repo.updateTask(
          taskId,
          {
            status: 'AWAITING_APPROVAL',
            plan: result.plan as unknown as Record<string, unknown>,
            instructions: instruction,
          },
          req.user!.id
        );
      }
    }

    if (!targetTask) {
      const newTask: Task = {
        id: uuidv4(),
        userId: req.user!.id,
        title: result.plan.title,
        instructions: instruction,
        status: 'AWAITING_APPROVAL', // Plans are saved with status AWAITING_APPROVAL and never auto-run
        mode: 'demo',
        priority: result.plan.risk_level === 'high' ? 'high' : 'normal',
        plan: result.plan as unknown as Record<string, unknown>,
        createdAt: now,
        updatedAt: now,
      };
      targetTask = await repo.createTask(newTask);
    }

    // Persist planned steps with task-scoped unique IDs and remapped dependencies
    const stepIdMap = new Map<string, string>();
    for (const step of result.plan.steps) {
      stepIdMap.set(step.id, `${targetTask.id}_${step.id}`);
    }

    for (let i = 0; i < result.plan.steps.length; i++) {
      const step = result.plan.steps[i];
      const mappedId = stepIdMap.get(step.id) || `${targetTask.id}_step_${i + 1}`;
      const mappedDeps = (step.depends_on || []).map((dep) => stepIdMap.get(dep) || dep);

      const newStep: TaskStep = {
        id: mappedId,
        taskId: targetTask.id,
        stepNumber: i + 1,
        name: step.name,
        tool: step.tool,
        action: step.action,
        status: 'pending',
        input: step.input,
        dependencies: mappedDeps,
        depends_on: mappedDeps,
        requires_approval: Boolean(step.requires_approval),
        risk_level: step.risk_level || 'low',
        startedAt: undefined,
        completedAt: undefined,
      };
      await repo.createTaskStep(newStep);
    }

    // Persist planning event & broadcast
    const planEvent: ExecutionEvent = {
      id: uuidv4(),
      taskId: targetTask.id,
      userId: req.user!.id,
      type: 'status_change',
      message: `Plan generated by ${result.planner_used}. Status: AWAITING_APPROVAL.`,
      payload: {
        status: 'AWAITING_APPROVAL',
        stepsCount: result.plan.steps.length,
        fallbackUsed: result.fallback_used,
        planner: result.planner_used,
      },
      timestamp: now,
    };
    await repo.createExecutionEvent(planEvent);
    await SSEBroker.getInstance().broadcastEvent(planEvent);

    res.status(201).json(
      formatSuccessResponse(
        {
          task: targetTask,
          plan: result.plan,
          planner_used: result.planner_used,
          fallback_used: result.fallback_used,
          intent: result.intent,
        },
        'Execution plan generated and awaiting operator approval'
      )
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate plan';
    res.status(400).json(formatErrorResponse(message));
  }
});

// POST /api/planning/:taskId/approve-plan
planningRouter.post('/:taskId/approve-plan', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const task = await repo.getTaskById(req.params.taskId, req.user!.id);
  if (!task) {
    res.status(404).json(formatErrorResponse('Task not found or access denied'));
    return;
  }

  if (task.status !== 'AWAITING_APPROVAL') {
    res.status(400).json(formatErrorResponse(`Task is not in AWAITING_APPROVAL state (current: ${task.status})`));
    return;
  }

  const updated = await repo.updateTask(task.id, { status: 'pending' }, req.user!.id);

  const approvalEvent: ExecutionEvent = {
    id: uuidv4(),
    taskId: task.id,
    userId: req.user!.id,
    type: 'status_change',
    message: 'Plan approved by operator. Task queued for execution.',
    payload: { status: 'pending' },
    timestamp: new Date().toISOString(),
  };
  await repo.createExecutionEvent(approvalEvent);
  await SSEBroker.getInstance().broadcastEvent(approvalEvent);

  res.json(formatSuccessResponse(updated, 'Plan approved. Task is ready for execution.'));
});
