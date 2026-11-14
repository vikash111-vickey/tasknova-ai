import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  GitBranch,
  PlayCircle,
  Cpu,
  Plug,
  Database,
  BarChart3,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  ShieldCheck,
  UserCheck,
  Calendar,
  FileText,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export interface NavItem {
  id: string;
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Core',
    items: [
      { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'workflow-builder', name: 'Workflows & Tasks', path: '/workflow-builder', icon: <GitBranch className="w-5 h-5" />, badge: 'DAG' },
      { id: 'scheduled-tasks', name: 'Scheduled Tasks', path: '/scheduled-tasks', icon: <Calendar className="w-5 h-5" />, badge: 'CRON' },
      { id: 'executions', name: 'Live Executions', path: '/executions', icon: <PlayCircle className="w-5 h-5" />, badge: 'SSE' },
      { id: 'brain', name: 'AI Brain', path: '/brain', icon: <Cpu className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { id: 'integrations', name: 'Integrations Center', path: '/integrations', icon: <Plug className="w-5 h-5" /> },
      { id: 'store', name: 'Data Store', path: '/store', icon: <Database className="w-5 h-5" />, badge: 'JSON' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'analytics', name: 'Analytics', path: '/analytics', icon: <BarChart3 className="w-5 h-5" /> },
      { id: 'reports', name: 'Reports & Files', path: '/reports', icon: <FileText className="w-5 h-5" /> },
      { id: 'activity-logs', name: 'Activity Logs', path: '/activity-logs', icon: <ScrollText className="w-5 h-5" /> },
      { id: 'notifications', name: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" /> },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'about', name: 'About & Pitch', path: '/about', icon: <Sparkles className="w-5 h-5 text-brand-purple-light" />, badge: 'PITCH' },
      { id: 'profile', name: 'Operator Profile', path: '/profile', icon: <UserCheck className="w-5 h-5" /> },
      { id: 'settings', name: 'Settings & Security', path: '/settings', icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onNavigate,
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (onNavigate) onNavigate();
    navigate(isAuthenticated ? '/profile' : '/login');
  };

  return (
    <aside
      className={cn(
        'h-screen bg-black/95 backdrop-blur-xl border-r border-[#2a2a2a] flex flex-col justify-between transition-all duration-300 ease-axon relative z-40 select-none',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="h-20 flex items-center justify-between px-4 border-b border-[#2a2a2a]">
          <NavLink
            to="/"
            onClick={onNavigate}
            className="flex items-center gap-3.5 overflow-hidden text-decoration-none group"
          >
            {/* 40x40 Geometric Mark from Recreation Brief */}
            <div className="w-10 h-10 shrink-0 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18.5" stroke="#ffffff" strokeWidth="1.6" />
                {/* 8-point geometric star polygon inside */}
                <polygon
                  points="20,7 23.5,15.5 32.5,16 25.5,21.5 28,30 20,25 12,30 14.5,21.5 7.5,16 16.5,15.5"
                  fill="#ffffff"
                />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-mono font-bold text-base tracking-wide text-white uppercase group-hover:text-[#aa88ff] transition-colors duration-300">
                  TASKNOVA
                </span>
                <span className="text-[10px] text-[#8a8a8a] font-mono tracking-widest uppercase mt-0.5">
                  Verifiable Autonomy
                </span>
              </div>
            )}
          </NavLink>

          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex p-1.5 rounded-md text-[#8a8a8a] hover:text-white hover:bg-[#1c1c1c] transition-all duration-300 border border-transparent hover:border-[#2a2a2a]"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[11px] font-mono font-medium text-[#8a8a8a] uppercase tracking-wider">
                  [{group.title.toLowerCase()}]
                </div>
              )}
              {group.items.map((item) => {
                const linkContent = (
                  <NavLink
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono tracking-wide transition-all duration-300 group',
                        isActive
                          ? 'bg-[#aa88ff]/15 text-[#aa88ff] font-semibold border border-[#aa88ff]/40 shadow-glow-purple'
                          : 'text-[#8a8a8a] hover:text-[#dddddd] hover:bg-[#1c1c1c] border border-transparent hover:border-[#2a2a2a]'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div
                            layoutId="activeNavIndicator"
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#aa88ff] shadow-glow-purple"
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                          />
                        )}
                        <span className="shrink-0">{item.icon}</span>
                        {!isCollapsed && (
                          <div className="flex items-center justify-between w-full overflow-hidden">
                            <span className="truncate uppercase">{item.name}</span>
                            {item.badge && (
                              <Badge variant="demo" size="sm" className="ml-2 py-0 px-1.5 text-[9px] bg-[#1c1c1c] border-[#2a2a2a] text-[#cfcfcf]">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.id} content={item.name} position="right">
                      {linkContent}
                    </Tooltip>
                  );
                }

                return <div key={item.id}>{linkContent}</div>;
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* User Profile at Bottom */}
      <div className="p-3 border-t border-[#2a2a2a]">
        <button
          onClick={handleProfileClick}
          className={cn(
            'w-full flex items-center gap-3 p-2 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] hover:border-[#aa88ff]/50 transition-all duration-300 text-left',
            isCollapsed && 'justify-center p-2'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-[#aa88ff] shrink-0 font-mono text-xs">
            <User className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-mono font-medium text-white truncate flex items-center gap-1.5">
                <span>{user?.fullName || 'Demo Operator'}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#aa88ff] shrink-0" />
              </div>
              <div className="text-[10px] font-mono text-[#8a8a8a] truncate">
                {user?.email || 'demo@tasknova.local'}
              </div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
