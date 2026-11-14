import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import { SSEBroker } from '../sse/broker';
import { getRepository } from '../repository';
import { formatSuccessResponse } from '../types';

export const eventsRouter = Router();

// GET /api/events (Paginated, searchable & category-filtered activity events)
eventsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const userId = req.user!.id;
  const category = (req.query.category as string) || 'all';
  const search = (req.query.search as string || '').toLowerCase();
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const allEvents = await repo.getGlobalEvents(userId);

  // Filter by category
  let filtered = allEvents;
  if (category !== 'all') {
    filtered = filtered.filter((event) => {
      if (category === 'verification') return event.type === 'verification';
      if (category === 'recovery') return event.type === 'recovery';
      if (category === 'approval') return event.type === 'approval_required';
      if (category === 'execution') {
        return event.type === 'step_start' || event.type === 'step_finish' || event.type === 'status_change';
      }
      if (category === 'integration') {
        return (
          event.message.toLowerCase().includes('stripe') ||
          event.message.toLowerCase().includes('email') ||
          event.message.toLowerCase().includes('drive') ||
          event.message.toLowerCase().includes('calendar') ||
          event.message.toLowerCase().includes('document')
        );
      }
      if (category === 'system') return event.type === 'log';
      return true;
    });
  }

  // Filter by search query
  if (search.trim()) {
    filtered = filtered.filter(
      (e) =>
        e.message.toLowerCase().includes(search) ||
        e.type.toLowerCase().includes(search) ||
        (e.taskId && e.taskId.toLowerCase().includes(search))
    );
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  res.json(
    formatSuccessResponse(
      {
        events: paginated,
        total,
        offset,
        limit,
      },
      'Activity events retrieved'
    )
  );
});

// GET /api/events/stream (Global SSE activity stream for user)
eventsRouter.get('/stream', requireAuth, (req: Request, res: Response) => {
  const lastEventId =
    (req.headers['last-event-id'] as string) ||
    (typeof req.query.lastEventId === 'string' ? req.query.lastEventId : undefined);

  const clientId = `global-client-${uuidv4()}`;

  SSEBroker.getInstance().addClient(
    {
      id: clientId,
      res,
      userId: req.user!.id,
    },
    lastEventId
  );
});
