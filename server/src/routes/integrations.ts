import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { ConnectIntegrationInputSchema, Integration } from '../types/models';
import { formatSuccessResponse, formatErrorResponse } from '../types';
import { OAuthService } from '../services/integrations/oauth';
import { DemoStore } from '../connectors/demoStore';

export const integrationsRouter = Router();

// GET /api/integrations/status (App Marketplace info for 6 core apps)
integrationsRouter.get('/status', requireAuth, async (req: Request, res: Response) => {
  const oauth = OAuthService.getInstance();
  const connectors = oauth.getSupportedIntegrations();
  const repo = getRepository();
  const userIntegrations = await repo.getIntegrations(req.user!.id);

  // Cross-reference with user-connected state
  const enriched = connectors.map((c) => {
    const existing = userIntegrations.find((ui) => ui.type === c.type || ui.name.toLowerCase().includes(c.id));
    return {
      ...c,
      status: existing ? existing.status : 'connected', // Default demo connected
      lastSync: existing ? existing.updatedAt : new Date().toISOString(),
      userIntegrationId: existing?.id,
    };
  });

  res.json(formatSuccessResponse(enriched, 'Integration catalog retrieved'));
});

// GET /api/integrations
integrationsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const list = await repo.getIntegrations(req.user!.id);
  res.json(formatSuccessResponse(list, 'Integrations retrieved'));
});

// POST /api/integrations
integrationsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = ConnectIntegrationInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const repo = getRepository();
  const now = new Date().toISOString();
  const newIntegration: Integration = {
    id: uuidv4(),
    userId: req.user!.id,
    name: parsed.data.name,
    type: parsed.data.type,
    isLive: parsed.data.isLive || false,
    status: 'connected',
    config: parsed.data.config || {},
    createdAt: now,
    updatedAt: now,
  };

  const saved = await repo.createOrUpdateIntegration(newIntegration);
  res.status(201).json(formatSuccessResponse(saved, 'Integration connected'));
});

// POST /api/integrations/:id/connect
integrationsRouter.post('/:id/connect', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const item = await repo.getIntegrationById(req.params.id, req.user!.id);
  if (!item) {
    res.status(404).json(formatErrorResponse('Integration not found'));
    return;
  }

  item.status = 'connected';
  const updated = await repo.createOrUpdateIntegration(item);
  res.json(formatSuccessResponse(updated, 'Integration status set to connected'));
});

// POST /api/integrations/:id/disconnect
integrationsRouter.post('/:id/disconnect', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const item = await repo.getIntegrationById(req.params.id, req.user!.id);
  if (!item) {
    res.status(404).json(formatErrorResponse('Integration not found'));
    return;
  }

  item.status = 'disconnected';
  const updated = await repo.createOrUpdateIntegration(item);
  res.json(formatSuccessResponse(updated, 'Integration disconnected'));
});

// POST /api/integrations/:type/oauth
integrationsRouter.post('/:type/oauth', requireAuth, async (req: Request, res: Response) => {
  const oauth = OAuthService.getInstance();
  const redirectUri = (req.body.redirectUri as string) || 'http://localhost:5173/integrations';
  const state = uuidv4();

  const authResult = oauth.getGoogleAuthUrl(redirectUri, state);
  if (authResult.error) {
    res.status(400).json(
      formatErrorResponse(
        authResult.error,
        {
          canConnectLive: false,
          requiredKeys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
        }
      )
    );
    return;
  }

  res.json(
    formatSuccessResponse(
      {
        canConnectLive: true,
        authUrl: authResult.url,
        state,
      },
      'OAuth URL generated'
    )
  );
});

// GET /api/integrations/demo-store/summary
integrationsRouter.get('/demo-store/summary', requireAuth, async (_req: Request, res: Response) => {
  const demoStore = DemoStore.getInstance();
  res.json(
    formatSuccessResponse(
      {
        invoicesCount: 4,
        customersCount: 3,
        outboxEmailsCount: demoStore.outbox.length,
        driveFilesCount: demoStore.driveFiles.length,
        calendarEventsCount: demoStore.calendarEvents.length,
        inboxEmailsCount: demoStore.emails.length,
      },
      'DemoStore metrics retrieved'
    )
  );
});
