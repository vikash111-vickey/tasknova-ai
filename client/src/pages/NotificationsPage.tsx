import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Trash2,
  CheckCheck,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

import { NotificationItem } from '../types';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      if (res?.data) {
        setNotifications(res.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
      addToast({
        type: 'error',
        title: 'Error Loading Notifications',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark as read';
      addToast({
        type: 'error',
        title: 'Error',
        message,
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      addToast({
        type: 'info',
        title: 'All Notifications Marked Read',
        message: 'Your notification inbox has been cleared.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark all as read';
      addToast({
        type: 'error',
        title: 'Error',
        message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete notification';
      addToast({
        type: 'error',
        title: 'Error',
        message,
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_required':
        return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case 'completed':
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'failed':
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'recovered':
        return <RotateCcw className="w-5 h-5 text-cyan-400" />;
      default:
        return <Bell className="w-5 h-5 text-purple-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Notification Center</h1>
            {unreadCount > 0 ? (
              <Badge variant="warning" size="md">
                {unreadCount} UNREAD
              </Badge>
            ) : (
              <Badge variant="success" size="md">
                ALL CAUGHT UP
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time alerts for operator approvals, verified task completions, and autonomous recovery events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-slate-300">
              <CheckCheck className="w-4 h-4 mr-1 text-teal-400" />
              Mark All Read
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={fetchNotifications} className="text-slate-300">
            <RefreshCw className="w-4 h-4 mr-1 text-teal-400" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'all'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white glass border border-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'unread'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white glass border border-slate-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications Feed */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center space-y-4 glass">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Notifications</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {filter === 'unread'
              ? 'You have addressed all pending alerts.'
              : 'Notifications from scheduled tasks and approval gates will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <GlassPanel
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 border transition-all ${
                !n.read
                  ? 'border-teal-500/40 bg-teal-950/10 shadow-[0_0_15px_rgba(20,184,166,0.1)]'
                  : 'border-slate-800/80 bg-slate-900/40'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white tracking-tight">{n.title}</h4>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-teal-400" title="Unread" />}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-xl">{n.message}</p>

                  <p className="text-[11px] text-slate-400 font-mono pt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {n.link && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (!n.read) handleMarkAsRead(n.id);
                      navigate(n.link!);
                    }}
                    className="text-xs"
                  >
                    Take Action
                    <ExternalLink className="w-3.5 h-3.5 ml-1 text-teal-400" />
                  </Button>
                )}

                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(n.id)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Mark Read
                  </Button>
                )}

                <button
                  onClick={() => handleDelete(n.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                  title="Dismiss notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
