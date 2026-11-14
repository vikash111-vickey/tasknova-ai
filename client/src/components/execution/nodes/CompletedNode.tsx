import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '../../ui/Badge';
import { CheckCircle2, Flag } from 'lucide-react';

export interface CompletedNodeData {
  isCompleted: boolean;
  title?: string;
}

export const CompletedNode = memo(({ data }: NodeProps<CompletedNodeData>) => {
  return (
    <div
      className={`px-4 py-3 rounded-xl border ${
        data.isCompleted
          ? 'border-emerald-500/80 bg-emerald-950/60 glow-green'
          : 'border-white/10 bg-surface-900/60'
      } shadow-xl backdrop-blur-md w-56 text-left transition-all`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-emerald-400 border border-white"
      />

      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
          <Flag className="w-3.5 h-3.5" />
          <span>Workflow Target</span>
        </div>
        <Badge variant={data.isCompleted ? 'success' : 'default'} size="sm">
          {data.isCompleted ? 'SUCCESS' : 'PENDING'}
        </Badge>
      </div>

      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
        <CheckCircle2
          className={`w-4 h-4 ${
            data.isCompleted ? 'text-emerald-400' : 'text-slate-500'
          }`}
        />
        <span>{data.title || 'Completed Objective'}</span>
      </div>
    </div>
  );
});

CompletedNode.displayName = 'CompletedNode';
