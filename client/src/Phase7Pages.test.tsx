import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import { ScheduledTasksPage } from './pages/ScheduledTasksPage';
import { ConnectorsPage } from './pages/ConnectorsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

describe('Phase 7 Frontend Modules Acceptance', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { status: 'ok', mode: 'demo', ai: 'template' },
            message: 'ok',
          }),
        });
      }
      if (url.includes('/api/schedules')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'sched-1',
                userId: 'user-1',
                name: 'Daily Invoice Audit',
                instruction: 'Reconcile Stripe charges daily',
                cronExpression: '0 9 * * *',
                recurrence: 'daily',
                timezone: 'UTC',
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
            message: 'ok',
          }),
        });
      }
      if (url.includes('/api/integrations/status')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'gmail',
                name: 'Gmail',
                type: 'email',
                category: 'Communication',
                description: 'Autonomous customer dispatch',
                mode: 'demo',
                status: 'connected',
                isDemoConnected: true,
                isLiveConfigured: false,
                actions: ['email.send'],
                supportedInDemo: true,
                liveCredentialsRequired: ['GOOGLE_CLIENT_ID'],
              },
            ],
            message: 'ok',
          }),
        });
      }
      if (url.includes('/api/integrations/demo-store/summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              invoicesCount: 4,
              customersCount: 3,
              outboxEmailsCount: 1,
              driveFilesCount: 2,
              calendarEventsCount: 2,
              inboxEmailsCount: 3,
            },
            message: 'ok',
          }),
        });
      }
      if (url.includes('/api/reports')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              reports: [
                {
                  id: 'rep-1',
                  title: 'Executive Autonomous Execution Audit',
                  summary: '100% verified outputs',
                  generatedAt: new Date().toISOString(),
                },
              ],
              files: [
                {
                  id: 'file-1',
                  taskId: 'task-100',
                  fileName: 'Summary_Report.pdf',
                  fileSize: 45200,
                  mimeType: 'application/pdf',
                  createdAt: new Date().toISOString(),
                },
              ],
            },
            message: 'ok',
          }),
        });
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'notif-1',
                title: 'Approval Required',
                message: 'Confirm email dispatch batch',
                type: 'approval_required',
                read: false,
                createdAt: new Date().toISOString(),
              },
            ],
            message: 'ok',
          }),
        });
      }
      if (url.includes('/api/policies')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'pol-1',
                name: 'Require Human Approval for External Email Dispatch',
                ruleType: 'external_communication',
                ruleConfig: { requiresApproval: true },
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
            message: 'ok',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: {}, message: 'ok' }),
      });
    });
  });

  it('renders ScheduledTasksPage with KPI cards and registered schedules', async () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScheduledTasksPage />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    );

    expect(screen.getByText('Scheduled Tasks')).toBeInTheDocument();
    expect(screen.getByText('NODE-CRON ENGINE')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Daily Invoice Audit')).toBeInTheDocument();
    });
  });

  it('renders ConnectorsPage with Integrations Center and Demo Store summary strip', async () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ConnectorsPage />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    );

    expect(screen.getByText('Integrations Center')).toBeInTheDocument();
    expect(screen.getByText('ZERO-KEY DEMO STORE')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Gmail')).toBeInTheDocument();
      expect(screen.getByText('Demo Store Active')).toBeInTheDocument();
    });
  });

  it('renders ReportsPage with verified reports and generated file attachments', async () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ReportsPage />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    );

    expect(screen.getByText('Reports & Artifacts')).toBeInTheDocument();
    expect(screen.getByText('PROOF VERIFIED')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Executive Autonomous Execution Audit')).toBeInTheDocument();
      expect(screen.getByText('Summary_Report.pdf')).toBeInTheDocument();
    });
  });

  it('renders NotificationsPage with active alerts and unread status', async () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <NotificationsPage />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    );

    expect(screen.getByText('Notification Center')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Approval Required')).toBeInTheDocument();
      expect(screen.getByText('Confirm email dispatch batch')).toBeInTheDocument();
    });
  });

  it('renders SettingsPage with security policies and appearance settings', async () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <SettingsPage />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    );

    expect(screen.getByText('Settings & Security')).toBeInTheDocument();
    expect(screen.getByText('ZERO-KEY ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Profile & Identity')).toBeInTheDocument();
  });
});
