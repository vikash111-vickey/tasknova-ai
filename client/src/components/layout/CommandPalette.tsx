import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  GitBranch,
  PlayCircle,
  Cpu,
  Plug,
  Database,
  BarChart3,
  ScrollText,
  Settings,
  Home,
  ArrowRight,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  category: string;
}

const COMMANDS: CommandItem[] = [
  {
    id: 'landing',
    title: 'Landing Page',
    description: 'Overview, hero visual, and technical architecture',
    icon: <Home className="w-4 h-4" />,
    path: '/',
    category: 'Overview',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Real-time overview of tasks, agents, and metrics',
    icon: <LayoutDashboard className="w-4 h-4" />,
    path: '/dashboard',
    category: 'Core',
  },
  {
    id: 'workflows',
    title: 'Workflows & Tasks',
    description: 'Visual workflow builder and automation plans',
    icon: <GitBranch className="w-4 h-4" />,
    path: '/workflows',
    category: 'Core',
  },
  {
    id: 'executions',
    title: 'Live Executions',
    description: 'Real-time SSE execution stream and step tracer',
    icon: <PlayCircle className="w-4 h-4" />,
    path: '/executions',
    category: 'Core',
  },
  {
    id: 'brain',
    title: 'AI Brain Visualizer',
    description: 'Spatial 3D neural brain state monitor',
    icon: <Cpu className="w-4 h-4" />,
    path: '/brain',
    category: 'Core',
  },
  {
    id: 'connectors',
    title: 'Connectors & Tools',
    description: 'Demo store and live API integrations',
    icon: <Plug className="w-4 h-4" />,
    path: '/connectors',
    category: 'Integrations',
  },
  {
    id: 'store',
    title: 'Data Store',
    description: 'LocalStore JSON database inspection',
    icon: <Database className="w-4 h-4" />,
    path: '/store',
    category: 'Integrations',
  },
  {
    id: 'analytics',
    title: 'Analytics & Metrics',
    description: 'Performance stats and completion graphs',
    icon: <BarChart3 className="w-4 h-4" />,
    path: '/analytics',
    category: 'Intelligence',
  },
  {
    id: 'logs',
    title: 'Audit Logs',
    description: 'Tamper-proof execution and verification proof',
    icon: <ScrollText className="w-4 h-4" />,
    path: '/logs',
    category: 'Intelligence',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Platform keys, models, and storage mode',
    icon: <Settings className="w-4 h-4" />,
    path: '/settings',
    category: 'System',
  },
];

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open handled by parent
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = COMMANDS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            className="relative w-full max-w-xl glass-strong border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
              <Search className="w-5 h-5 text-teal-400 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or jump to page... (ESC to close)"
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                ESC
              </span>
            </div>

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matching destinations found for &quot;{query}&quot;.
                </div>
              ) : (
                filtered.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-teal-500/15 border border-teal-500/30 text-white'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`p-2 rounded-lg ${
                            isSelected
                              ? 'bg-teal-500/20 text-teal-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{item.title}</div>
                          <div className="text-xs text-slate-400">{item.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          {item.category}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
