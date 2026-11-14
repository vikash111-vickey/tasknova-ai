import { Router, Request, Response } from 'express';
import { seedLocalStore } from '../scripts/seed';
import { resetRepository } from '../repository';
import { DemoStore } from '../connectors/demoStore';
import { formatSuccessResponse, formatErrorResponse } from '../types';

export const demoRouter = Router();

// POST /api/demo/reset
demoRouter.post('/reset', async (_req: Request, res: Response) => {
  try {
    // 1. Re-seed local store data on disk
    await seedLocalStore();

    // 2. Clear repository cache so next fetch reloads fresh seed
    resetRepository();

    // 3. Reset in-memory DemoStore (emails, drive, calendar, outbox)
    DemoStore.getInstance().reset();

    res.json(
      formatSuccessResponse(
        {
          reset: true,
          timestamp: new Date().toISOString(),
          status: 'Seed state restored successfully',
        },
        'Demo environment and seed state have been successfully reset.'
      )
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset demo state';
    res.status(500).json(formatErrorResponse(message));
  }
});
