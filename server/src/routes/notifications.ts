import { Router, Request, Response } from 'express';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { formatSuccessResponse, formatErrorResponse } from '../types';

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const list = await repo.getNotifications(req.user!.id);
  res.json(formatSuccessResponse(list, 'Notifications retrieved'));
});

// GET /api/notifications/unread-count
notificationsRouter.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const count = await repo.getUnreadNotificationCount(req.user!.id);
  res.json(formatSuccessResponse({ unreadCount: count }, 'Unread count retrieved'));
});

// PATCH /api/notifications/read-all
notificationsRouter.patch('/read-all', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  await repo.markAllNotificationsAsRead(req.user!.id);
  res.json(formatSuccessResponse({ allRead: true }, 'All notifications marked as read'));
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const success = await repo.markNotificationAsRead(req.params.id, req.user!.id);
  if (!success) {
    res.status(404).json(formatErrorResponse('Notification not found'));
    return;
  }
  res.json(formatSuccessResponse({ read: true }, 'Notification marked as read'));
});

// DELETE /api/notifications/:id
notificationsRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const success = await repo.deleteNotification(req.params.id, req.user!.id);
  if (!success) {
    res.status(404).json(formatErrorResponse('Notification not found'));
    return;
  }
  res.json(formatSuccessResponse({ deleted: true }, 'Notification deleted'));
});
