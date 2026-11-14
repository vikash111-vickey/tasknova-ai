import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

/**
 * Converts camelCase object keys to PostgreSQL snake_case column names.
 * Does not recurse into nested JSON structures like plan, payload, etc.
 */
function toDbRow(data: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    row[snakeKey] = val;
  }
  return row;
}

/**
 * Converts PostgreSQL snake_case row to TypeScript camelCase object,
 * preserving original snake_case keys as aliases for zero-failure resilience.
 */
function fromDbRow<T = Record<string, unknown>>(data: Record<string, unknown> | null): T | null {
  if (!data) return null;
  const obj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, p1) => p1.toUpperCase());
    obj[camelKey] = val;
    obj[key] = val;
  }
  return obj as T;
}

function fromDbRows<T = Record<string, unknown>>(rows: Record<string, unknown>[] | null): T[] {
  if (!rows) return [];
  return rows.map((r) => fromDbRow<T>(r)!) as T[];
}

/**
 * Resiliently inserts a row into Supabase. If the remote schema is missing a column
 * (e.g. "Could not find the 'xyz' column of 'table' in the schema cache"), this helper
 * logs a warning, preserves the data in input metadata if applicable, strips the column,
 * and retries automatically so user requests NEVER fail.
 */
async function resilientInsert(
  client: SupabaseClient,
  table: string,
  initialRow: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const row = { ...initialRow };
  let attempts = 0;
  const maxAttempts = 8;

  while (attempts < maxAttempts) {
    attempts++;
    const { data, error } = await client.from(table).insert(row).select().single();
    if (!error && data) {
      return data;
    }

    if (error) {
      const colMatch = error.message.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        const missingCol = colMatch[1];
        console.warn(`[SupabaseStore] Column '${missingCol}' missing on table '${table}'. Sanitizing and retrying...`);
        if (table === 'task_steps' && row.input && typeof row.input === 'object') {
          (row.input as Record<string, unknown>)[missingCol] = row[missingCol];
        }
        delete row[missingCol];
        continue;
      }

      throw new Error(`Supabase ${table} insert error: ${error.message}`);
    }
  }

  throw new Error(`Supabase insert into ${table} failed after ${maxAttempts} attempts`);
}

async function resilientUpdate(
  client: SupabaseClient,
  table: string,
  id: string,
  initialRow: Record<string, unknown>,
  userId?: string
): Promise<Record<string, unknown> | null> {
  const row = { ...initialRow };
  let attempts = 0;
  const maxAttempts = 8;

  while (attempts < maxAttempts) {
    attempts++;
    let query = client.from(table).update(row).eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.select().maybeSingle();

    if (!error) {
      return data;
    }

    const colMatch = error.message.match(/Could not find the '([^']+)' column/i);
    if (colMatch && colMatch[1]) {
      const missingCol = colMatch[1];
      console.warn(`[SupabaseStore] Column '${missingCol}' missing on table '${table}'. Sanitizing update and retrying...`);
      delete row[missingCol];
      continue;
    }

    throw new Error(`Supabase ${table} update error: ${error.message}`);
  }

  return null;
}

export class SupabaseStore implements Repository {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  // --- Profiles ---
  async getProfileById(id: string): Promise<Profile | null> {
    const { data, error } = await this.client.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return fromDbRow<Profile>(data);
  }

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await this.client.from('profiles').select('*').ilike('email', email).maybeSingle();
    if (error || !data) return null;
    return fromDbRow<Profile>(data);
  }

  async createProfile(profile: Profile, rawPassword?: string): Promise<Profile> {
    // Optionally mirror user in Supabase Auth (auth.users) if service role credentials allow
    if (rawPassword) {
      try {
        await this.client.auth.admin.createUser({
          id: profile.id,
          email: profile.email,
          password: rawPassword,
          email_confirm: true,
          user_metadata: { full_name: profile.fullName },
        });
      } catch (authErr) {
        // If user already exists in auth.users or admin auth is restricted, continue safely
      }
    }

    const dbRow = toDbRow(profile as unknown as Record<string, unknown>);
    const { data, error } = await this.client.from('profiles').insert(dbRow).select().single();
    if (error) throw new Error(`Supabase createProfile error: ${error.message}`);
    return fromDbRow<Profile>(data)!;
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const dbRow = toDbRow(updates as unknown as Record<string, unknown>);
    dbRow.updated_at = new Date().toISOString();
    const { data, error } = await this.client
      .from('profiles')
      .update(dbRow)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error || !data) return null;
    return fromDbRow<Profile>(data);
  }

  // --- Tasks ---
  async getTasks(userId: string): Promise<Task[]> {
    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return fromDbRows<Task>(data);
  }

  async getTaskById(id: string, userId?: string): Promise<Task | null> {
    let query = this.client.from('tasks').select('*').eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return fromDbRow<Task>(data);
  }

  async createTask(task: Task): Promise<Task> {
    const dbRow = toDbRow(task as unknown as Record<string, unknown>);
    const data = await resilientInsert(this.client, 'tasks', dbRow);
    return fromDbRow<Task>(data)!;
  }

  async updateTask(id: string, updates: Partial<Task>, userId?: string): Promise<Task | null> {
    const dbRow = toDbRow(updates as unknown as Record<string, unknown>);
    dbRow.updated_at = new Date().toISOString();
    const data = await resilientUpdate(this.client, 'tasks', id, dbRow, userId);
    return fromDbRow<Task>(data);
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client.from('tasks').delete().eq('id', id).eq('user_id', userId);
    return !error;
  }

  // --- Task Steps ---
  async getTaskSteps(taskId: string): Promise<TaskStep[]> {
    const { data, error } = await this.client
      .from('task_steps')
      .select('*')
      .eq('task_id', taskId)
      .order('step_number', { ascending: true });
    if (error || !data) return [];
    return fromDbRows<TaskStep>(data).map((step) => {
      // If dependencies were saved inside input JSON due to schema mismatch, restore
      if (!step.dependencies && step.input && typeof step.input === 'object' && (step.input as any).dependencies) {
        step.dependencies = (step.input as any).dependencies;
      }
      return step;
    });
  }

  async createTaskStep(step: TaskStep): Promise<TaskStep> {
    const dbRow = toDbRow(step as unknown as Record<string, unknown>);
    const data = await resilientInsert(this.client, 'task_steps', dbRow);
    return fromDbRow<TaskStep>(data)!;
  }

  async updateTaskStep(id: string, updates: Partial<TaskStep>): Promise<TaskStep | null> {
    const dbRow = toDbRow(updates as unknown as Record<string, unknown>);
    const data = await resilientUpdate(this.client, 'task_steps', id, dbRow);
    return fromDbRow<TaskStep>(data);
  }

  // --- Execution Events ---
  async getExecutionEvents(taskId: string, sinceId?: string): Promise<ExecutionEvent[]> {
    let query = this.client
      .from('execution_events')
      .select('*')
      .eq('task_id', taskId)
      .order('timestamp', { ascending: true });
    if (sinceId) query = query.gt('id', sinceId);
    const { data, error } = await query;
    if (error || !data) return [];
    return fromDbRows<ExecutionEvent>(data);
  }

  async createExecutionEvent(event: ExecutionEvent): Promise<ExecutionEvent> {
    const dbRow = toDbRow(event as unknown as Record<string, unknown>);
    const data = await resilientInsert(this.client, 'execution_events', dbRow);
    return fromDbRow<ExecutionEvent>(data)!;
  }

  async getGlobalEvents(userId: string, sinceId?: string): Promise<ExecutionEvent[]> {
    let query = this.client
      .from('execution_events')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });
    if (sinceId) query = query.gt('id', sinceId);
    const { data, error } = await query;
    if (error || !data) return [];
    return fromDbRows<ExecutionEvent>(data);
  }

  // --- Integrations ---
  async getIntegrations(userId: string): Promise<Integration[]> {
    const { data, error } = await this.client.from('integrations').select('*').eq('user_id', userId);
    if (error || !data) return [];
    return fromDbRows<Integration>(data);
  }

  async getIntegrationById(id: string, userId?: string): Promise<Integration | null> {
    let query = this.client.from('integrations').select('*').eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return fromDbRow<Integration>(data);
  }

  async createOrUpdateIntegration(integration: Integration): Promise<Integration> {
    const dbRow = toDbRow(integration as unknown as Record<string, unknown>);
    dbRow.updated_at = new Date().toISOString();
    const { data, error } = await this.client
      .from('integrations')
      .upsert(dbRow, { onConflict: 'user_id,name' })
      .select()
      .single();
    if (error) throw new Error(`Supabase createOrUpdateIntegration error: ${error.message}`);
    return fromDbRow<Integration>(data)!;
  }

  async deleteIntegration(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client.from('integrations').delete().eq('id', id).eq('user_id', userId);
    return !error;
  }

  // --- Approvals ---
  async getApprovals(userId: string): Promise<Approval[]> {
    const { data, error } = await this.client
      .from('approvals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return fromDbRows<Approval>(data);
  }

  async getApprovalById(id: string, userId?: string): Promise<Approval | null> {
    let query = this.client.from('approvals').select('*').eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return fromDbRow<Approval>(data);
  }

  async createApproval(approval: Approval): Promise<Approval> {
    const dbRow = toDbRow(approval as unknown as Record<string, unknown>);
    const data = await resilientInsert(this.client, 'approvals', dbRow);
    return fromDbRow<Approval>(data)!;
  }

  async updateApproval(id: string, updates: Partial<Approval>, userId?: string): Promise<Approval | null> {
    const dbRow = toDbRow(updates as unknown as Record<string, unknown>);
    let query = this.client.from('approvals').update(dbRow).eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.select().maybeSingle();
    if (error || !data) return null;
    return fromDbRow<Approval>(data);
  }

  // --- Verification Records ---
  async getVerifications(userId: string): Promise<VerificationRecord[]> {
    const { data, error } = await this.client.from('verification_records').select('*').eq('user_id', userId);
    if (error || !data) return [];
    return fromDbRows<VerificationRecord>(data);
  }

  async getVerificationByTaskId(taskId: string): Promise<VerificationRecord | null> {
    const { data, error } = await this.client.from('verification_records').select('*').eq('task_id', taskId).maybeSingle();
    if (error || !data) return null;
    return fromDbRow<VerificationRecord>(data);
  }

  async createVerification(record: VerificationRecord): Promise<VerificationRecord> {
    const dbRow = toDbRow(record as unknown as Record<string, unknown>);
    const data = await resilientInsert(this.client, 'verification_records', dbRow);
    return fromDbRow<VerificationRecord>(data)!;
  }

  // --- Evidence Records ---
  async getEvidenceRecords(taskId: string): Promise<EvidenceRecord[]> {
    const { data, error } = await this.client.from('evidence_records').select('*').eq('task_id', taskId);
    if (error || !data) return [];
    return fromDbRows<EvidenceRecord>(data);
  }

  async createEvidenceRecord(evidence: EvidenceRecord): Promise<EvidenceRecord> {
    const dbRow = toDbRow(evidence as unknown as Record<string, unknown>);
    const data = await resilientInsert(this.client, 'evidence_records', dbRow);
    return fromDbRow<EvidenceRecord>(data)!;
  }

  // --- Generated Files ---
  async getGeneratedFiles(userId: string): Promise<GeneratedFile[]> {
    const { data, error } = await this.client.from('generated_files').select('*').eq('user_id', userId);
    if (error || !data) return [];
    return fromDbRows<GeneratedFile>(data);
  }

  async getGeneratedFileById(id: string, userId?: string): Promise<GeneratedFile | null> {
    let query = this.client.from('generated_files').select('*').eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return fromDbRow<GeneratedFile>(data);
  }

  async getGeneratedFilesByTaskId(taskId: string): Promise<GeneratedFile[]> {
    const { data, error } = await this.client.from('generated_files').select('*').eq('task_id', taskId);
    if (error || !data) return [];
    return fromDbRows<GeneratedFile>(data);
  }

  async createGeneratedFile(file: GeneratedFile): Promise<GeneratedFile> {
    const dbRow = toDbRow(file as unknown as Record<string, unknown>);
    const { data, error } = await this.client.from('generated_files').insert(dbRow).select().single();
    if (error) throw new Error(`Supabase createGeneratedFile error: ${error.message}`);
    return fromDbRow<GeneratedFile>(data)!;
  }

  async deleteGeneratedFile(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client.from('generated_files').delete().eq('id', id).eq('user_id', userId);
    return !error;
  }

  // --- Notifications ---
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return fromDbRows<Notification>(data);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const { count, error } = await this.client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) return 0;
    return count || 0;
  }

  async createNotification(notification: Notification): Promise<Notification> {
    const dbRow = toDbRow(notification as unknown as Record<string, unknown>);
    const { data, error } = await this.client.from('notifications').insert(dbRow).select().single();
    if (error) throw new Error(`Supabase createNotification error: ${error.message}`);
    return fromDbRow<Notification>(data)!;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId);
    return !error;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    return !error;
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client.from('notifications').delete().eq('id', id).eq('user_id', userId);
    return !error;
  }

  // --- Schedules ---
  async getSchedules(userId: string): Promise<Schedule[]> {
    const { data, error } = await this.client.from('schedules').select('*').eq('user_id', userId);
    if (error || !data) return [];
    return fromDbRows<Schedule>(data);
  }

  async getAllActiveSchedules(): Promise<Schedule[]> {
    const { data, error } = await this.client.from('schedules').select('*').eq('is_active', true);
    if (error || !data) return [];
    return fromDbRows<Schedule>(data);
  }

  async createSchedule(schedule: Schedule): Promise<Schedule> {
    const dbRow = toDbRow(schedule as unknown as Record<string, unknown>);
    const { data, error } = await this.client.from('schedules').insert(dbRow).select().single();
    if (error) throw new Error(`Supabase createSchedule error: ${error.message}`);
    return fromDbRow<Schedule>(data)!;
  }

  async updateSchedule(id: string, updates: Partial<Schedule>, userId?: string): Promise<Schedule | null> {
    const dbRow = toDbRow(updates as unknown as Record<string, unknown>);
    let query = this.client.from('schedules').update(dbRow).eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.select().maybeSingle();
    if (error || !data) return null;
    return fromDbRow<Schedule>(data);
  }

  async deleteSchedule(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client.from('schedules').delete().eq('id', id).eq('user_id', userId);
    return !error;
  }

  // --- Policies ---
  async getPolicies(userId: string): Promise<Policy[]> {
    const { data, error } = await this.client.from('policies').select('*').eq('user_id', userId);
    if (error || !data) return [];
    return fromDbRows<Policy>(data);
  }

  async createPolicy(policy: Policy): Promise<Policy> {
    const dbRow = toDbRow(policy as unknown as Record<string, unknown>);
    const { data, error } = await this.client.from('policies').insert(dbRow).select().single();
    if (error) throw new Error(`Supabase createPolicy error: ${error.message}`);
    return fromDbRow<Policy>(data)!;
  }

  async updatePolicy(id: string, updates: Partial<Policy>, userId?: string): Promise<Policy | null> {
    const dbRow = toDbRow(updates as unknown as Record<string, unknown>);
    let query = this.client.from('policies').update(dbRow).eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.select().maybeSingle();
    if (error || !data) return null;
    return fromDbRow<Policy>(data);
  }

  async deletePolicy(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client.from('policies').delete().eq('id', id).eq('user_id', userId);
    return !error;
  }

  // --- Proof Ledger ---
  async getProofLedger(userId: string): Promise<ProofLedgerEntry[]> {
    const { data, error } = await this.client.from('proof_ledger').select('*').eq('user_id', userId);
    if (error || !data) return [];
    return fromDbRows<ProofLedgerEntry>(data);
  }

  async getProofLedgerByTaskId(taskId: string): Promise<ProofLedgerEntry[]> {
    const { data, error } = await this.client.from('proof_ledger').select('*').eq('task_id', taskId);
    if (error || !data) return [];
    return fromDbRows<ProofLedgerEntry>(data);
  }

  async recordProof(entry: ProofLedgerEntry): Promise<ProofLedgerEntry> {
    const dbRow = toDbRow(entry as unknown as Record<string, unknown>);
    const data = await resilientInsert(this.client, 'proof_ledger', dbRow);
    return fromDbRow<ProofLedgerEntry>(data)!;
  }

  async updateProofLedgerEntry(id: string, updates: Partial<ProofLedgerEntry>): Promise<ProofLedgerEntry | null> {
    const dbRow = toDbRow(updates as unknown as Record<string, unknown>);
    const { data, error } = await this.client.from('proof_ledger').update(dbRow).eq('id', id).select().maybeSingle();
    if (error || !data) return null;
    return fromDbRow<ProofLedgerEntry>(data);
  }

  // --- Chaos Faults ---
  async getChaosFaults(userId: string): Promise<ChaosFault[]> {
    const { data, error } = await this.client.from('chaos_faults').select('*').eq('user_id', userId);
    if (error || !data) return [];
    return fromDbRows<ChaosFault>(data);
  }

  async createChaosFault(fault: ChaosFault): Promise<ChaosFault> {
    const dbRow = toDbRow(fault as unknown as Record<string, unknown>);
    const { data, error } = await this.client.from('chaos_faults').insert(dbRow).select().single();
    if (error) throw new Error(`Supabase createChaosFault error: ${error.message}`);
    return fromDbRow<ChaosFault>(data)!;
  }

  async updateChaosFault(id: string, updates: Partial<ChaosFault>): Promise<ChaosFault | null> {
    const dbRow = toDbRow(updates as unknown as Record<string, unknown>);
    const { data, error } = await this.client.from('chaos_faults').update(dbRow).eq('id', id).select().maybeSingle();
    if (error || !data) return null;
    return fromDbRow<ChaosFault>(data);
  }

  async deleteChaosFault(id: string): Promise<boolean> {
    const { error } = await this.client.from('chaos_faults').delete().eq('id', id);
    return !error;
  }

  async clearChaosFaults(userId: string): Promise<boolean> {
    const { error } = await this.client.from('chaos_faults').delete().eq('user_id', userId);
    return !error;
  }

  // --- User Data & Account Management ---
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const { data: profile } = await this.client.from('profiles').select('*').eq('id', userId).maybeSingle();
    const { data: tasks } = await this.client.from('tasks').select('*').eq('user_id', userId);
    const { data: events } = await this.client.from('execution_events').select('*').eq('user_id', userId);
    const { data: approvals } = await this.client.from('approvals').select('*').eq('user_id', userId);
    const { data: verifications } = await this.client.from('verification_records').select('*').eq('user_id', userId);
    const { data: evidence } = await this.client.from('evidence_records').select('*').eq('user_id', userId);
    const { data: files } = await this.client.from('generated_files').select('*').eq('user_id', userId);
    const { data: notifications } = await this.client.from('notifications').select('*').eq('user_id', userId);
    const { data: schedules } = await this.client.from('schedules').select('*').eq('user_id', userId);
    const { data: policies } = await this.client.from('policies').select('*').eq('user_id', userId);
    const { data: proofLedger } = await this.client.from('proof_ledger').select('*').eq('user_id', userId);

    const safeProfile = profile ? { ...fromDbRow(profile), password_hash: undefined, passwordHash: undefined } : null;

    return {
      exportedAt: new Date().toISOString(),
      profile: safeProfile,
      tasks: fromDbRows(tasks),
      events: fromDbRows(events),
      approvals: fromDbRows(approvals),
      verifications: fromDbRows(verifications),
      evidence: fromDbRows(evidence),
      files: fromDbRows(files),
      notifications: fromDbRows(notifications),
      schedules: fromDbRows(schedules),
      policies: fromDbRows(policies),
      proofLedger: fromDbRows(proofLedger),
    };
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    await this.client.from('notifications').delete().eq('user_id', userId);
    await this.client.from('schedules').delete().eq('user_id', userId);
    await this.client.from('policies').delete().eq('user_id', userId);
    await this.client.from('proof_ledger').delete().eq('user_id', userId);
    await this.client.from('chaos_faults').delete().eq('user_id', userId);
    await this.client.from('generated_files').delete().eq('user_id', userId);
    await this.client.from('evidence_records').delete().eq('user_id', userId);
    await this.client.from('verification_records').delete().eq('user_id', userId);
    await this.client.from('approvals').delete().eq('user_id', userId);
    await this.client.from('integrations').delete().eq('user_id', userId);
    await this.client.from('execution_events').delete().eq('user_id', userId);
    await this.client.from('tasks').delete().eq('user_id', userId);
    const { error } = await this.client.from('profiles').delete().eq('id', userId);
    return !error;
  }
}
