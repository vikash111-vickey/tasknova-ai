import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowRight,
  Shield,
  Layers,
  Filter,
  Plus,
} from 'lucide-react';
import { Task } from '../types';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { useToast } from '../components/ui/Toast';

export const ExecutionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.getTasks();
      if (res.data) {
        setTasks(res.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch executions';
      addToast({
        type: 'error',
        title: 'Error Loading Executions',
        message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.instructions.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'running') {
      return (
        t.status === 'RUNNING' ||
        t.status === 'executing' ||
        t.status === 'VERIFYING' ||
        t.status === 'PLANNING' ||
        t.status === 'planning'
      );
    }
    if (statusFilter === 'approval') return t.status === 'AWAITING_APPROVAL';
    if (statusFilter === 'completed') return t.status === 'completed' || t.status === 'COMPLETED';
    if (statusFilter === 'failed') return t.status === 'failed' || t.status === 'FAILED';
    return true;
  });

  const runningCount = tasks.filter(
    (t) =>
      t.status === 'RUNNING' ||
      t.status === 'executing' ||
      t.status === 'VERIFYING' ||
      t.status === 'PLANNING'
  ).length;

  const approvalCount = tasks.filter((t) => t.status === 'AWAITING_APPROVAL').length;
  const completedCount = tasks.filter((t) => t.status === 'completed' || t.status === 'COMPLETED').length;
  const failedCount = tasks.filter((t) => t.status === 'failed' || t.status === 'FAILED').length;

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'COMPLETED') {
      return <Badge variant="success" size="sm">COMPLETED</Badge>;
    }
    if (s === 'RUNNING' || s === 'EXECUTING') {
      return <Badge variant="info" size="sm" className="animate-pulse">RUNNING</Badge>;
    }
    if (s === 'VERIFYING') {
      return <Badge variant="info" size="sm">VERIFYING</Badge>;
    }
    if (s === 'AWAITING_APPROVAL') {
      return <Badge variant="warning" size="sm">APPROVAL REQ</Badge>;
    }
    if (s === 'FAILED') {
      return <Badge variant="error" size="sm">FAILED</Badge>;
    }
    return <Badge variant="default" size="sm">{s}</Badge>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2a2a] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
              Live Executions
            </h1>
            <Badge variant="demo" size="md">SSE STREAM</Badge>
          </div>
          <p className="text-xs text-[#8a8a8a] mt-1">
            Real-time multi-step agent orchestrations, active DAG monitors, and verifiable audit records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border border-[#2a2a2a] text-[#8a8a8a] hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="gap-1.5 bg-[#aa88ff] text-black font-bold uppercase shadow-glow-purple"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Execution</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card variant="glass" className="p-4 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-[#8a8a8a] flex items-center justify-between mb-1">
            <span>Total Tasks</span>
            <Layers className="w-3.5 h-3.5 text-[#aa88ff]" />
          </div>
          <div className="text-2xl font-bold text-white">
            <AnimatedNumber value={tasks.length} />
          </div>
        </Card>

        <Card variant="glass" className="p-4 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-[#aa88ff] flex items-center justify-between mb-1">
            <span>Active</span>
            <PlayCircle className="w-3.5 h-3.5 text-[#aa88ff]" />
          </div>
          <div className="text-2xl font-bold text-[#aa88ff]">
            <AnimatedNumber value={runningCount} />
          </div>
        </Card>

        <Card variant="glass" className="p-4 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-amber-400 flex items-center justify-between mb-1">
            <span>Approval</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            <AnimatedNumber value={approvalCount} />
          </div>
        </Card>

        <Card variant="glass" className="p-4 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-emerald-400 flex items-center justify-between mb-1">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            <AnimatedNumber value={completedCount} />
          </div>
        </Card>

        <Card variant="glass" className="p-4 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-rose-400 flex items-center justify-between mb-1">
            <span>Failed</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            <AnimatedNumber value={failedCount} />
          </div>
        </Card>
      </div>

      {/* Controls Bar: Search & Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, goal, or task ID..."
            className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#8a8a8a] focus:outline-none focus:border-[#aa88ff] transition-colors"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-[#8a8a8a] mr-1 shrink-0" />
          {[
            { id: 'all', label: 'All' },
            { id: 'running', label: 'Running' },
            { id: 'approval', label: 'Needs Approval' },
            { id: 'completed', label: 'Completed' },
            { id: 'failed', label: 'Failed' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={`chip-axon ${statusFilter === chip.id ? 'active' : ''}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="text-center py-16 text-[#8a8a8a] text-xs">
          Loading active executions...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] space-y-4">
          <Layers className="w-10 h-10 text-[#8a8a8a] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-white uppercase">No Executions Found</h3>
          <p className="text-xs text-[#8a8a8a] max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'No tasks match the selected filter criteria.'
              : 'Launch your first autonomous execution from the Dashboard to see live progress.'}
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/dashboard')}
            className="bg-[#aa88ff] text-black font-bold uppercase"
          >
            Launch Workflow
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => (
            <Card
              key={t.id}
              variant="interactive"
              onClick={() => navigate(`/tasks/${t.id}/execute`)}
              className="p-5 bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#aa88ff]/50 rounded-lg transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-white hover:text-[#aa88ff] transition-colors truncate">
                      {t.title}
                    </span>
                    {getStatusBadge(t.status)}
                    <span className="px-1.5 py-0.5 rounded bg-[#1c1c1c] text-[10px] text-[#aa88ff] border border-[#2a2a2a] uppercase">
                      {t.mode || 'DEMO'}
                    </span>
                    {t.priority && (
                      <span className="px-1.5 py-0.5 rounded bg-[#1c1c1c] text-[10px] text-[#8a8a8a] border border-[#2a2a2a] uppercase">
                        {t.priority}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#8a8a8a] line-clamp-2">
                    {t.instructions}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#8a8a8a] pt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(t.createdAt).toLocaleString()}
                    </span>
                    <span className="font-mono text-[#8a8a8a]">
                      ID: <span className="text-[#dddddd]">{t.id.slice(0, 8)}...</span>
                    </span>
                    {t.trustScore && (
                      <span className="flex items-center gap-1 text-emerald-400 font-mono">
                        <Shield className="w-3 h-3" />
                        Trust: {t.trustScore}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tasks/${t.id}/execute`);
                    }}
                    className="gap-1.5 bg-[#aa88ff] text-black font-bold uppercase text-xs"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExecutionsPage;