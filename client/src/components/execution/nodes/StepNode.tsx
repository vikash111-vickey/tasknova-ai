import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '../../ui/Badge';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export interface StepNodeData {
  stepId: string;
  name: string;
  tool: string;
  action: string;
  status: string;
  verificationStatus?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  requiresApproval?: boolean;
  isSelected?: boolean;
}

export const StepNode = memo(({ data }: NodeProps<StepNodeData>) => {
  const status = (data.status || 'pending').toLowerCase();
  const vStatus = data.verificationStatus;

  // Node colors: grey pending, blue running, green verified, amber awaiting approval, red failed
  let borderColor = 'border-white/10';
  let bgColor = 'bg-surface-900/90';
  let glowClass = '';
  let statusText = 'PENDING';
  let statusIcon = <Clock className="w-3.5 h-3.5 text-slate-500" />;

  if (vStatus === 'VERIFIED' || status === 'completed') {
    borderColor = 'border-emerald-500/50';
    bgColor = 'bg-emerald-950/40';
    glowClass = 'glow-green';
    statusText = vStatus === 'VERIFIED' ? 'VERIFIED' : 'COMPLETED';
    statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  } else if (status === 'running') {
    borderColor = 'border-brand-cyan/60';
    bgColor = 'bg-cyan-950/40';
    glowClass = 'glow-cyan animate-pulse';
    statusText = 'RUNNING';
    statusIcon = <Clock className="w-3.5 h-3.5 text-brand-cyan animate-spin" />;
  } else if (status === 'awaiting_approval') {
    borderColor = 'border-amber-500/60';
    bgColor = 'bg-amber-950/40';
    glowClass = 'glow-amber';
    statusText = 'AWAITING APPROVAL';
    statusIcon = <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-bounce" />;
  } else if (status === 'failed' || vStatus === 'FAILED') {
    borderColor = 'border-rose-500/60';
    bgColor = 'bg-rose-950/40';
    glowClass = 'glow-red';
    statusText = 'FAILED';
    statusIcon = <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
  }

  return (
    <div
      className={`px-4 py-3 rounded-xl border ${borderColor} ${bgColor} ${glowClass} shadow-xl backdrop-blur-md w-64 text-left transition-all hover:scale-105 cursor-pointer ${
        data.isSelected ? 'ring-2 ring-brand-purple' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-brand-cyan border border-white"
      />

      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-brand-purple-light" />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {data.tool}.{data.action}
          </span>
        </div>
        <Badge variant="demo" size="sm">DEMO</Badge>
      </div>

      <div className="text-xs font-semibold text-white truncate mb-2">
        {data.name}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
        <div className="flex items-center gap-1 font-mono">
          {statusIcon}
          <span className="font-semibold">{statusText}</span>
        </div>

        {vStatus === 'VERIFIED' && (
          <div className="flex items-center gap-1 text-emerald-400 font-mono">
            <ShieldCheck className="w-3 h-3" />
            <span>AUDITED</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-brand-purple border border-white"
      />
    </div>
  );
});

StepNode.displayName = 'StepNode';
