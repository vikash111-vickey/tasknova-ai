import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '../../ui/Badge';
import { ShieldCheck, Lock, Hash } from 'lucide-react';

export interface VerificationLayerNodeData {
  verifiedCount: number;
  totalCount: number;
  trustScore: number;
  isAllVerified: boolean;
}

export const VerificationLayerNode = memo(({ data }: NodeProps<VerificationLayerNodeData>) => {
  return (
    <div
      className={`px-4 py-3 rounded-xl border ${
        data.isAllVerified
          ? 'border-emerald-500/60 bg-emerald-950/40 glow-green'
          : 'border-brand-purple/40 bg-purple-950/30'
      } shadow-xl backdrop-blur-md w-64 text-left`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-brand-cyan border border-white"
      />

      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-brand-purple-light text-[10px] font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verification Layer</span>
        </div>
        <Badge variant={data.isAllVerified ? 'success' : 'info'} size="sm">
          {data.isAllVerified ? 'AUDITED' : 'ACTIVE'}
        </Badge>
      </div>

      <div className="text-xs font-semibold text-white">
        Independent Proof Ledger
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1 text-slate-400">
          <Hash className="w-3 h-3 text-brand-cyan" />
          <span>{data.verifiedCount} / {data.totalCount} Verified</span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400 font-bold">
          <Lock className="w-3 h-3" />
          <span>Score: {data.trustScore}%</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-emerald-400 border border-white"
      />
    </div>
  );
});

VerificationLayerNode.displayName = 'VerificationLayerNode';
