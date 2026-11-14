import { z } from 'zod';

export type UserRole = 'user' | 'admin' | 'operator';
export type TaskStatus =
  | 'CREATED'
  | 'PLANNING'
  | 'AWAITING_APPROVAL'
  | 'QUEUED'
  | 'RUNNING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'RECOVERY_IN_PROGRESS'
  | 'CANCELLED'
  | 'pending'
  | 'planning'
  | 'executing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type IntegrationType = 'email' | 'slack' | 'sheets' | 'github' | 'stripe' | 'webhook';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  passwordHash?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  instructions: string;
  status: TaskStatus;
  mode: 'demo' | 'live';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  tags?: string[];
  plan?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  trustScore?: number;
  trust_score?: number;
  durationSeconds?: number;
  duration_seconds?: number;
}

export interface TaskStep {
  id: string;
  taskId: string;
  stepNumber: number;
  name: string;
  tool?: string;
  action: string;
  status: StepStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  dependencies?: string[];
  depends_on?: string[];
  requires_approval?: boolean;
  risk_level?: string;
  retryCount?: number;
  retry_count?: number;
  outputRef?: string;
  output_ref?: string;
  verificationStatus?: 'PENDING' | 'CHECKING' | 'VERIFIED' | 'FAILED' | 'INCONCLUSIVE' | 'SKIPPED';
  verification_status?: 'PENDING' | 'CHECKING' | 'VERIFIED' | 'FAILED' | 'INCONCLUSIVE' | 'SKIPPED';
  startedAt?: string;
  started_at?: string;
  completedAt?: string;
  completed_at?: string;
}

export interface ExecutionEvent {
  id: string;
  taskId: string;
  userId: string;
  stepId?: string;
  type: 'status_change' | 'step_start' | 'step_finish' | 'log' | 'approval_required' | 'verification' | 'error' | 'recovery';
  message: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface Integration {
  id: string;
  userId: string;
  name: string;
  type: IntegrationType;
  isLive: boolean;
  status: 'connected' | 'disconnected' | 'error';
  config?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  taskId: string;
  userId: string;
  title: string;
  description: string;
  actionRequired: string;
  status: ApprovalStatus;
  decisionNote?: string;
  payload?: Record<string, unknown>;
  payloadHash?: string;
  stepId?: string;
  expiresAt?: string;
  createdAt: string;
  decidedAt?: string;
}

export type VerificationStatus = 'PENDING' | 'CHECKING' | 'VERIFIED' | 'FAILED' | 'INCONCLUSIVE';

export interface EvidenceRecord {
  id: string;
  operationId: string; // stepId
  taskId: string;
  userId: string;
  tool: string;
  method: string; // action
  timestamp: string;
  providerReferenceId?: string;
  evidenceSummary: string;
  status: VerificationStatus;
  mode: 'demo' | 'live';
  details?: Record<string, unknown>; // Sanitized, no credentials or private payloads
}

export interface VerificationRecord {
  id: string;
  taskId: string;
  userId: string;
  status: 'verified' | 'failed' | 'unverified' | 'inconclusive' | 'partially_verified';
  proofHash: string;
  checksPerformed: string[];
  signature: string;
  verifiedAt: string;
  trustScore?: number;
}

export interface GeneratedFile {
  id: string;
  taskId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  createdAt: string;
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'approval_required'
  | 'completed'
  | 'failed'
  | 'recovered'
  | 'inconclusive';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Schedule {
  id: string;
  userId: string;
  taskId?: string;
  name?: string;
  instruction?: string;
  cronExpression: string;
  recurrence?: 'once' | 'daily' | 'weekly' | 'custom';
  timezone?: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export type PolicyRuleType =
  | 'rate_limit'
  | 'budget_cap'
  | 'require_approval'
  | 'allowed_connectors'
  | 'external_communication'
  | 'file_retention'
  | 'security';

export interface Policy {
  id: string;
  userId: string;
  name: string;
  ruleType: PolicyRuleType;
  ruleConfig: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface ProofLedgerEntry {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  proofHash: string;
  previousHash: string;
  timestamp: string;
  stepId?: string;
  evidenceId?: string;
  recordData?: Record<string, unknown>;
  tampered?: boolean;
}

export type ChaosFaultType = 'network_timeout' | 'auth_expiry' | 'verification_mismatch' | 'provider_503';

export interface ChaosFault {
  id: string;
  userId: string;
  target?: string; // Substring to match on tool, action, or step id
  faultType: ChaosFaultType;
  remainingOccurrences: number;
  active: boolean;
  createdAt: string;
}

export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'permission'
  | 'rate_limit'
  | 'invalid_input'
  | 'not_found'
  | 'provider_unavailable'
  | 'verification_mismatch'
  | 'unknown';

export type RecoveryStrategy =
  | 'retry_safe'
  | 'check_before_retry'
  | 'approved_alternative_path'
  | 'human_intervention';

// Zod Request Validation Schemas
export const RegisterInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

export const LoginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const CreateTaskInputSchema = z.object({
  title: z.string({ required_error: 'Task title is required' }).min(2, 'Task title must be at least 2 characters'),
  instructions: z.string({ required_error: 'Task instructions are required' }).min(2, 'Task instructions must be at least 2 characters'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  tags: z.array(z.string()).optional(),
  mode: z.enum(['demo', 'live']).optional().default('demo'),
});

export const UpdateTaskInputSchema = z.object({
  title: z.string().min(2).optional(),
  instructions: z.string().optional(),
  status: z
    .enum([
      'pending',
      'planning',
      'executing',
      'verifying',
      'completed',
      'failed',
      'cancelled',
      'AWAITING_APPROVAL',
    ])
    .optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateProfileInputSchema = z.object({
  fullName: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
});

export const ConnectIntegrationInputSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['email', 'slack', 'sheets', 'github', 'stripe', 'webhook']),
  isLive: z.boolean().optional().default(false),
  config: z.record(z.unknown()).optional(),
});

export const ApprovalDecisionInputSchema = z.object({
  note: z.string().optional(),
});

export const CreateReportInputSchema = z.object({
  name: z.string().min(2),
  range: z.enum(['24h', '7d', '30d']),
  type: z.enum(['summary', 'audit', 'performance']),
});

export const CreateScheduleInputSchema = z.object({
  name: z.string().min(2, 'Schedule name must be at least 2 characters'),
  instruction: z.string().min(3, 'Instruction must be at least 3 characters'),
  cronExpression: z.string().min(1, 'Cron expression is required'),
  recurrence: z.enum(['once', 'daily', 'weekly', 'custom']).optional().default('daily'),
  timezone: z.string().optional().default('UTC'),
  isActive: z.boolean().optional().default(true),
  taskId: z.string().uuid().optional(),
});

export const UpdateScheduleInputSchema = z.object({
  name: z.string().min(2).optional(),
  instruction: z.string().min(3).optional(),
  cronExpression: z.string().min(1).optional(),
  recurrence: z.enum(['once', 'daily', 'weekly', 'custom']).optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const CreatePolicyInputSchema = z.object({
  name: z.string().min(2, 'Policy name must be at least 2 characters'),
  ruleType: z.enum([
    'rate_limit',
    'budget_cap',
    'require_approval',
    'allowed_connectors',
    'external_communication',
    'file_retention',
    'security',
  ]),
  ruleConfig: z.record(z.unknown()).default({}),
  isActive: z.boolean().optional().default(true),
});

export const UpdatePolicyInputSchema = z.object({
  name: z.string().min(2).optional(),
  ruleType: z.enum([
    'rate_limit',
    'budget_cap',
    'require_approval',
    'allowed_connectors',
    'external_communication',
    'file_retention',
    'security',
  ]).optional(),
  ruleConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});
