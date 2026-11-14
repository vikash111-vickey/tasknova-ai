import {
  Profile,
  Task,
  TaskStep,
  ExecutionEvent,
  Integration,
  Approval,
  VerificationRecord,
  EvidenceRecord,
  GeneratedFile,
  Notification,
  Schedule,
  Policy,
  ProofLedgerEntry,
  ChaosFault,
} from '../types/models';

export interface Repository {
  // Profiles
  getProfileById(id: string): Promise<Profile | null>;
  getProfileByEmail(email: string): Promise<Profile | null>;
  createProfile(profile: Profile, rawPassword?: string): Promise<Profile>;
  updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null>;

  // Tasks
  getTasks(userId: string): Promise<Task[]>;
  getTaskById(id: string, userId?: string): Promise<Task | null>;
  createTask(task: Task): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>, userId?: string): Promise<Task | null>;
  deleteTask(id: string, userId: string): Promise<boolean>;

  // Task Steps
  getTaskSteps(taskId: string): Promise<TaskStep[]>;
  createTaskStep(step: TaskStep): Promise<TaskStep>;
  updateTaskStep(id: string, updates: Partial<TaskStep>): Promise<TaskStep | null>;

  // Execution Events
  getExecutionEvents(taskId: string, sinceId?: string): Promise<ExecutionEvent[]>;
  createExecutionEvent(event: ExecutionEvent): Promise<ExecutionEvent>;
  getGlobalEvents(userId: string, sinceId?: string): Promise<ExecutionEvent[]>;

  // Integrations
  getIntegrations(userId: string): Promise<Integration[]>;
  getIntegrationById(id: string, userId?: string): Promise<Integration | null>;
  createOrUpdateIntegration(integration: Integration): Promise<Integration>;
  deleteIntegration(id: string, userId: string): Promise<boolean>;

  // Approvals
  getApprovals(userId: string): Promise<Approval[]>;
  getApprovalById(id: string, userId?: string): Promise<Approval | null>;
  createApproval(approval: Approval): Promise<Approval>;
  updateApproval(id: string, updates: Partial<Approval>, userId?: string): Promise<Approval | null>;

  // Verification Records & Evidence
  getVerifications(userId: string): Promise<VerificationRecord[]>;
  getVerificationByTaskId(taskId: string): Promise<VerificationRecord | null>;
  createVerification(record: VerificationRecord): Promise<VerificationRecord>;
  getEvidenceRecords(taskId: string): Promise<EvidenceRecord[]>;
  createEvidenceRecord(evidence: EvidenceRecord): Promise<EvidenceRecord>;

  // Generated Files
  getGeneratedFiles(userId: string): Promise<GeneratedFile[]>;
  getGeneratedFileById(id: string, userId?: string): Promise<GeneratedFile | null>;
  getGeneratedFilesByTaskId(taskId: string): Promise<GeneratedFile[]>;
  createGeneratedFile(file: GeneratedFile): Promise<GeneratedFile>;
  deleteGeneratedFile(id: string, userId: string): Promise<boolean>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: Notification): Promise<Notification>;
  markNotificationAsRead(id: string, userId: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  deleteNotification(id: string, userId: string): Promise<boolean>;

  // Schedules
  getSchedules(userId: string): Promise<Schedule[]>;
  getAllActiveSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: Schedule): Promise<Schedule>;
  updateSchedule(id: string, updates: Partial<Schedule>, userId?: string): Promise<Schedule | null>;
  deleteSchedule(id: string, userId: string): Promise<boolean>;

  // Policies
  getPolicies(userId: string): Promise<Policy[]>;
  createPolicy(policy: Policy): Promise<Policy>;
  updatePolicy(id: string, updates: Partial<Policy>, userId?: string): Promise<Policy | null>;
  deletePolicy(id: string, userId: string): Promise<boolean>;

  // Proof Ledger
  getProofLedger(userId: string): Promise<ProofLedgerEntry[]>;
  getProofLedgerByTaskId(taskId: string): Promise<ProofLedgerEntry[]>;
  recordProof(entry: ProofLedgerEntry): Promise<ProofLedgerEntry>;
  updateProofLedgerEntry(id: string, updates: Partial<ProofLedgerEntry>): Promise<ProofLedgerEntry | null>;

  // Chaos Faults
  getChaosFaults(userId: string): Promise<ChaosFault[]>;
  createChaosFault(fault: ChaosFault): Promise<ChaosFault>;
  updateChaosFault(id: string, updates: Partial<ChaosFault>): Promise<ChaosFault | null>;
  deleteChaosFault(id: string): Promise<boolean>;
  clearChaosFaults(userId: string): Promise<boolean>;

  // User Data & Account Management
  exportUserData(userId: string): Promise<Record<string, unknown>>;
  deleteUserAccount(userId: string): Promise<boolean>;
}
