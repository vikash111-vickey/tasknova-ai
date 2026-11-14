import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { DashboardPage } from './pages/DashboardPage';

describe('Spatial Dashboard & Execution UI', () => {
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
      if (url.includes('/api/tasks')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'task-test-123',
                userId: 'user-1',
                title: 'Weekly Sales Report',
                instructions: 'Generate weekly sales report and send summary email to team',
                status: 'COMPLETED',
                mode: 'demo',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                trustScore: 100,
              },
            ],
            message: 'ok',
          }),
        });
      }
      if (url.includes('/api/analytics')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              totalTasks: 1,
              completedTasks: 1,
              failedTasks: 0,
              pendingTasks: 0,
              successRate: 100,
              totalVerifications: 5,
              recentTasks: [],
            },
            message: 'ok',
          }),
        });
      }
      if (url.includes('/api/integrations')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'int-1',
                userId: 'user-1',
                name: 'Gmail Provider',
                type: 'gmail',
                isLive: false,
                status: 'connected',
                config: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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

  it('renders spatial dashboard with floating panels, KPI counters, and command input', async () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <DashboardPage />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Spatial Operations Center')).toBeInTheDocument();
      expect(screen.getByText('Launch Guided Demo (Weekly Report)')).toBeInTheDocument();
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('Active Workflows & History')).toBeInTheDocument();
      expect(screen.getByText('Connected Applications')).toBeInTheDocument();
      expect(screen.getByText('Execution Timeline & Activity Ledger')).toBeInTheDocument();
    });
  });
});
