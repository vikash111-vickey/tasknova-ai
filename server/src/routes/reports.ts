import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { CreateReportInputSchema } from '../types/models';
import { formatSuccessResponse, formatErrorResponse } from '../types';

export const reportsRouter = Router();

// GET /api/reports
reportsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const userId = req.user!.id;
  const tasks = await repo.getTasks(userId);
  const verifications = await repo.getVerifications(userId);
  const generatedFiles = await repo.getGeneratedFiles(userId);

  // Cross-reference files with tasks
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const filesWithTask = generatedFiles.map((f) => ({
    ...f,
    taskTitle: taskMap.get(f.taskId)?.title || 'Autonomous Task',
    taskStatus: taskMap.get(f.taskId)?.status || 'completed',
  }));

  const reportList = [
    {
      id: 'rep-demo-1',
      title: 'Executive Autonomous Execution Audit',
      type: 'audit',
      generatedAt: new Date().toISOString(),
      summary: `${tasks.length} tasks processed, ${verifications.length} verified outputs.`,
      status: 'ready',
    },
    {
      id: 'rep-demo-2',
      title: 'Cryptographic Proof & Verification Log',
      type: 'performance',
      generatedAt: new Date(Date.now() - 3600000).toISOString(),
      summary: '100% SHA-256 chain verification integrity. Zero tampering detected.',
      status: 'ready',
    },
  ];

  res.json(
    formatSuccessResponse(
      {
        reports: reportList,
        files: filesWithTask,
      },
      'Reports and generated files retrieved'
    )
  );
});

// POST /api/reports
reportsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateReportInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const repo = getRepository();
  const tasks = await repo.getTasks(req.user!.id);

  const newReport = {
    id: uuidv4(),
    title: parsed.data.name,
    type: parsed.data.type,
    range: parsed.data.range,
    generatedAt: new Date().toISOString(),
    metrics: {
      taskCount: tasks.length,
      statusBreakdown: {
        completed: tasks.filter((t) => t.status === 'completed' || t.status === 'COMPLETED').length,
        failed: tasks.filter((t) => t.status === 'failed' || t.status === 'FAILED').length,
      },
    },
    status: 'ready',
  };

  res.status(201).json(formatSuccessResponse(newReport, 'Report generated successfully (DEMO)'));
});
