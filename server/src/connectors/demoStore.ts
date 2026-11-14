export interface DemoEmail {
  id: string;
  threadId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  snippet: string;
  date: string;
  labels: string[];
}

export interface DemoOutboxEmail {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  attachmentId?: string;
  attachmentName?: string;
  timestamp: string;
  status: 'accepted_by_demo_mail_server';
  mode: 'demo';
}

export interface DemoDriveFile {
  id: string;
  name: string;
  mimeType: string;
  folder: string;
  size: number;
  data?: Buffer | string;
  downloadUrl?: string;
  createdAt: string;
}

export interface DemoCalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface DemoSlackMessage {
  id: string;
  channel: string;
  message: string;
  timestamp: string;
  mode: 'demo';
}

export class DemoStore {
  private static instance: DemoStore;

  public emails: DemoEmail[] = [];
  public outbox: DemoOutboxEmail[] = [];
  public driveFiles: DemoDriveFile[] = [];
  public calendarEvents: DemoCalendarEvent[] = [];
  public slackMessages: DemoSlackMessage[] = [];

  private constructor() {
    this.seedDefaultData();
  }

  public static getInstance(): DemoStore {
    if (!DemoStore.instance) {
      DemoStore.instance = new DemoStore();
    }
    return DemoStore.instance;
  }

  public reset(): void {
    this.emails = [];
    this.outbox = [];
    this.driveFiles = [];
    this.calendarEvents = [];
    this.slackMessages = [];
    this.seedDefaultData();
  }

  public seedDefaultData(): void {
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

    // 1. Seed Synthetic Project Emails
    this.emails = [
      {
        id: 'email_proj_101',
        threadId: 'th_01',
        sender: 'sarah.connor@tasknova.local',
        recipient: 'team@tasknova.local',
        subject: 'Weekly Progress: Core Platform Architecture',
        body: `Hi Team,\nHere is the weekly update for the platform architecture sprint.\n\nAchievements:\n- Finished zero-config LocalStore atomic file persistence and verified Supabase compatibility.\n- Built DAG validator with cycle detection and automatic human-in-the-loop approval step insertion.\n- Completed 2D fallback for Three.js spatial visualizer.\n\nBlockers:\n- None at this moment.\n\nNext Steps:\n- Ship Execution Orchestrator and PDF report generation pipeline.\n\nBest,\nSarah`,
        snippet: 'Here is the weekly update for the platform architecture sprint...',
        date: daysAgo(3),
        labels: ['INBOX', 'PROJECT_UPDATES', 'ARCHITECTURE'],
      },
      {
        id: 'email_proj_102',
        threadId: 'th_02',
        sender: 'alex.rivera@acme.corp',
        recipient: 'onboarding@tasknova.local',
        subject: 'Acme Corp: Enterprise Workspace Provisioning Approval',
        body: `Hello TASKNOVA Team,\n\nWe have verified our domain DNS settings for acme.corp. Our security audit approved the sandbox deployment.\nPlease provision our enterprise demo workspace and send the initial admin credentials link to admin@acme.corp.\n\nThank you,\nAlex Rivera, VP Engineering Acme Corp`,
        snippet: 'We have verified our domain DNS settings for acme.corp...',
        date: daysAgo(2),
        labels: ['INBOX', 'ENTERPRISE', 'ONBOARDING'],
      },
      {
        id: 'email_proj_103',
        threadId: 'th_03',
        sender: 'security-bot@tasknova.local',
        recipient: 'devops@tasknova.local',
        subject: 'Audit Report: Integration Health & Sync Monitor',
        body: `TASKNOVA System Audit Summary:\n- Stripe Webhook: 100% healthy, 0 failed payouts in 7 days.\n- Demo Store Orders: 48 matched transactions, 0 reconciliation discrepancies.\n- Slack Gateway: Active on #ops-alerts.\nAll systems operating nominally.`,
        snippet: 'TASKNOVA System Audit Summary: Stripe Webhook 100% healthy...',
        date: daysAgo(1),
        labels: ['INBOX', 'AUDIT', 'DEVOPS'],
      },
    ];

    // 2. Seed Drive Folders & Initial Files
    this.driveFiles = [
      {
        id: 'drive_file_template',
        name: 'Weekly_Executive_Report_Template.md',
        mimeType: 'text/markdown',
        folder: '/Reports',
        size: 1420,
        createdAt: daysAgo(7),
      },
      {
        id: 'drive_file_acme_spec',
        name: 'Acme_Enterprise_Onboarding_Spec.pdf',
        mimeType: 'application/pdf',
        folder: '/Clients',
        size: 28400,
        createdAt: daysAgo(5),
      },
    ];

    // 3. Seed Calendar Events
    this.calendarEvents = [
      {
        id: 'cal_event_standup',
        title: 'Weekly Cross-Team Orchestration Sync',
        description: 'Review weekly progress, pipeline performance, and audit ledger.',
        startTime: new Date(now.getTime() + 3600000).toISOString(),
        endTime: new Date(now.getTime() + 7200000).toISOString(),
        attendees: ['team@tasknova.local', 'finance@tasknova.local'],
        status: 'confirmed',
      },
    ];

    // 4. Seed Slack
    this.slackMessages = [
      {
        id: 'slack_msg_init',
        channel: '#ops-alerts',
        message: 'System audit daemon initialized. Real-time alert monitoring active. [DEMO]',
        timestamp: daysAgo(1),
        mode: 'demo',
      },
    ];
  }
}
