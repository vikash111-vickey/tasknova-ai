import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../repository';
import {
  RegisterInputSchema,
  LoginInputSchema,
  ForgotPasswordInputSchema,
  Profile,
} from '../types/models';
import { signToken, requireAuth } from '../middleware/auth';
import { formatSuccessResponse, formatErrorResponse } from '../types';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const { email, password, fullName } = parsed.data;
  const repo = getRepository();

  const existing = await repo.getProfileByEmail(email);
  if (existing) {
    res.status(400).json(formatErrorResponse('An account with this email already exists.'));
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newProfile: Profile = {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    fullName: fullName.trim(),
    role: 'user',
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await repo.createProfile(newProfile, password);
  const token = signToken({ id: saved.id, email: saved.email, role: saved.role });

  // Do not expose passwordHash
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safeUser } = saved;

  res.status(201).json(
    formatSuccessResponse(
      { user: safeUser, token },
      'Registration successful. Welcome to TASKNOVA!'
    )
  );
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  const { email, password } = parsed.data;
  const repo = getRepository();

  const user = await repo.getProfileByEmail(email);
  if (!user || !user.passwordHash) {
    res.status(401).json(formatErrorResponse('Invalid email or password.'));
    return;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json(formatErrorResponse('Invalid email or password.'));
    return;
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safeUser } = user;

  res.json(formatSuccessResponse({ user: safeUser, token }, 'Login successful.'));
});

// POST /api/auth/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json(formatSuccessResponse(null, 'Logged out successfully.'));
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const parsed = ForgotPasswordInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatErrorResponse(parsed.error.errors[0].message));
    return;
  }

  res.json(
    formatSuccessResponse(
      { resetSent: true },
      'Password reset instructions sent to your email address (DEMO).'
    )
  );
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json(formatErrorResponse('Unauthorized'));
    return;
  }

  const repo = getRepository();
  const profile = await repo.getProfileById(req.user.id);
  if (!profile) {
    res.status(404).json(formatErrorResponse('User profile not found.'));
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safeUser } = profile;
  res.json(formatSuccessResponse({ user: safeUser }, 'Session active'));
});

// GET /api/auth/demo-account
authRouter.get('/demo-account', (_req: Request, res: Response) => {
  res.json(
    formatSuccessResponse(
      {
        email: 'demo@tasknova.local',
        password: 'demo12345',
        role: 'operator',
      },
      'Pre-seeded demo credentials'
    )
  );
});
