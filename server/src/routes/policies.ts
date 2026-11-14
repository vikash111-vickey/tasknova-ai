import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { CreatePolicyInputSchema, UpdatePolicyInputSchema, Policy } from '../types/models';
import { formatSuccessResponse, formatErrorResponse } from '../types';

export const policiesRouter = Router();

const DEFAULT_POLICIES: Omit<Policy, 'id' | 'userId' | 'createdAt'>[] = [
  {
    name: 'Require Human Approval for External Email Dispatch',
    ruleType: 'external_communication',
    ruleConfig: { requiresApproval: true, targetActions: ['email.send'] },
    isActive: true,
  },
  {
    name: 'Guard Against Unchecked File & Resource Deletion',
    ruleType: 'security',
    ruleConfig: { requiresApproval: true, targetActions: ['delete', 'remove', 'purge'] },
    isActive: true,
  },
  {
    name: 'Calendar Modification & Invite Guard',
    ruleType: 'require_approval',
    ruleConfig: { requiresApproval: true, targetActions: ['calendar.create_event'] },
    isActive: true,
  },
  {
    name: 'Connector Sandbox Isolation Enforcement',
    ruleType: 'allowed_connectors',
    ruleConfig: { allowedTools: ['gmail', 'drive', 'calendar', 'document', 'web', 'stripe'] },
    isActive: true,
  },
];

// GET /api/policies
policiesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  let list = await repo.getPolicies(req.user!.id);

  // If new user has no policies yet, initialize default safe security policies
  if (list.length === 0) {
    const now = new Date().toISOString();
    for (const def of DEFAULT_POLICIES) {
      await repo.createPolicy({
        id: uuidv4(),
        userId: req.user!.id,
        name: def.name,
        ruleType: def.ruleType,
        ruleConfig: def.ruleConfig,
        isActive: def.isActive,
        createdAt: now,
      });
    }
    list = await repo.getPolicies(req.user!.id);
  }

  res.json(formatSuccessResponse(list, 'Policies retrieved successfully'));
});

// POST /api/policies
policiesRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreatePolicyInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const repo = getRepository();
  const now = new Date().toISOString();

  const newPolicy: Policy = {
    id: uuidv4(),
    userId: req.user!.id,
    name: parsed.data.name,
    ruleType: parsed.data.ruleType,
    ruleConfig: parsed.data.ruleConfig,
    isActive: parsed.data.isActive ?? true,
    createdAt: now,
  };

  const created = await repo.createPolicy(newPolicy);
  res.status(201).json(formatSuccessResponse(created, 'Policy created successfully'));
});

// PUT /api/policies/:id
policiesRouter.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdatePolicyInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const repo = getRepository();
  const updated = await repo.updatePolicy(req.params.id, parsed.data, req.user!.id);

  if (!updated) {
    res.status(404).json(formatErrorResponse('Policy not found or unauthorized'));
    return;
  }

  res.json(formatSuccessResponse(updated, 'Policy updated successfully'));
});

// DELETE /api/policies/:id
policiesRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const success = await repo.deletePolicy(req.params.id, req.user!.id);

  if (!success) {
    res.status(404).json(formatErrorResponse('Policy not found or unauthorized'));
    return;
  }

  res.json(formatSuccessResponse({ deleted: true }, 'Policy deleted successfully'));
});
