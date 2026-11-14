import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import crypto from 'crypto';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { VerificationRecord } from '../types/models';
import { formatSuccessResponse, formatErrorResponse } from '../types';

export const verificationsRouter = Router();

const CreateVerificationInputSchema = z.object({
  taskId: z.string().uuid(),
  checksPerformed: z.array(z.string()).min(1),
  status: z.enum(['verified', 'failed']).default('verified'),
});

// GET /api/verifications
verificationsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const list = await repo.getVerifications(req.user!.id);
  res.json(formatSuccessResponse(list, 'Verifications retrieved'));
});

// POST /api/verifications
verificationsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateVerificationInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const repo = getRepository();
  const task = await repo.getTaskById(parsed.data.taskId, req.user!.id);
  if (!task) {
    res.status(404).json(formatErrorResponse('Task not found or access denied'));
    return;
  }

  const proofData = `${task.id}:${task.status}:${JSON.stringify(parsed.data.checksPerformed)}:${Date.now()}`;
  const proofHash = crypto.createHash('sha256').update(proofData).digest('hex');
  const signature = `SIG_TASKNOVA_${crypto.randomBytes(8).toString('hex')}`;

  const newRecord: VerificationRecord = {
    id: uuidv4(),
    taskId: task.id,
    userId: req.user!.id,
    status: parsed.data.status,
    proofHash,
    checksPerformed: parsed.data.checksPerformed,
    signature,
    verifiedAt: new Date().toISOString(),
  };

  const saved = await repo.createVerification(newRecord);

  // Also record to proof ledger
  await repo.recordProof({
    id: uuidv4(),
    taskId: task.id,
    userId: req.user!.id,
    action: `Verification: ${newRecord.status}`,
    proofHash,
    previousHash: '0'.repeat(64),
    timestamp: newRecord.verifiedAt,
  });

  res.status(201).json(formatSuccessResponse(saved, 'Verification recorded and signed'));
});
