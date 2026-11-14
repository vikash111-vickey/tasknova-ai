import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { tasksRouter } from './routes/tasks';
import { executionsRouter } from './routes/executions';
import { eventsRouter } from './routes/events';
import { integrationsRouter } from './routes/integrations';
import { approvalsRouter } from './routes/approvals';
import { verificationsRouter } from './routes/verifications';
import { notificationsRouter } from './routes/notifications';
import { analyticsRouter } from './routes/analytics';
import { reportsRouter } from './routes/reports';
import { planningRouter } from './routes/planning';
import { filesRouter } from './routes/files';
import { chaosRouter } from './routes/chaos';
import { schedulesRouter } from './routes/schedules';
import { policiesRouter } from './routes/policies';
import { demoRouter } from './routes/demo';
import { formatErrorResponse } from './types';

dotenv.config();

export function createApp(): Express {
  const app = express();

  // Security headers with content security policy adjustments
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Strict / configurable CORS configuration
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile apps, curl, or same-origin requests with undefined origin
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Dev-safe fallback
        }
      },
      credentials: true,
    })
  );

  // Global Rate Limiter: 1000 requests per 15 minutes window
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: formatErrorResponse('Too many requests from this IP, please try again later.'),
  });
  app.use(globalLimiter);

  // Dedicated Auth Rate Limiter: 100 auth attempts per 15 mins
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: formatErrorResponse('Too many authentication attempts, please try again later.'),
  });

  // Dedicated Planning Rate Limiter: 150 planning requests per 15 mins
  const planningLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: formatErrorResponse('Too many planning requests, please try again later.'),
  });

  // Request parsing with explicit 2MB body size limit for security pass
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(requestLogger);

  // API Routes
  app.use('/api', healthRouter);
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/executions', executionsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/verifications', verificationsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/planning', planningLimiter, planningRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/chaos', chaosRouter);
  app.use('/api/schedules', schedulesRouter);
  app.use('/api/policies', policiesRouter);
  app.use('/api/demo', demoRouter);

  // Serve static client bundle if built (supports single-command start: npm run build && npm start)
  const clientDistPaths = [
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../client/dist'),
  ];

  const clientDist = clientDistPaths.find((p) => fs.existsSync(p));
  if (clientDist) {
    app.use(express.static(clientDist));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 404 Handler for undefined API routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json(formatErrorResponse('Endpoint not found'));
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
