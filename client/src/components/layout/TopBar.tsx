import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, Menu, User, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

export interface TopBarProps {
  onOpenCommandPalette: () => void;
  onToggleMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCommandPalette,
  onToggleMobileMenu,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [healthStatus, setHealthStatus] = useState<{ mode: 'demo' | 'live'; ai: string }>({
    mode: 'demo',
    ai: 'template',
  });
  const { addToast } = useToast();

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.getUnreadNotificationCount();
      if (res?.data) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Ignore if unauthenticated
    }
  }, []);

  useEffect(() => {
    api.getHealth()
      .then((res) => {
        if (res?.data) {
          setHealthStatus({
            mode: res.data.mode || 'demo',
            ai: res.data.ai || 'template',
          });
        }
      })
      .catch(() => {});

    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setCreatingTask(true);
    try {
      const res = await api.createTask({
        title: taskTitle.trim(),
        instructions: taskInstructions.trim() || 'No additional instructions provided.',
      });

      addToast({
        type: 'success',
        title: 'Task Created Successfully',
        message: `Task "${res.data.title}" persisted to ${healthStatus.mode === 'demo' ? 'LocalStore' : 'Supabase'}.`,
      });

      setIsNewTaskOpen(false);
      setTaskTitle('');
      setTaskInstructions('');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      addToast({
        type: 'error',
        title: 'Error Creating Task',
        message,
      });
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-black/90 backdrop-blur-xl border-b border-[#2a2a2a] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
        {/* Left: Mobile hamburger & Search bar */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <IconButton
            aria-label="Open mobile navigation"
            variant="ghost"
            onClick={onToggleMobileMenu}
            className="md:hidden text-[#8a8a8a] hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </IconButton>

          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-md bg-[#0a0a0a] border border-[#2a2a2a] text-[#8a8a8a] hover:border-[#aa88ff]/40 hover:text-[#dddddd] transition-all duration-300 text-xs font-mono group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#aa88ff] group-hover:text-white transition-colors" />
              <span>SEARCH COMMANDS &amp; ROUTES...</span>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c1c1c] border border-[#2a2a2a] text-[#8a8a8a]">
              CTRL+K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Connection status pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-md bg-[#0a0a0a] border border-[#2a2a2a] text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#aa88ff] animate-pulse" />
            <span className="text-[#dddddd] uppercase">
              {healthStatus.mode === 'demo' ? 'LocalStore' : 'Supabase Live'}
            </span>
            {healthStatus.mode === 'demo' && (
              <span className="px-1.5 py-0.2 rounded bg-[#1c1c1c] text-[#aa88ff] text-[9px] uppercase border border-[#2a2a2a]">
                DEMO
              </span>
            )}
          </div>

          {/* New Task Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsNewTaskOpen(true)}
            className="gap-1.5 bg-[#aa88ff] hover:bg-[#aa88ff]/90 text-black font-mono font-bold tracking-wide text-xs px-3.5 py-1.5 rounded-md shadow-glow-purple transition-all duration-300"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline uppercase">New Task</span>
          </Button>

          {/* 44x44 Circular Counter Indicator from brief */}
          <button
            onClick={() => navigate('/notifications')}
            title="Notifications"
            className="counter-axon hover:border-[#aa88ff] hover:shadow-glow-purple transition-all duration-300 relative text-xs"
          >
            {unreadCount > 0 ? (
              <span className="text-[#aa88ff] font-bold">{unreadCount < 10 ? `0${unreadCount}` : unreadCount}</span>
            ) : (
              <Bell className="w-4 h-4 text-[#8a8a8a] hover:text-white" />
            )}
          </button>

          {/* User Avatar linking to /profile */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 pl-2 border-l border-[#2a2a2a] hover:opacity-80 transition-opacity"
            title={user ? `Signed in as ${user.fullName} (${user.email})` : 'View Profile'}
          >
            <div className="w-8 h-8 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-xs font-mono font-bold text-white shadow-sm ring-1 ring-white/10">
              <User className="w-4 h-4 text-[#aa88ff]" />
            </div>
          </button>
        </div>
      </header>

      {/* New Task Modal */}
      <Modal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        title="Create Autonomous Task"
        description="Describe your objective in plain English. The task is persisted to the repository."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Name"
            placeholder="e.g. Verify weekly client invoice payments"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
            autoFocus
          />

          <Textarea
            label="Instructions & Goal"
            placeholder="Specify actions, target tools (Email, Slack, Sheets), and success conditions..."
            rows={4}
            value={taskInstructions}
            onChange={(e) => setTaskInstructions(e.target.value)}
            helperText="Persisted atomically to repository store."
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsNewTaskOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={creatingTask}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Task</span>
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
