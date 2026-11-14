import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { formatSuccessResponse, formatErrorResponse } from '../types';
import { SSEBroker } from '../sse/broker';
import { Orchestrator } from '../services/execution/orchestrator';

export const executionsRouter = Router();

// POST /api/executions/:id/run
executionsRouter.post('/:id/run', requireAuth, async (req: Request, res: Response) => {
  const taskId = req.params.id;
  const orchestrator = Orchestrator.getInstance();

  try {
    const isAlreadyRunning = orchestrator.isTaskRunning(taskId);

    // Launch or attach to execution
    const taskPromise = orchestrator.runTask(taskId, req.user!.id);

    if (isAlreadyRunning) {
      res.json(
        formatSuccessResponse(
          { taskId, status: 'RUNNING', alreadyRunning: true },
          'Task execution already in progress; returned existing execution lock.'
        )
      );
      return;
    }

    // Don't block the HTTP response on long workflows; let it run asynchronously
    taskPromise.catch((err) => {
      console.error(`[ExecutionsRouter] Background run failed for "${taskId}":`, err);
    });

    res.json(
      formatSuccessResponse(
        { taskId, status: 'RUNNING', alreadyRunning: false },
        'Task execution started'
      )
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to run task execution';
    res.status(400).json(formatErrorResponse(message));
  }
});

// POST /api/executions/:id/cancel
executionsRouter.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  const taskId = req.params.id;
  try {
    const task = await Orchestrator.getInstance().cancelTask(taskId, req.user!.id);
    res.json(formatSuccessResponse(task, 'Task execution cancelled'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel task';
    res.status(400).json(formatErrorResponse(message));
  }
});

// GET /api/executions/:id/files
executionsRouter.get('/:id/files', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const taskId = req.params.id;
  const files = await repo.getGeneratedFilesByTaskId(taskId);
  res.json(formatSuccessResponse(files, 'Generated task files retrieved'));
});

// GET /api/executions/:id
executionsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const task = await repo.getTaskById(req.params.id, req.user!.id);
  if (!task) {
    res.status(404).json(formatErrorResponse('Execution/Task not found or access denied'));
    return;
  }

  let steps = await repo.getTaskSteps(task.id);
  // Auto-reconstruct steps if empty but plan exists (e.g. from prior schema mismatch)
  if (steps.length === 0 && task.plan && (task.plan as any).steps) {
    const planSteps = (task.plan as any).steps || [];
    const stepIdMap = new Map<string, string>();
    for (const step of planSteps) {
      stepIdMap.set(step.id, `${task.id}_${step.id}`);
    }

    for (let i = 0; i < planSteps.length; i++) {
      const s = planSteps[i];
      const mappedId = stepIdMap.get(s.id) || `${task.id}_step_${i + 1}`;
      const mappedDeps = (s.depends_on || []).map((dep: string) => stepIdMap.get(dep) || dep);
      await repo.createTaskStep({
        id: mappedId,
        taskId: task.id,
        stepNumber: i + 1,
        name: s.name,
        tool: s.tool,
        action: s.action,
        status: 'pending',
        input: s.input,
        dependencies: mappedDeps,
        depends_on: mappedDeps,
        requires_approval: Boolean(s.requires_approval),
        risk_level: s.risk_level || 'low',
      });
    }
    steps = await repo.getTaskSteps(task.id);
  }
  const events = await repo.getExecutionEvents(task.id);
  const verification = await repo.getVerificationByTaskId(task.id);
  const files = await repo.getGeneratedFilesByTaskId(task.id);

  res.json(
    formatSuccessResponse(
      {
        task,
        steps,
        events,
        verification,
        files,
        isRunning: Orchestrator.getInstance().isTaskRunning(task.id),
      },
      'Execution details retrieved'
    )
  );
});

// GET /api/executions/:id/events
executionsRouter.get('/:id/events', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const task = await repo.getTaskById(req.params.id, req.user!.id);
  if (!task) {
    res.status(404).json(formatErrorResponse('Execution/Task not found or access denied'));
    return;
  }

  const sinceId = typeof req.query.sinceId === 'string' ? req.query.sinceId : undefined;
  const events = await repo.getExecutionEvents(task.id, sinceId);
  res.json(formatSuccessResponse(events, 'Events retrieved'));
});

// GET /api/executions/:id/stream (SSE)
executionsRouter.get('/:id/stream', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const taskId = req.params.id;

  // Authorization check on SSE connection
  const task = await repo.getTaskById(taskId, req.user!.id);
  if (!task) {
    res.status(404).json(formatErrorResponse('Task not found or access denied'));
    return;
  }

  const lastEventId =
    (req.headers['last-event-id'] as string) ||
    (typeof req.query.lastEventId === 'string' ? req.query.lastEventId : undefined);

  const clientId = `client-${uuidv4()}`;

  SSEBroker.getInstance().addClient(
    {
      id: clientId,
      res,
      taskId,
      userId: req.user!.id,
    },
    lastEventId
  );
});
