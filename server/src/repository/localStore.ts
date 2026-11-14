import fs from 'fs';
import path from 'path';
import { Repository } from './interface';
import {
  Profile,
  Task,
  TaskStep,
  ExecutionEvent,
  Integration,
  Approval,
  VerificationRecord,
  GeneratedFile,
  Notification,
  Schedule,
  Policy,
  ProofLedgerEntry,
  EvidenceRecord,
  ChaosFault,
} from '../types/models';

interface StoreData {
  profiles: Profile[];
  tasks: Task[];
  taskSteps: TaskStep[];
  executionEvents: ExecutionEvent[];
  integrations: Integration[];
  approvals: Approval[];
  verifications: VerificationRecord[];
  evidenceRecords: EvidenceRecord[];
  generatedFiles: GeneratedFile[];
  notifications: Notification[];
  schedules: Schedule[];
  policies: Policy[];
  proofLedger: ProofLedgerEntry[];
  chaosFaults: ChaosFault[];
}

const DEFAULT_STORE_DATA: StoreData = {
  profiles: [],
  tasks: [],
  taskSteps: [],
  executionEvents: [],
  integrations: [],
  approvals: [],
  verifications: [],
  evidenceRecords: [],
  generatedFiles: [],
  notifications: [],
  schedules: [],
  policies: [],
  proofLedger: [],
  chaosFaults: [],
};

export class LocalStore implements Repository {
  private filePath: string;
  private data: StoreData;

  constructor(filePath?: string) {
    this.filePath = filePath || path.resolve(__dirname, '../../data/store.json');
    this.data = this.loadData();
  }

  private loadData(): StoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_STORE_DATA,
          ...parsed,
          evidenceRecords: parsed.evidenceRecords || [],
          chaosFaults: parsed.chaosFaults || [],
        };
      }
    } catch (err) {
      console.warn(`[LocalStore] Failed to read store file, initializing defaults:`, err);
    }
    const initial = { ...DEFAULT_STORE_DATA };
    this.atomicSave(initial);
    return initial;
  }

  private atomicSave(data: StoreData): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const rand = Math.random().toString(36).substring(2, 9);
    const tmpPath = `${this.filePath}.${Date.now()}_${rand}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tmpPath, serialized, 'utf-8');
      try {
        fs.renameSync(tmpPath, this.filePath);
      } catch {
        // Fallback for Windows file lock / anti-virus handle collision
        fs.copyFileSync(tmpPath, this.filePath);
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      }
    } catch {
      // Direct write fallback
      fs.writeFileSync(this.filePath, serialized, 'utf-8');
    }
    this.data = data;
  }

  private save(): void {
    this.atomicSave(this.data);
  }

  // --- Profiles ---
  async getProfileById(id: string): Promise<Profile | null> {
    return this.data.profiles.find((p) => p.id === id) || null;
  }

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const normalized = email.toLowerCase().trim();
    return this.data.profiles.find((p) => p.email.toLowerCase() === normalized) || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createProfile(profile: Profile, _rawPassword?: string): Promise<Profile> {
    this.data.profiles.push(profile);
    this.save();
    return profile;
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const idx = this.data.profiles.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.profiles[idx] = {
      ...this.data.profiles[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.profiles[idx];
  }

  // --- Tasks ---
  async getTasks(userId: string): Promise<Task[]> {
    return this.data.tasks.filter((t) => t.userId === userId);
  }

  async getTaskById(id: string, userId?: string): Promise<Task | null> {
    const task = this.data.tasks.find((t) => t.id === id);
    if (!task) return null;
    if (userId && task.userId !== userId) return null; // Enforce user isolation
    return task;
  }

  async createTask(task: Task): Promise<Task> {
    this.data.tasks.push(task);
    this.save();
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>, userId?: string): Promise<Task | null> {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    if (userId && this.data.tasks[idx].userId !== userId) return null; // Enforce user isolation

    this.data.tasks[idx] = {
      ...this.data.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.tasks[idx];
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => !(t.id === id && t.userId === userId));
    if (this.data.tasks.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Task Steps ---
  async getTaskSteps(taskId: string): Promise<TaskStep[]> {
    return this.data.taskSteps
      .filter((s) => s.taskId === taskId)
      .sort((a, b) => a.stepNumber - b.stepNumber);
  }

  async createTaskStep(step: TaskStep): Promise<TaskStep> {
    this.data.taskSteps.push(step);
    this.save();
    return step;
  }

  async updateTaskStep(id: string, updates: Partial<TaskStep>): Promise<TaskStep | null> {
    let idx = -1;
    if (updates.taskId) {
      idx = this.data.taskSteps.findIndex((s) => s.id === id && s.taskId === updates.taskId);
    }
    if (idx === -1) {
      idx = this.data.taskSteps.findIndex((s) => s.id === id);
    }
    if (idx === -1) return null;
    this.data.taskSteps[idx] = { ...this.data.taskSteps[idx], ...updates };
    this.save();
    return this.data.taskSteps[idx];
  }

  // --- Execution Events ---
  async getExecutionEvents(taskId: string, sinceId?: string): Promise<ExecutionEvent[]> {
    const events = this.data.executionEvents.filter((e) => e.taskId === taskId);
    if (!sinceId) return events;
    const sinceIdx = events.findIndex((e) => e.id === sinceId);
    if (sinceIdx === -1) return events;
    return events.slice(sinceIdx + 1);
  }

  async createExecutionEvent(event: ExecutionEvent): Promise<ExecutionEvent> {
    this.data.executionEvents.push(event);
    this.save();
    return event;
  }

  async getGlobalEvents(userId: string, sinceId?: string): Promise<ExecutionEvent[]> {
    const events = this.data.executionEvents.filter((e) => e.userId === userId);
    if (!sinceId) return events;
    const sinceIdx = events.findIndex((e) => e.id === sinceId);
    if (sinceIdx === -1) return events;
    return events.slice(sinceIdx + 1);
  }

  // --- Integrations ---
  async getIntegrations(userId: string): Promise<Integration[]> {
    return this.data.integrations.filter((i) => i.userId === userId);
  }

  async getIntegrationById(id: string, userId?: string): Promise<Integration | null> {
    const item = this.data.integrations.find((i) => i.id === id);
    if (!item) return null;
    if (userId && item.userId !== userId) return null;
    return item;
  }

  async createOrUpdateIntegration(integration: Integration): Promise<Integration> {
    const idx = this.data.integrations.findIndex(
      (i) => i.id === integration.id || (i.name === integration.name && i.userId === integration.userId)
    );
    if (idx >= 0) {
      this.data.integrations[idx] = {
        ...this.data.integrations[idx],
        ...integration,
        updatedAt: new Date().toISOString(),
      };
    } else {
      this.data.integrations.push(integration);
    }
    this.save();
    return integration;
  }

  async deleteIntegration(id: string, userId: string): Promise<boolean> {
    const initialLen = this.data.integrations.length;
    this.data.integrations = this.data.integrations.filter((i) => !(i.id === id && i.userId === userId));
    if (this.data.integrations.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Approvals ---
  async getApprovals(userId: string): Promise<Approval[]> {
    if (!userId || userId === 'system') {
      return this.data.approvals;
    }
    return this.data.approvals.filter((a) => a.userId === userId);
  }

  async getApprovalById(id: string, userId?: string): Promise<Approval | null> {
    const app = this.data.approvals.find((a) => a.id === id);
    if (!app) return null;
    if (userId && app.userId !== userId) return null;
    return app;
  }

  async createApproval(approval: Approval): Promise<Approval> {
    this.data.approvals.push(approval);
    this.save();
    return approval;
  }

  async updateApproval(id: string, updates: Partial<Approval>, userId?: string): Promise<Approval | null> {
    const idx = this.data.approvals.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    if (userId && this.data.approvals[idx].userId !== userId) return null;

    this.data.approvals[idx] = { ...this.data.approvals[idx], ...updates };
    this.save();
    return this.data.approvals[idx];
  }

  // --- Verification Records ---
  async getVerifications(userId: string): Promise<VerificationRecord[]> {
    return this.data.verifications.filter((v) => v.userId === userId);
  }

  async getVerificationByTaskId(taskId: string): Promise<VerificationRecord | null> {
    return this.data.verifications.find((v) => v.taskId === taskId) || null;
  }

  async createVerification(record: VerificationRecord): Promise<VerificationRecord> {
    this.data.verifications.push(record);
    this.save();
    return record;
  }

  // --- Evidence Records ---
  async getEvidenceRecords(taskId: string): Promise<EvidenceRecord[]> {
    return this.data.evidenceRecords.filter((e) => e.taskId === taskId);
  }

  async createEvidenceRecord(evidence: EvidenceRecord): Promise<EvidenceRecord> {
    this.data.evidenceRecords.push(evidence);
    this.save();
    return evidence;
  }

  // --- Generated Files ---
  async getGeneratedFiles(userId: string): Promise<GeneratedFile[]> {
    return this.data.generatedFiles.filter((f) => f.userId === userId);
  }

  async getGeneratedFileById(id: string, userId?: string): Promise<GeneratedFile | null> {
    const file = this.data.generatedFiles.find((f) => f.id === id);
    if (!file) return null;
    if (userId && file.userId !== userId) return null;
    return file;
  }

  async getGeneratedFilesByTaskId(taskId: string): Promise<GeneratedFile[]> {
    return this.data.generatedFiles.filter((f) => f.taskId === taskId);
  }

  async createGeneratedFile(file: GeneratedFile): Promise<GeneratedFile> {
    this.data.generatedFiles.push(file);
    this.save();
    return file;
  }

  async deleteGeneratedFile(id: string, userId: string): Promise<boolean> {
    const initLen = this.data.generatedFiles.length;
    this.data.generatedFiles = this.data.generatedFiles.filter((f) => !(f.id === id && f.userId === userId));
    if (this.data.generatedFiles.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Notifications ---
  async getNotifications(userId: string): Promise<Notification[]> {
    return this.data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.data.notifications.filter((n) => n.userId === userId && !n.read).length;
  }

  async createNotification(notification: Notification): Promise<Notification> {
    this.data.notifications.push(notification);
    this.save();
    return notification;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    const item = this.data.notifications.find((n) => n.id === id && n.userId === userId);
    if (item) {
      item.read = true;
      this.save();
      return true;
    }
    return false;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    let changed = false;
    for (const item of this.data.notifications) {
      if (item.userId === userId && !item.read) {
        item.read = true;
        changed = true;
      }
    }
    if (changed) {
      this.save();
    }
    return true;
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const initLen = this.data.notifications.length;
    this.data.notifications = this.data.notifications.filter((n) => !(n.id === id && n.userId === userId));
    if (this.data.notifications.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Schedules ---
  async getSchedules(userId: string): Promise<Schedule[]> {
    return this.data.schedules.filter((s) => s.userId === userId);
  }

  async getAllActiveSchedules(): Promise<Schedule[]> {
    return this.data.schedules.filter((s) => s.isActive);
  }

  async createSchedule(schedule: Schedule): Promise<Schedule> {
    this.data.schedules.push(schedule);
    this.save();
    return schedule;
  }

  async updateSchedule(id: string, updates: Partial<Schedule>, userId?: string): Promise<Schedule | null> {
    const idx = this.data.schedules.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    if (userId && this.data.schedules[idx].userId !== userId) return null;

    this.data.schedules[idx] = { ...this.data.schedules[idx], ...updates };
    this.save();
    return this.data.schedules[idx];
  }

  async deleteSchedule(id: string, userId: string): Promise<boolean> {
    const initLen = this.data.schedules.length;
    this.data.schedules = this.data.schedules.filter((s) => !(s.id === id && s.userId === userId));
    if (this.data.schedules.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Policies ---
  async getPolicies(userId: string): Promise<Policy[]> {
    return this.data.policies.filter((p) => p.userId === userId);
  }

  async createPolicy(policy: Policy): Promise<Policy> {
    this.data.policies.push(policy);
    this.save();
    return policy;
  }

  async updatePolicy(id: string, updates: Partial<Policy>, userId?: string): Promise<Policy | null> {
    const idx = this.data.policies.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    if (userId && this.data.policies[idx].userId !== userId) return null;

    this.data.policies[idx] = { ...this.data.policies[idx], ...updates };
    this.save();
    return this.data.policies[idx];
  }

  async deletePolicy(id: string, userId: string): Promise<boolean> {
    const initLen = this.data.policies.length;
    this.data.policies = this.data.policies.filter((p) => !(p.id === id && p.userId === userId));
    if (this.data.policies.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Proof Ledger ---
  async getProofLedger(userId: string): Promise<ProofLedgerEntry[]> {
    return this.data.proofLedger.filter((e) => e.userId === userId);
  }

  async getProofLedgerByTaskId(taskId: string): Promise<ProofLedgerEntry[]> {
    return this.data.proofLedger.filter((e) => e.taskId === taskId);
  }

  async recordProof(entry: ProofLedgerEntry): Promise<ProofLedgerEntry> {
    this.data.proofLedger.push(entry);
    this.save();
    return entry;
  }

  async updateProofLedgerEntry(id: string, updates: Partial<ProofLedgerEntry>): Promise<ProofLedgerEntry | null> {
    const idx = this.data.proofLedger.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.data.proofLedger[idx] = { ...this.data.proofLedger[idx], ...updates };
    this.save();
    return this.data.proofLedger[idx];
  }

  // --- Chaos Faults ---
  async getChaosFaults(userId: string): Promise<ChaosFault[]> {
    return this.data.chaosFaults.filter((f) => f.userId === userId);
  }

  async createChaosFault(fault: ChaosFault): Promise<ChaosFault> {
    this.data.chaosFaults.push(fault);
    this.save();
    return fault;
  }

  async updateChaosFault(id: string, updates: Partial<ChaosFault>): Promise<ChaosFault | null> {
    const idx = this.data.chaosFaults.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.data.chaosFaults[idx] = { ...this.data.chaosFaults[idx], ...updates };
    this.save();
    return this.data.chaosFaults[idx];
  }

  async deleteChaosFault(id: string): Promise<boolean> {
    const initLen = this.data.chaosFaults.length;
    this.data.chaosFaults = this.data.chaosFaults.filter((f) => f.id !== id);
    if (this.data.chaosFaults.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }

  async clearChaosFaults(userId: string): Promise<boolean> {
    const initLen = this.data.chaosFaults.length;
    this.data.chaosFaults = this.data.chaosFaults.filter((f) => f.userId !== userId);
    if (this.data.chaosFaults.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- User Data & Account Management ---
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const profile = this.data.profiles.find((p) => p.id === userId);
    const tasks = this.data.tasks.filter((t) => t.userId === userId);
    const taskIds = new Set(tasks.map((t) => t.id));
    const steps = this.data.taskSteps.filter((s) => taskIds.has(s.taskId));
    const events = this.data.executionEvents.filter((e) => e.userId === userId);
    const approvals = this.data.approvals.filter((a) => a.userId === userId);
    const verifications = this.data.verifications.filter((v) => v.userId === userId);
    const evidence = this.data.evidenceRecords.filter((e) => e.userId === userId);
    const files = this.data.generatedFiles.filter((f) => f.userId === userId);
    const notifications = this.data.notifications.filter((n) => n.userId === userId);
    const schedules = this.data.schedules.filter((s) => s.userId === userId);
    const policies = this.data.policies.filter((p) => p.userId === userId);
    const proofLedger = this.data.proofLedger.filter((pl) => pl.userId === userId);

    // Redact password hash from profile
    const safeProfile = profile ? { ...profile, passwordHash: undefined } : null;

    return {
      exportedAt: new Date().toISOString(),
      profile: safeProfile,
      tasks,
      steps,
      events,
      approvals,
      verifications,
      evidence,
      files,
      notifications,
      schedules,
      policies,
      proofLedger,
    };
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    const userTasks = this.data.tasks.filter((t) => t.userId === userId);
    const taskIds = new Set(userTasks.map((t) => t.id));

    this.data.profiles = this.data.profiles.filter((p) => p.id !== userId);
    this.data.tasks = this.data.tasks.filter((t) => t.userId !== userId);
    this.data.taskSteps = this.data.taskSteps.filter((s) => !taskIds.has(s.taskId));
    this.data.executionEvents = this.data.executionEvents.filter((e) => e.userId !== userId);
    this.data.integrations = this.data.integrations.filter((i) => i.userId !== userId);
    this.data.approvals = this.data.approvals.filter((a) => a.userId !== userId);
    this.data.verifications = this.data.verifications.filter((v) => v.userId !== userId);
    this.data.evidenceRecords = this.data.evidenceRecords.filter((e) => e.userId !== userId);
    this.data.generatedFiles = this.data.generatedFiles.filter((f) => f.userId !== userId);
    this.data.notifications = this.data.notifications.filter((n) => n.userId !== userId);
    this.data.schedules = this.data.schedules.filter((s) => s.userId !== userId);
    this.data.policies = this.data.policies.filter((p) => p.userId !== userId);
    this.data.proofLedger = this.data.proofLedger.filter((pl) => pl.userId !== userId);
    this.data.chaosFaults = this.data.chaosFaults.filter((f) => f.userId !== userId);

    this.save();
    return true;
  }
}
