import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { CreateScheduleInputSchema, UpdateScheduleInputSchema, Schedule } from '../types/models';
import { formatSuccessResponse, formatErrorResponse } from '../types';
import { SchedulerService } from '../services/scheduling/scheduler';

export const schedulesRouter = Router();

// GET /api/schedules
schedulesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const list = await repo.getSchedules(req.user!.id);
  res.json(formatSuccessResponse(list, 'Schedules retrieved successfully'));
});

// POST /api/schedules
schedulesRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateScheduleInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const repo = getRepository();
  const now = new Date().toISOString();

  const newSchedule: Schedule = {
    id: uuidv4(),
    userId: req.user!.id,
    name: parsed.data.name,
    instruction: parsed.data.instruction,
    cronExpression: parsed.data.cronExpression,
    recurrence: parsed.data.recurrence,
    timezone: parsed.data.timezone || 'UTC',
    isActive: parsed.data.isActive ?? true,
    taskId: parsed.data.taskId,
    createdAt: now,
  };

  const created = await repo.createSchedule(newSchedule);

  // Register in node-cron runner
  if (created.isActive) {
    SchedulerService.getInstance().registerCronJob(created);
  }

  res.status(201).json(formatSuccessResponse(created, 'Scheduled task created successfully'));
});

// PUT /api/schedules/:id
schedulesRouter.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateScheduleInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const repo = getRepository();
  const updated = await repo.updateSchedule(req.params.id, parsed.data, req.user!.id);

  if (!updated) {
    res.status(404).json(formatErrorResponse('Schedule not found or unauthorized'));
    return;
  }

  // Update in scheduler
  if (updated.isActive) {
    SchedulerService.getInstance().registerCronJob(updated);
  } else {
    SchedulerService.getInstance().unregisterCronJob(updated.id);
  }

  res.json(formatSuccessResponse(updated, 'Schedule updated successfully'));
});

// DELETE /api/schedules/:id
schedulesRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const success = await repo.deleteSchedule(req.params.id, req.user!.id);

  if (!success) {
    res.status(404).json(formatErrorResponse('Schedule not found or unauthorized'));
    return;
  }

  SchedulerService.getInstance().unregisterCronJob(req.params.id);
  res.json(formatSuccessResponse({ deleted: true }, 'Schedule deleted successfully'));
});

// POST /api/schedules/:id/run
schedulesRouter.post('/:id/run', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const schedules = await repo.getSchedules(req.user!.id);
  const target = schedules.find((s) => s.id === req.params.id);

  if (!target) {
    res.status(404).json(formatErrorResponse('Schedule not found or unauthorized'));
    return;
  }

  try {
    const task = await SchedulerService.getInstance().runNow(target);
    res.json(
      formatSuccessResponse(
        {
          task,
          schedule: target,
          executionWorkspaceUrl: `/tasks/${task.id}/execute`,
        },
        `Scheduled task "${target.name || target.id}" triggered immediately`
      )
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to trigger scheduled run';
    res.status(500).json(formatErrorResponse(message));
  }
});
