import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { formatSuccessResponse, formatErrorResponse } from '../types';
import { ChaosEngine } from '../services/recovery/chaosEngine';

export const chaosRouter = Router();

const ChaosInjectInputSchema = z.object({
  faultType: z.enum(['network_timeout', 'auth_expiry', 'verification_mismatch', 'provider_503']),
  target: z.string().optional().default(''),
  occurrences: z.number().int().min(1).max(10).optional().default(1),
});

// POST /api/chaos/inject
chaosRouter.post('/inject', requireAuth, async (req: Request, res: Response) => {
  const parsed = ChaosInjectInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  try {
    const fault = await ChaosEngine.getInstance().injectFault(
      req.user!.id,
      parsed.data.faultType,
      parsed.data.target,
      parsed.data.occurrences
    );

    res.status(201).json(formatSuccessResponse(fault, `Chaos fault [${fault.faultType}] injected for user`));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to inject chaos fault';
    res.status(500).json(formatErrorResponse(message));
  }
});

// GET /api/chaos/faults
chaosRouter.get('/faults', requireAuth, async (req: Request, res: Response) => {
  try {
    const faults = await ChaosEngine.getInstance().getActiveFaults(req.user!.id);
    res.json(formatSuccessResponse(faults, 'Active chaos faults retrieved'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve chaos faults';
    res.status(500).json(formatErrorResponse(message));
  }
});

// DELETE /api/chaos/faults
chaosRouter.delete('/faults', requireAuth, async (req: Request, res: Response) => {
  try {
    await ChaosEngine.getInstance().clearFaults(req.user!.id);
    res.json(formatSuccessResponse({ cleared: true }, 'All chaos faults cleared'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to clear chaos faults';
    res.status(500).json(formatErrorResponse(message));
  }
});
