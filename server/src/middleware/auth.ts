import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { formatErrorResponse } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'tasknova-demo-secret-phase2-zero-config';

export function signToken(user: AuthUser, expiresIn: string | number = '7d'): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: jwt.SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    options
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && typeof req.query.token === 'string') {
    // Also support token in query parameter for SSE EventSource connections
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json(formatErrorResponse('Authentication required. Missing Bearer token.'));
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json(formatErrorResponse('Invalid or expired authentication token.'));
    return;
  }

  req.user = user;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}
