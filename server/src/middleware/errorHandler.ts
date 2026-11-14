import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { formatErrorResponse } from '../types';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Never leak raw stack traces or internal secrets to the client
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json(formatErrorResponse(`Validation error: ${errorDetails}`));
    return;
  }

  const statusCode = 'status' in err && typeof (err as { status: unknown }).status === 'number'
    ? (err as { status: number }).status
    : 500;

  // Safe client-facing message
  const safeMessage = statusCode >= 500 ? 'An internal server error occurred.' : err.message || 'Operation failed';

  console.error(`[Server Error] ${err.name}: ${err.message}`);

  res.status(statusCode).json(formatErrorResponse(safeMessage));
}
