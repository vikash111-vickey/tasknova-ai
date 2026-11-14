import { Router, Request, Response } from 'express';
import { HealthDataSchema, formatSuccessResponse } from '../types';
import { getActiveProviderName } from '../services/ai';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const hasSupabaseKeys = Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY)
  );

  const mode = hasSupabaseKeys ? 'live' : 'demo';
  const ai = getActiveProviderName();

  const validatedData = HealthDataSchema.parse({
    status: 'ok',
    mode,
    ai,
  });

  res.json(formatSuccessResponse(validatedData, 'Service is healthy'));
});
