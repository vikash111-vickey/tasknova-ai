import { Router, Request, Response } from 'express';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { ApprovalDecisionInputSchema } from '../types/models';
import { formatSuccessResponse, formatErrorResponse } from '../types';
import { ApprovalEngine } from '../services/execution/approvalEngine';
import { Orchestrator } from '../services/execution/orchestrator';

export const approvalsRouter = Router();

// GET /api/approvals
approvalsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const list = await repo.getApprovals(req.user!.id);
  res.json(formatSuccessResponse(list, 'Approvals retrieved'));
});

// GET /api/approvals/:id
approvalsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const approval = await repo.getApprovalById(req.params.id, req.user!.id);
  if (!approval) {
    res.status(404).json(formatErrorResponse('Approval request not found'));
    return;
  }
  res.json(formatSuccessResponse(approval, 'Approval details retrieved'));
});

// POST /api/approvals/:id/approve
approvalsRouter.post('/:id/approve', requireAuth, async (req: Request, res: Response) => {
  const parsed = ApprovalDecisionInputSchema.safeParse(req.body);
  const note = parsed.success ? parsed.data.note : undefined;

  try {
    const updated = await ApprovalEngine.getInstance().approve(
      req.params.id,
      req.user!.id,
      note
    );

    // Auto-resume task execution
    Orchestrator.getInstance()
      .runTask(updated.taskId, req.user!.id)
      .catch((err) => {
        console.error(`[Approvals] Failed to resume task "${updated.taskId}" after approval:`, err);
      });

    res.json(formatSuccessResponse(updated, 'Action approved and execution resumed'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to approve action';
    res.status(400).json(formatErrorResponse(message));
  }
});

// POST /api/approvals/:id/reject
approvalsRouter.post('/:id/reject', requireAuth, async (req: Request, res: Response) => {
  const parsed = ApprovalDecisionInputSchema.safeParse(req.body);
  const note = parsed.success ? parsed.data.note : undefined;

  try {
    const updated = await ApprovalEngine.getInstance().reject(
      req.params.id,
      req.user!.id,
      note
    );
    res.json(formatSuccessResponse(updated, 'Action rejected and task cancelled'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reject action';
    res.status(400).json(formatErrorResponse(message));
  }
});

// PUT /api/approvals/:id/edit
approvalsRouter.put('/:id/edit', requireAuth, async (req: Request, res: Response) => {
  const { payload } = req.body;
  if (!payload || typeof payload !== 'object') {
    res.status(400).json(formatErrorResponse('Edited payload object is required.'));
    return;
  }

  try {
    const updated = await ApprovalEngine.getInstance().editPayload(
      req.params.id,
      req.user!.id,
      payload
    );
    res.json(
      formatSuccessResponse(
        updated,
        'Action payload edited. Previous approval invalidated and fresh authorization required.'
      )
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to edit action payload';
    res.status(400).json(formatErrorResponse(message));
  }
});
