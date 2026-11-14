import { Router, Request, Response } from 'express';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { UpdateProfileInputSchema } from '../types/models';
import { formatSuccessResponse, formatErrorResponse } from '../types';

export const usersRouter = Router();

// GET /api/users/profile
usersRouter.get('/profile', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const profile = await repo.getProfileById(req.user!.id);
  if (!profile) {
    res.status(404).json(formatErrorResponse('Profile not found'));
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safeProfile } = profile;
  res.json(formatSuccessResponse(safeProfile, 'Profile retrieved'));
});

// PUT /api/users/profile
usersRouter.put('/profile', requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateProfileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const repo = getRepository();
  const updated = await repo.updateProfile(req.user!.id, parsed.data);
  if (!updated) {
    res.status(404).json(formatErrorResponse('Profile not found'));
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safeProfile } = updated;
  res.json(formatSuccessResponse(safeProfile, 'Profile updated successfully'));
});

// GET /api/users/export (Export all user data as JSON)
usersRouter.get('/export', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const exportPayload = await repo.exportUserData(req.user!.id);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tasknova_user_export_${req.user!.id}.json"`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

// DELETE /api/users/account (Cascade delete user account and isolated records)
usersRouter.delete('/account', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const success = await repo.deleteUserAccount(req.user!.id);
  if (!success) {
    res.status(400).json(formatErrorResponse('Failed to delete account'));
    return;
  }

  res.json(formatSuccessResponse({ deleted: true }, 'User account and data permanently removed'));
});
