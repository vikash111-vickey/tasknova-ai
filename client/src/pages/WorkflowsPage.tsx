import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Shield,
  Clock,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import WorkflowBuilderPage from './WorkflowBuilderPage';

export const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'scenarios' | 'builder'>('scenarios');

  const DEMO_SCENARIOS = [
    {
      id: 'scen-1',
      title: 'Weekly Financial Audit & Invoicing',
      tag: 'FINANCE',
      description: 'Queries Stripe charges, reconciles with synthetic store invoices, compiles executive summary, halts for operator approval, and dispatches verified email.',
      tools: ['Stripe', 'Store DB', 'Report Gen', 'Outbox Email'],
      duration: '~35 seconds',
      stepsCount: 5,
      prompt: 'Generate weekly sales report and send summary email to team',
    },
    {
      id: 'scen-2',
      title: 'Executive Calendar Scheduling & Invites',
      tag: 'CALENDAR',
      description: 'Checks participant calendar availability, creates event in Google Calendar, requests approval, and dispatches signed attendee invites.',
      tools: ['Calendar API', 'Approval Gate', 'Outbox Email'],
      duration: '~25 seconds',
      stepsCount: 4,
      prompt: 'Schedule an executive strategy meeting for tomorrow at 2pm and invite team',
    },
    {
      id: 'scen-3',
      title: 'Drive Document Organization & Synthesis',
      tag: 'STORAGE',
      description: 'Searches Google Drive repository for customer contracts, synthesizes executive PDF summary report, and uploads verified document back to Drive.',
      tools: ['Google Drive', 'Report Gen', 'Cloud Upload'],
      duration: '~28 seconds',
      stepsCount: 3,
      prompt: 'Search Google Drive for customer contracts, generate executive PDF summary and upload report to Drive',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2a2a] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
              Workflows &amp; Tasks
            </h1>
            <Badge variant="demo" size="md">DAG ORCHESTRATION</Badge>
          </div>
          <p className="text-xs text-[#8a8a8a] mt-1">
            Pre-audited verifiable scenarios and custom interactive DAG visual builder.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-[#0a0a0a] border border-[#2a2a2a]">
          <button
            onClick={() => setActiveView('scenarios')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-all duration-300 ${
              activeView === 'scenarios'
                ? 'bg-[#aa88ff] text-black font-bold shadow-glow-purple'
                : 'text-[#8a8a8a] hover:text-white'
            }`}
          >
            Pre-Built Scenarios
          </button>
          <button
            onClick={() => setActiveView('builder')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-all duration-300 ${
              activeView === 'builder'
                ? 'bg-[#aa88ff] text-black font-bold shadow-glow-purple'
                : 'text-[#8a8a8a] hover:text-white'
            }`}
          >
            Visual DAG Builder
          </button>
        </div>
      </div>

      {activeView === 'builder' ? (
        <WorkflowBuilderPage />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEMO_SCENARIOS.map((scen) => (
              <Card
                key={scen.id}
                variant="interactive"
                className="p-6 bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#aa88ff]/50 rounded-lg flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="info" size="sm">{scen.tag}</Badge>
                    <span className="text-[10px] text-[#8a8a8a] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#aa88ff]" />
                      {scen.duration}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white uppercase">{scen.title}</h3>
                  <p className="text-xs text-[#8a8a8a] leading-relaxed">
                    {scen.description}
                  </p>

                  <div className="pt-2 border-t border-[#2a2a2a] space-y-1.5">
                    <span className="text-[10px] uppercase text-[#8a8a8a]">Required Tools:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {scen.tools.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded bg-[#1c1c1c] text-[10px] text-[#dddddd] border border-[#2a2a2a]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    100% Verifiable
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      navigate(`/dashboard?prompt=${encodeURIComponent(scen.prompt)}`);
                    }}
                    className="gap-1.5 bg-[#aa88ff] text-black font-bold uppercase text-xs"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Flow</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Bottom Banner */}
          <Card variant="glass" className="p-6 bg-[#0a0a0a] border-[#2a2a2a] rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase">Need a custom autonomous DAG?</h4>
              <p className="text-xs text-[#8a8a8a]">
                Use our Visual DAG Builder to drag and drop custom tool actions, set dependencies, and validate cycle freedom.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveView('builder')}
              className="bg-[#1c1c1c] border-[#2a2a2a] text-[#aa88ff] hover:border-[#aa88ff]/50 uppercase text-xs"
            >
              Open DAG Canvas
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WorkflowsPage;