import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScrollText,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Code,
} from 'lucide-react';

import { ExecutionEvent } from '../types';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

const CATEGORIES = [
  { label: 'All Events', value: 'all' },
  { label: 'Execution', value: 'execution' },
  { label: 'Verification', value: 'verification' },
  { label: 'Recovery', value: 'recovery' },
  { label: 'Approvals', value: 'approval' },
  { label: 'Integrations', value: 'integration' },
  { label: 'System', value: 'system' },
];

export const LogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 25;

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.getEvents({
        category,
        search,
        limit,
        offset: page * limit,
      });

      if (res?.data) {
        setEvents(res.data.events || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch activity logs';
      addToast({
        type: 'error',
        title: 'Error Loading Logs',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [category, search, page, addToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Live SSE connection to global event stream
  useEffect(() => {
    const token = api.getToken();
    const eventSource = new EventSource(`/api/events/stream?token=${encodeURIComponent(token || '')}`);

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed && parsed.id) {
          setEvents((prev) => [parsed, ...prev.slice(0, limit - 1)]);
          setTotal((prev) => prev + 1);
        }
      } catch {
        // Ignore heartbeat or non-json
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'verification':
        return <Badge variant="success" size="sm">VERIFICATION</Badge>;
      case 'recovery':
        return <Badge variant="info" size="sm">RECOVERY</Badge>;
      case 'approval_required':
        return <Badge variant="warning" size="sm">APPROVAL</Badge>;
      case 'step_fail':
      case 'error':
        return <Badge variant="error" size="sm">ERROR</Badge>;
      case 'step_start':
      case 'step_finish':
      case 'step_complete':
        return <Badge variant="default" size="sm">STEP</Badge>;
      default:
        return <Badge variant="default" size="sm">{type.toUpperCase()}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Activity Logs</h1>
            <Badge variant="demo" size="md">IMMUTABLE EVENT STREAM</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time audit telemetry with live Server-Sent Events (SSE) updates and category filtering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-slate-800 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SSE Stream Live</span>
          </div>

          <Button variant="ghost" size="sm" onClick={fetchEvents} className="text-slate-300">
            <RefreshCw className="w-4 h-4 mr-1 text-teal-400" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setCategory(c.value);
                setPage(0);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                category === c.value
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white glass border border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <Input
            placeholder="Search events by message or task ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 bg-slate-900/60"
          />
        </div>
      </div>

      {/* Events Table / Feed */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center space-y-4 glass">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto">
            <ScrollText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Activity Events Found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Events generated during planning, step execution, verification, and recovery will stream here live.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((evt) => (
            <GlassPanel
              key={evt.id}
              className="p-4 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col gap-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {getEventTypeBadge(evt.type)}
                  <span className="text-xs font-semibold text-slate-200">{evt.message}</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 self-end sm:self-auto font-mono">
                  <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>

                  {evt.taskId && (
                    <button
                      onClick={() => navigate(`/tasks/${evt.taskId}/execute`)}
                      className="hover:text-teal-300 transition-colors flex items-center gap-1 text-slate-400"
                      title="Inspect Task Workspace"
                    >
                      <span className="truncate max-w-[100px]">{evt.taskId.slice(0, 8)}...</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </button>
                  )}

                  {evt.payload && (
                    <button
                      onClick={() => setExpandedEventId(expandedEventId === evt.id ? null : evt.id)}
                      className="text-xs text-teal-400 hover:text-teal-300 transition-colors p-1"
                      title="View Payload"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Payload */}
              {expandedEventId === evt.id && evt.payload && (
                <div className="mt-2 p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800 overflow-x-auto">
                  <pre>{JSON.stringify(evt.payload, null, 2)}</pre>
                </div>
              )}
            </GlassPanel>
          ))}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Showing {events.length} of {total} events
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <span className="font-mono text-slate-300">
                Page {page + 1} of {totalPages}
              </span>

              <Button
                variant="ghost"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
