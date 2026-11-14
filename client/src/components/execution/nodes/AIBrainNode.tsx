import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { AIBrain2D } from '../../brain/AIBrain2D';
import { BrainState } from '../../brain/AIBrainTypes';
import { Badge } from '../../ui/Badge';
import { Cpu } from 'lucide-react';

export interface AIBrainNodeData {
  state: BrainState;
  label?: string;
}

export const AIBrainNode = memo(({ data }: NodeProps<AIBrainNodeData>) => {
  return (
    <div className="p-3 rounded-2xl border border-brand-cyan/40 bg-surface-900/90 glow-cyan shadow-2xl backdrop-blur-md flex flex-col items-center justify-center w-52 text-center">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-brand-cyan border border-white"
      />

      <div className="flex items-center gap-1.5 mb-2 text-brand-cyan text-[10px] font-semibold uppercase tracking-wider">
        <Cpu className="w-3.5 h-3.5" />
        <span>Cognitive Core</span>
      </div>

      <div className="h-28 w-28 flex items-center justify-center">
        <AIBrain2D state={data.state || 'idle'} size={110} />
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <Badge variant={data.state === 'failed' ? 'error' : 'info'} size="sm">
          STATE: {String(data.state).toUpperCase()}
        </Badge>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-brand-purple border border-white"
      />
    </div>
  );
});

AIBrainNode.displayName = 'AIBrainNode';
