import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('Spatial UI Foundation & Landing Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          status: 'ok',
          mode: 'demo',
          ai: 'template',
        },
        message: 'Service is healthy',
      }),
    });
  });

  it('renders landing page hero title and both CTAs', async () => {
    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText(/Your instructions\./i)).toBeInTheDocument();
        expect(screen.getByText(/Our execution\./i)).toBeInTheDocument();
        expect(screen.getByText('Get Started')).toBeInTheDocument();
        expect(screen.getByText('Explore Workflows')).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it('renders technical architecture flow diagram and final CTA', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('How does it work technically?')).toBeInTheDocument();
      expect(screen.getByText('User Instruction')).toBeInTheDocument();
      expect(screen.getAllByText('AI Brain').length).toBeGreaterThan(0);
      expect(screen.getByText('Execution Engine')).toBeInTheDocument();
      expect(screen.getByText('Verification Engine')).toBeInTheDocument();
      expect(screen.getByText('Task Completed + Proof')).toBeInTheDocument();
      expect(screen.getByText('Launch TASKNOVA')).toBeInTheDocument();
    });
  });

  it('renders all navigation items and dev state switcher', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Brain Visualizer State:')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Workflows & Tasks')).toBeInTheDocument();
      expect(screen.getByText('Live Executions')).toBeInTheDocument();
    });
  });
});
