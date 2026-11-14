import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '../../ui/Badge';
import { Terminal, Sparkles } from 'lucide-react';

export interface InstructionNodeData {
  instruction: string;
  objective?: string;
}

export const InstructionNode = memo(({ data }: NodeProps<InstructionNodeData>) => {
  return (
    <div className="px-4 py-3 rounded-xl border border-brand-purple/40 bg-purple-950/40 glow-purple shadow-xl backdrop-blur-md w-72 text-left">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-brand-purple-light text-[10px] font-semibold uppercase tracking-wider">
          <Terminal className="w-3.5 h-3.5" />
          <span>Operator Instruction</span>
        </div>
        <Badge variant="info" size="sm">INPUT</Badge>
      </div>

      <div className="text-xs font-medium text-white line-clamp-3 leading-relaxed">
        {data.instruction}
      </div>

      {data.objective && (
        <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-brand-cyan shrink-0" />
          <span className="truncate">{data.objective}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-brand-purple border border-white"
      />
    </div>
  );
});

InstructionNode.displayName = 'InstructionNode';
