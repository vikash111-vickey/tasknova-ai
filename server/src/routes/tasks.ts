import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { CreateTaskInputSchema, Task, ExecutionEvent } from '../types/models';
import { formatSuccessResponse, formatErrorResponse } from '../types';
import { SSEBroker } from '../sse/broker';
import { ProofLedger } from '../services/verification/proofLedger';
import { TrustScoreCalculator } from '../services/verification/trustScore';
import { ProofCertificateGenerator } from '../services/verification/certificateGenerator';

export const tasksRouter = Router();

// GET /api/tasks
tasksRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const tasks = await repo.getTasks(req.user!.id);
  res.json(formatSuccessResponse(tasks, 'Tasks retrieved'));
});

// POST /api/tasks
tasksRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateTaskInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const repo = getRepository();
  const now = new Date().toISOString();

  const newTask: Task = {
    id: uuidv4(),
    userId: req.user!.id,
    title: parsed.data.title,
    instructions: parsed.data.instructions,
    status: 'pending',
    mode: parsed.data.mode || 'demo',
    priority: parsed.data.priority || 'normal',
    tags: parsed.data.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  const savedTask = await repo.createTask(newTask);

  // Persist initial execution event and broadcast
  const initialEvent: ExecutionEvent = {
    id: uuidv4(),
    taskId: savedTask.id,
    userId: req.user!.id,
    type: 'status_change',
    message: `Task "${savedTask.title}" created in pending state.`,
    payload: { status: 'pending', mode: savedTask.mode },
    timestamp: now,
  };

  await repo.createExecutionEvent(initialEvent);
  await SSEBroker.getInstance().broadcastEvent(initialEvent);

  res.status(201).json(formatSuccessResponse(savedTask, 'Task created successfully'));
});

// GET /api/tasks/:id
tasksRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const task = await repo.getTaskById(req.params.id, req.user!.id);
  if (!task) {
    // User isolation: returns 404 if not found or owned by someone else
    res.status(404).json(formatErrorResponse('Task not found'));
    return;
  }

  const steps = await repo.getTaskSteps(task.id);
  res.json(formatSuccessResponse({ ...task, steps }, 'Task retrieved'));
});

// POST /api/tasks/:id/cancel
tasksRouter.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const task = await repo.getTaskById(req.params.id, req.user!.id);
  if (!task) {
    res.status(404).json(formatErrorResponse('Task not found or access denied'));
    return;
  }

  if (task.status === 'completed' || task.status === 'cancelled') {
    res.status(400).json(formatErrorResponse(`Cannot cancel task that is already ${task.status}`));
    return;
  }

  const updated = await repo.updateTask(task.id, { status: 'cancelled' }, req.user!.id);

  const cancelEvent: ExecutionEvent = {
    id: uuidv4(),
    taskId: task.id,
    userId: req.user!.id,
    type: 'status_change',
    message: `Task cancelled by user.`,
    payload: { status: 'cancelled' },
    timestamp: new Date().toISOString(),
  };

  await repo.createExecutionEvent(cancelEvent);
  await SSEBroker.getInstance().broadcastEvent(cancelEvent);

  res.json(formatSuccessResponse(updated, 'Task cancelled successfully'));
});

// POST /api/tasks/:id/retry
tasksRouter.post('/:id/retry', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const task = await repo.getTaskById(req.params.id, req.user!.id);
  if (!task) {
    res.status(404).json(formatErrorResponse('Task not found or access denied'));
    return;
  }

  const updated = await repo.updateTask(task.id, { status: 'pending', error: undefined }, req.user!.id);

  const retryEvent: ExecutionEvent = {
    id: uuidv4(),
    taskId: task.id,
    userId: req.user!.id,
    type: 'status_change',
    message: `Task queued for retry.`,
    payload: { status: 'pending' },
    timestamp: new Date().toISOString(),
  };

  await repo.createExecutionEvent(retryEvent);
  await SSEBroker.getInstance().broadcastEvent(retryEvent);

  res.json(formatSuccessResponse(updated, 'Task retry initiated'));
});

// GET /api/tasks/:id/proof
tasksRouter.get('/:id/proof', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const task = await repo.getTaskById(req.params.id, req.user!.id);
  if (!task) {
    res.status(404).json(formatErrorResponse('Task not found or access denied'));
    return;
  }

  const entries = await repo.getProofLedgerByTaskId(task.id);
  const evidenceList = await repo.getEvidenceRecords(task.id);
  const chainCheck = await ProofLedger.getInstance().verifyChain(task.id);
  const trustBreakdown = await TrustScoreCalculator.calculateTaskTrustScore(task.id, req.user!.id);

  res.json(
    formatSuccessResponse(
      {
        taskId: task.id,
        chain: entries,
        evidence: evidenceList,
        chainCheck,
        trustScore: trustBreakdown.trustScore,
        trustBreakdown,
      },
      'Task proof ledger retrieved'
    )
  );
});

// POST /api/tasks/:id/proof/verify
tasksRouter.post('/:id/proof/verify', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const task = await repo.getTaskById(req.params.id, req.user!.id);
  if (!task) {
    res.status(404).json(formatErrorResponse('Task not found or access denied'));
    return;
  }

  const chainCheck = await ProofLedger.getInstance().verifyChain(task.id);
  const trustBreakdown = await TrustScoreCalculator.calculateTaskTrustScore(task.id, req.user!.id);
  const result = {
    ...chainCheck,
    trustScore: chainCheck.valid ? trustBreakdown.trustScore : 0,
    totalEntries: chainCheck.chainLength,
  };

  const message = chainCheck.valid
    ? `Proof ledger chain verified intact (${chainCheck.chainLength} blocks, 0 broken links)`
    : `Proof ledger verification failed: broken link detected at block #${chainCheck.brokenLinkIndex}`;

  res.json(formatSuccessResponse(result, message));
});

// GET /api/tasks/:id/proof/certificate
tasksRouter.get('/:id/proof/certificate', requireAuth, async (req: Request, res: Response) => {
  try {
    const pdfBytes = await ProofCertificateGenerator.generateCertificatePdf(req.params.id, req.user!.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Proof_Certificate_${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate proof certificate';
    res.status(400).json(formatErrorResponse(message));
  }
});
