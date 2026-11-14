import {
  User,
  Task,
  TaskStep,
  ExecutionEvent,
  ProofLedgerEntry,
  Approval,
  GeneratedFile,
  ChaosFault,
  Integration,
  AnalyticsData,
  NotificationItem,
} from '../types';

export * from '../types';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

class ApiClient {
  public getToken(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('tasknova_token');
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    const body: ApiResponse<T> = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.message || `API request failed with status ${res.status}`);
    }

    return body;
  }

  // Auth
  async login(credentials: { email: string; password: string }) {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: { email: string; password: string; fullName: string }) {
    return this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    return this.request<null>('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request<{ user: User }>('/auth/me');
  }

  async getDemoCredentials() {
    return this.request<{ email: string; password: string; role: string }>('/auth/demo-account');
  }

  // Profile
  async getProfile() {
    return this.request<User>('/users/profile');
  }

  async updateProfile(updates: Partial<User>) {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Tasks
  async getTasks() {
    return this.request<Task[]>('/tasks');
  }

  async getTask(id: string) {
    return this.request<Task & { steps?: TaskStep[] }>(`/tasks/${id}`);
  }

  async createTask(task: { title: string; instructions: string; priority?: string; tags?: string[] }) {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async cancelTask(id: string) {
    return this.request<Task>(`/tasks/${id}/cancel`, { method: 'POST' });
  }

  async retryTask(id: string) {
    return this.request<Task>(`/tasks/${id}/retry`, { method: 'POST' });
  }

  // Notifications
  async getNotifications() {
    return this.request<NotificationItem[]>('/notifications');
  }

  async getUnreadNotificationCount() {
    return this.request<{ unreadCount: number }>('/notifications/unread-count');
  }

  async markNotificationRead(id: string) {
    return this.request<{ read: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  // Health
  async getHealth() {
    return this.request<{ status: string; mode: 'demo' | 'live'; ai: string }>('/health');
  }

  // AI Model Configuration
  async getAiConfig() {
    return this.request<{ provider: 'gemini' | 'openai' | 'template'; hasKey: boolean; model: string }>('/planning/config');
  }

  async updateAiConfig(data: { provider: 'gemini' | 'openai' | 'template'; apiKey?: string; model?: string }) {
    return this.request<{ provider: 'gemini' | 'openai' | 'template'; connected: boolean; model?: string }>('/planning/config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Planning
  async understand(instruction: string) {
    return this.request<{
      objective: string;
      requested_actions: string[];
      target_apps: string[];
      required_data: string[];
      expected_output: string;
      missing_information: string[];
      clarifying_questions: string[];
      risk_summary: string;
      can_proceed: boolean;
    }>('/planning/understand', {
      method: 'POST',
      body: JSON.stringify({ instruction }),
    });
  }

  async generatePlan(
    instruction: string,
    clarifications?: Record<string, string>,
    taskId?: string
  ) {
    return this.request<{
      task: Task;
      plan: {
        title: string;
        objective: string;
        preserved_original_instruction: string;
        estimated_total_seconds: number;
        risk_level: 'low' | 'medium' | 'high';
        steps: Array<{
          id: string;
          name: string;
          tool: string;
          action: string;
          input: Record<string, unknown>;
          depends_on: string[];
          requires_approval: boolean;
          risk_level: 'low' | 'medium' | 'high';
          expected_output: string;
          verification_method: string;
          reason: string;
          estimated_seconds: number;
          idempotent: boolean;
        }>;
      };
      planner_used: 'gemini' | 'openai' | 'template';
      fallback_used: boolean;
      intent: unknown;
    }>('/planning/generate', {
      method: 'POST',
      body: JSON.stringify({ instruction, clarifications, taskId }),
    });
  }

  async approvePlan(taskId: string) {
    return this.request<Task>(`/planning/${taskId}/approve-plan`, { method: 'POST' });
  }

  // Executions
  async runExecution(taskId: string) {
    return this.request<{ taskId: string; status: string; alreadyRunning: boolean }>(
      `/executions/${taskId}/run`,
      { method: 'POST' }
    );
  }

  async getExecution(taskId: string) {
    return this.request<{
      task: Task;
      steps: TaskStep[];
      events: ExecutionEvent[];
      verification?: unknown;
      files: GeneratedFile[];
      isRunning: boolean;
    }>(`/executions/${taskId}`);
  }

  async cancelExecution(taskId: string) {
    return this.request<Task>(`/executions/${taskId}/cancel`, { method: 'POST' });
  }

  async getExecutionEvents(taskId: string, sinceId?: string) {
    const query = sinceId ? `?sinceId=${encodeURIComponent(sinceId)}` : '';
    return this.request<ExecutionEvent[]>(`/executions/${taskId}/events${query}`);
  }

  async getExecutionFiles(taskId: string) {
    return this.request<GeneratedFile[]>(`/executions/${taskId}/files`);
  }

  // Proof Ledger & Integrity
  async getProofLedger(taskId: string) {
    return this.request<ProofLedgerEntry[]>(`/tasks/${taskId}/proof`);
  }

  async verifyProof(taskId: string) {
    return this.request<{
      valid: boolean;
      totalEntries: number;
      tamperedStepIndex: number | null;
      brokenLinkIndex: number | null;
      trustScore: number;
      error?: string;
    }>(`/tasks/${taskId}/proof/verify`, {
      method: 'POST',
    });
  }

  getProofCertificateUrl(taskId: string): string {
    const token = this.getToken();
    return `/api/tasks/${taskId}/proof/certificate?token=${encodeURIComponent(token || '')}`;
  }

  async downloadProofCertificate(taskId: string): Promise<Blob> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`/api/tasks/${taskId}/proof/certificate`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to download certificate: ${res.status}`);
    }
    return res.blob();
  }

  // Approvals
  async getApprovals() {
    return this.request<Approval[]>('/approvals');
  }

  async approveAction(approvalId: string, note?: string) {
    return this.request<unknown>(`/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async rejectAction(approvalId: string, note?: string) {
    return this.request<unknown>(`/approvals/${approvalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async editApprovalPayload(approvalId: string, payload: Record<string, unknown>) {
    return this.request<unknown>(`/approvals/${approvalId}/edit`, {
      method: 'PUT',
      body: JSON.stringify({ payload }),
    });
  }

  // Chaos Engine (Demo Mode)
  async injectChaos(fault: {
    faultType: 'network_timeout' | 'auth_expiry' | 'verification_mismatch' | 'provider_503';
    target?: string;
    occurrences?: number;
  }) {
    return this.request<ChaosFault>('/chaos/inject', {
      method: 'POST',
      body: JSON.stringify(fault),
    });
  }

  async getChaosFaults() {
    return this.request<ChaosFault[]>('/chaos/faults');
  }

  async clearChaosFaults() {
    return this.request<{ cleared: boolean }>('/chaos/faults', {
      method: 'DELETE',
    });
  }

  // Analytics & Integrations
  async getAnalytics(range = '30d') {
    return this.request<AnalyticsData>(`/analytics?range=${encodeURIComponent(range)}`);
  }

  async getIntegrations() {
    return this.request<Integration[]>('/integrations');
  }

  async getIntegrationCatalog() {
    return this.request<import('../types').IntegrationCatalogItem[]>('/integrations/status');
  }

  async requestOAuthUrl(type: string, redirectUri?: string) {
    return this.request<{ canConnectLive: boolean; authUrl?: string; state?: string }>(
      `/integrations/${type}/oauth`,
      {
        method: 'POST',
        body: JSON.stringify({ redirectUri }),
      }
    );
  }

  async getDemoStoreSummary() {
    return this.request<{
      invoicesCount: number;
      customersCount: number;
      outboxEmailsCount: number;
      driveFilesCount: number;
      calendarEventsCount: number;
      inboxEmailsCount: number;
    }>('/integrations/demo-store/summary');
  }

  // Schedules
  async getSchedules() {
    return this.request<import('../types').Schedule[]>('/schedules');
  }

  async createSchedule(data: {
    name: string;
    instruction: string;
    cronExpression: string;
    recurrence?: string;
    timezone?: string;
    isActive?: boolean;
  }) {
    return this.request<import('../types').Schedule>('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSchedule(id: string, updates: Partial<import('../types').Schedule>) {
    return this.request<import('../types').Schedule>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSchedule(id: string) {
    return this.request<{ deleted: boolean }>(`/schedules/${id}`, {
      method: 'DELETE',
    });
  }

  async runScheduleNow(id: string) {
    return this.request<{
      task: Task;
      schedule: import('../types').Schedule;
      executionWorkspaceUrl: string;
    }>(`/schedules/${id}/run`, {
      method: 'POST',
    });
  }

  // Policies
  async getPolicies() {
    return this.request<import('../types').Policy[]>('/policies');
  }

  async createPolicy(data: {
    name: string;
    ruleType: string;
    ruleConfig?: Record<string, unknown>;
    isActive?: boolean;
  }) {
    return this.request<import('../types').Policy>('/policies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePolicy(id: string, updates: Partial<import('../types').Policy>) {
    return this.request<import('../types').Policy>(`/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePolicy(id: string) {
    return this.request<{ deleted: boolean }>(`/policies/${id}`, {
      method: 'DELETE',
    });
  }

  // Reports & Files
  async getReports() {
    return this.request<{
      reports: { id: string; title: string; type: string; generatedAt: string; summary: string; status: string }[];
      files: (GeneratedFile & { taskTitle?: string; taskStatus?: string })[];
    }>('/reports');
  }

  async createReport(data: { name: string; range: string; type: string }) {
    return this.request<unknown>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFiles() {
    return this.request<GeneratedFile[]>('/files');
  }

  async deleteFile(id: string) {
    return this.request<{ deleted: boolean }>(`/files/${id}`, {
      method: 'DELETE',
    });
  }

  // Events & Activity Logs
  async getEvents(params?: { category?: string; search?: string; limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<{
      events: ExecutionEvent[];
      total: number;
      offset: number;
      limit: number;
    }>(`/events${qs}`);
  }

  // Notifications
  async markAllNotificationsRead() {
    return this.request<{ allRead: boolean }>('/notifications/read-all', {
      method: 'PATCH',
    });
  }

  async deleteNotification(id: string) {
    return this.request<{ deleted: boolean }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // User Data & Account Management
  async exportUserData(): Promise<Blob> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch('/api/users/export', { headers });
    if (!res.ok) {
      throw new Error(`Failed to export data: ${res.status}`);
    }
    return res.blob();
  }

  async deleteUserAccount() {
    return this.request<{ deleted: boolean }>('/users/account', {
      method: 'DELETE',
    });
  }

  // Demo Environment Reset
  async resetDemoData() {
    return this.request<{ reset: boolean; timestamp: string }>('/demo/reset', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
