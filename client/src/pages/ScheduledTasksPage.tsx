import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Play,
  Plus,
  Trash2,
  Calendar,
  PauseCircle,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';

import { Schedule } from '../types';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';

export const ScheduledTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [instruction, setInstruction] = useState('');
  const [recurrence, setRecurrence] = useState<'once' | 'daily' | 'weekly' | 'custom'>('daily');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await api.getSchedules();
      if (res?.data) {
        setSchedules(res.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch schedules';
      addToast({
        type: 'error',
        title: 'Error Loading Schedules',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleRecurrenceChange = (val: 'once' | 'daily' | 'weekly' | 'custom') => {
    setRecurrence(val);
    if (val === 'daily') setCronExpression('0 9 * * *');
    else if (val === 'weekly') setCronExpression('0 9 * * 1');
    else if (val === 'once') setCronExpression('0 12 * * *');
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !instruction.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.createSchedule({
        name: name.trim(),
        instruction: instruction.trim(),
        cronExpression: cronExpression.trim() || '0 9 * * *',
        recurrence,
        timezone,
        isActive: true,
      });

      addToast({
        type: 'success',
        title: 'Schedule Registered',
        message: `Cron job "${res.data.name}" added to backend scheduler.`,
      });

      setIsModalOpen(false);
      setName('');
      setInstruction('');
      fetchSchedules();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create schedule';
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (schedule: Schedule) => {
    try {
      const updated = await api.updateSchedule(schedule.id, { isActive: !schedule.isActive });
      addToast({
        type: 'info',
        title: updated.data.isActive ? 'Schedule Activated' : 'Schedule Paused',
        message: `Schedule "${schedule.name || schedule.id}" is now ${updated.data.isActive ? 'active' : 'paused'}.`,
      });
      fetchSchedules();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update schedule';
      addToast({
        type: 'error',
        title: 'Toggle Failed',
        message,
      });
    }
  };

  const handleRunNow = async (schedule: Schedule) => {
    setRunningScheduleId(schedule.id);
    try {
      const res = await api.runScheduleNow(schedule.id);
      addToast({
        type: 'success',
        title: 'Scheduled Task Executed (DEMO)',
        message: `Task "${res.data.task.title}" spawned. Transitioning to workspace...`,
      });
      navigate(`/tasks/${res.data.task.id}/execute`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to trigger schedule';
      addToast({
        type: 'error',
        title: 'Trigger Failed',
        message,
      });
    } finally {
      setRunningScheduleId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this scheduled task?')) return;
    try {
      await api.deleteSchedule(id);
      addToast({
        type: 'info',
        title: 'Schedule Deleted',
        message: 'The cron job has been removed from the platform scheduler.',
      });
      fetchSchedules();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete schedule';
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message,
      });
    }
  };

  const totalSchedules = schedules.length;
  const activeSchedules = schedules.filter((s) => s.isActive).length;
  const pausedSchedules = totalSchedules - activeSchedules;

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Scheduled Tasks</h1>
            <Badge variant="demo" size="md">NODE-CRON ENGINE</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Timezone-aware automated execution scheduler with approval gate safety and verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchSchedules} className="text-slate-300">
            <RefreshCw className="w-4 h-4 mr-1 text-teal-400" />
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} className="glow-cyan">
            <Plus className="w-4 h-4 mr-1" />
            New Schedule
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <GlassPanel className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Schedules</p>
            <p className="text-2xl font-bold text-white mt-1">
              <AnimatedNumber value={totalSchedules} />
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Calendar className="w-5 h-5" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Jobs</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              <AnimatedNumber value={activeSchedules} />
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <PlayCircle className="w-5 h-5" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Paused Jobs</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              <AnimatedNumber value={pausedSchedules} />
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <PauseCircle className="w-5 h-5" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Scheduler Mode</p>
            <p className="text-lg font-bold text-cyan-400 mt-1">LocalStore</p>
            <span className="text-[11px] text-slate-400">Zero-Config Cron</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
        </GlassPanel>
      </div>

      {/* Schedules List */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : schedules.length === 0 ? (
        <Card className="p-12 text-center space-y-4 glass">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Scheduled Tasks Configured</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Automate periodic tasks like weekly executive reports, invoice auditing, or lead enrichment.
          </p>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Schedule
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {schedules.map((schedule) => (
            <GlassPanel
              key={schedule.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800 hover:border-slate-700/80 transition-all"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    {schedule.name || 'Untitled Schedule'}
                  </h3>
                  <Badge variant={schedule.isActive ? 'success' : 'warning'} size="sm">
                    {schedule.isActive ? 'ACTIVE' : 'PAUSED'}
                  </Badge>
                  <Badge variant="default" size="sm" className="font-mono text-[10px]">
                    {schedule.cronExpression}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300 line-clamp-1 max-w-2xl font-mono bg-slate-950/40 px-2 py-1 rounded border border-slate-800/60">
                  {schedule.instruction || 'Periodic platform verification task.'}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span>Recurrence: <strong className="text-slate-300 capitalize">{schedule.recurrence || 'Daily'}</strong></span>
                  <span>Timezone: <strong className="text-slate-300">{schedule.timezone || 'UTC'}</strong></span>
                  {schedule.lastRunAt && (
                    <span>Last run: <strong className="text-slate-300">{new Date(schedule.lastRunAt).toLocaleDateString()}</strong></span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(schedule)}
                  className="text-xs text-slate-300 hover:text-white"
                >
                  {schedule.isActive ? 'Pause' : 'Activate'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRunNow(schedule)}
                  disabled={runningScheduleId === schedule.id}
                  className="text-xs"
                >
                  <Play className="w-3.5 h-3.5 mr-1 fill-current text-teal-400" />
                  {runningScheduleId === schedule.id ? 'Running...' : 'Run Now'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(schedule.id)}
                  className="text-slate-400 hover:text-red-400 p-2"
                  title="Delete Schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {/* New Schedule Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Scheduled Task">
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Schedule Name
            </label>
            <Input
              placeholder="e.g. Daily Stripe Reconciliation & Invoicing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Task Prompt / Natural Instruction
            </label>
            <Textarea
              placeholder="Describe what the autonomous agent should execute on each run..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => handleRecurrenceChange(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-400"
              >
                <option value="daily">Daily at 9:00 AM</option>
                <option value="weekly">Weekly on Mondays (9:00 AM)</option>
                <option value="once">Once at 12:00 PM</option>
                <option value="custom">Custom Cron Expression</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Cron Expression
              </label>
              <Input
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 9 * * *"
                className="font-mono text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-400"
            >
              <option value="UTC">UTC (Universal Coordinated Time)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ScheduledTasksPage;
