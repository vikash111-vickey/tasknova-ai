import { z } from 'zod';

export const HealthDataSchema = z.object({
  status: z.literal('ok'),
  mode: z.enum(['demo', 'live']),
  ai: z.enum(['gemini', 'template', 'openai']),
});

export type HealthData = z.infer<typeof HealthDataSchema>;

export const HealthApiResponseSchema = z.object({
  success: z.boolean(),
  data: HealthDataSchema,
  message: z.string(),
});

export type HealthApiResponse = z.infer<typeof HealthApiResponseSchema>;

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

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type VerificationStatus =
  | 'PENDING'
  | 'CHECKING'
  | 'VERIFIED'
  | 'FAILED'
  | 'INCONCLUSIVE';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  instructions: string;
  status: TaskStatus;
  mode: 'demo' | 'live';
  priority?: string;
  tags?: string[];
  plan?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  trustScore?: number;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStep {
  id: string;
  taskId: string;
  stepNumber?: number;
  name: string;
  tool: string;
  action: string;
  status: StepStatus;
  input: Record<string, unknown>;
  dependencies: string[];
  depends_on?: string[];
  requires_approval: boolean;
  risk_level: 'low' | 'medium' | 'high';
  startedAt?: string;
  completedAt?: string;
  verification_status?: VerificationStatus;
  output_ref?: Record<string, unknown>;
  retry_count?: number;
  error?: string;
  expected_output?: string;
  verification_method?: string;
  reason?: string;
}

export interface ExecutionEvent {
  id: string;
  taskId: string;
  userId: string;
  stepId?: string;
  type:
    | 'status_change'
    | 'step_start'
    | 'step_complete'
    | 'step_fail'
    | 'approval_required'
    | 'verification'
    | 'recovery'
    | 'log';
  message: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface ProofLedgerEntry {
  id: string;
  taskId: string;
  stepId?: string;
  evidenceId?: string;
  sequenceNumber: number;
  previousHash: string;
  recordHash: string;
  recordData: Record<string, unknown>;
  tampered?: boolean;
  createdAt: string;
}

export interface EvidenceRecord {
  id: string;
  taskId: string;
  stepId: string;
  tool: string;
  action: string;
  status: VerificationStatus;
  checkedAt: string;
  evidence: Record<string, unknown> | null;
  expected: Record<string, unknown> | null;
  actual: Record<string, unknown> | null;
  hash: string;
  summary: string;
  mode: 'demo' | 'live';
}

export interface Approval {
  id: string;
  taskId: string;
  stepId: string;
  title: string;
  description: string;
  actionRequired: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  payload?: Record<string, unknown>;
  payloadHash?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface GeneratedFile {
  id: string;
  taskId: string;
  stepId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath?: string;
  checksum?: string;
  createdAt: string;
}

export interface ChaosFault {
  id: string;
  userId: string;
  faultType: 'network_timeout' | 'auth_expiry' | 'verification_mismatch' | 'provider_503';
  target?: string;
  occurrences: number;
  createdAt: string;
}

export interface Integration {
  id: string;
  userId: string;
  name: string;
  type: string;
  isLive: boolean;
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'approval_required' | 'completed' | 'failed';
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

export interface Policy {
  id: string;
  userId: string;
  name: string;
  ruleType: string;
  ruleConfig: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface IntegrationCatalogItem {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  mode: 'demo' | 'live';
  status: 'connected' | 'disconnected' | 'error';
  isDemoConnected: boolean;
  isLiveConfigured: boolean;
  actions: string[];
  supportedInDemo: boolean;
  liveCredentialsRequired: string[];
  lastSync?: string;
}

export interface AnalyticsTrendItem {
  date: string;
  completed: number;
  failed: number;
  total: number;
}

export interface AnalyticsDurationItem {
  bracket: string;
  count: number;
}

export interface AnalyticsStatusItem {
  name: string;
  value: number;
  color?: string;
}

export interface AnalyticsToolItem {
  tool: string;
  count: number;
}

export interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  awaitingApprovalTasks?: number;
  successRate: number;
  verificationSuccessRate?: number;
  autoRecoveredCount?: number;
  totalVerifications: number;
  recentTasks: Task[];
  timeSavedMinutes?: number;
  averageTrustScore?: number;
  avgDurationSeconds?: number;
  executionTrends?: AnalyticsTrendItem[];
  durationDistribution?: AnalyticsDurationItem[];
  statusBreakdown?: AnalyticsStatusItem[];
  toolUsage?: AnalyticsToolItem[];
}

export interface WorkflowTemplate {
  id: string;
  title: string;
  description: string;
  tags: string[];
  initialInstruction: string;
  nodes: any[];
  edges: any[];
}
