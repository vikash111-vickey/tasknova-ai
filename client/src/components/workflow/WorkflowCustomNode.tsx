import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Play,
  Mail,
  HardDrive,
  Calendar,
  FileText,
  CreditCard,
  Globe,
  ShieldAlert,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

export interface WorkflowNodeData {
  label: string;
  category: 'trigger' | 'action' | 'logic' | 'end';
  tool?: string;
  action?: string;
  requires_approval?: boolean;
  risk_level?: 'low' | 'medium' | 'high';
  description?: string;
  parameters?: Record<string, unknown>;
}

const getIcon = (data: WorkflowNodeData) => {
  if (data.category === 'trigger') return <Play className="w-4 h-4 text-emerald-400" />;
  if (data.category === 'end') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (data.category === 'logic') {
    if (data.requires_approval) return <ShieldAlert className="w-4 h-4 text-amber-400" />;
    return <Clock className="w-4 h-4 text-cyan-400" />;
  }

  const tool = (data.tool || '').toLowerCase();
  if (tool.includes('gmail') || tool.includes('email')) return <Mail className="w-4 h-4 text-purple-400" />;
  if (tool.includes('drive')) return <HardDrive className="w-4 h-4 text-blue-400" />;
  if (tool.includes('calendar')) return <Calendar className="w-4 h-4 text-amber-400" />;
  if (tool.includes('document') || tool.includes('report')) return <FileText className="w-4 h-4 text-teal-400" />;
  if (tool.includes('stripe')) return <CreditCard className="w-4 h-4 text-indigo-400" />;
  if (tool.includes('web')) return <Globe className="w-4 h-4 text-cyan-400" />;

  return <HelpCircle className="w-4 h-4 text-slate-400" />;
};

const getCategoryBadgeVariant = (cat: string) => {
  switch (cat) {
    case 'trigger':
      return 'success';
    case 'logic':
      return 'warning';
    case 'end':
      return 'info';
    default:
      return 'default';
  }
};

export const WorkflowCustomNode: React.FC<NodeProps<WorkflowNodeData>> = memo(({ data, selected }) => {
  const isTrigger = data.category === 'trigger';
  const isEnd = data.category === 'end';

  return (
    <div
      className={cn(
        'w-64 rounded-xl border p-3.5 transition-all duration-200 select-none text-left shadow-lg backdrop-blur-md',
        selected
          ? 'bg-slate-900/95 border-teal-500/80 shadow-[0_0_20px_rgba(20,184,166,0.3)] ring-1 ring-teal-400'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/90'
      )}
    >
      {/* Target handle (except triggers) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-teal-400 border-2 border-slate-950 -top-1.5 transition-transform hover:scale-125"
        />
      )}

      {/* Header: Icon + Category + Approval Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-800/90 flex items-center justify-center border border-slate-700/60">
            {getIcon(data)}
          </div>
          <Badge variant={getCategoryBadgeVariant(data.category)} size="sm">
            {data.category.toUpperCase()}
          </Badge>
        </div>

        {data.requires_approval && (
          <Badge variant="warning" size="sm" className="gap-1 animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            GATE
          </Badge>
        )}
      </div>

      {/* Title & Action */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-slate-100 truncate tracking-tight">{data.label}</h4>
        {data.action && (
          <p className="text-xs font-mono text-slate-400 truncate bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/80">
            {data.action}
          </p>
        )}
      </div>

      {/* Footer: Tool + Risk Level */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate max-w-[120px]">{data.tool || 'Platform Engine'}</span>
        {data.risk_level && (
          <span
            className={cn(
              'font-medium uppercase text-[10px] px-1.5 py-0.5 rounded',
              data.risk_level === 'high'
                ? 'text-red-400 bg-red-950/40 border border-red-800/50'
                : data.risk_level === 'medium'
                ? 'text-amber-400 bg-amber-950/40 border border-amber-800/50'
                : 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50'
            )}
          >
            {data.risk_level}
          </span>
        )}
      </div>

      {/* Source handle (except end) */}
      {!isEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 bg-teal-400 border-2 border-slate-950 -bottom-1.5 transition-transform hover:scale-125"
        />
      )}
    </div>
  );
});

WorkflowCustomNode.displayName = 'WorkflowCustomNode';
export default WorkflowCustomNode;
