import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '../../ui/Badge';
import {
  Mail,
  HardDrive,
  Calendar,
  FileText,
  CreditCard,
  ShoppingBag,
  Globe,
  Radio,
} from 'lucide-react';

export interface AppConnectorNodeData {
  app: string;
  label: string;
  isActive: boolean;
}

export const AppConnectorNode = memo(({ data }: NodeProps<AppConnectorNodeData>) => {
  const getAppIcon = (app: string) => {
    switch (app.toLowerCase()) {
      case 'gmail':
      case 'email':
        return <Mail className="w-4 h-4 text-rose-400" />;
      case 'drive':
        return <HardDrive className="w-4 h-4 text-amber-400" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'document':
      case 'documents':
      case 'reports':
        return <FileText className="w-4 h-4 text-brand-cyan" />;
      case 'stripe':
        return <CreditCard className="w-4 h-4 text-purple-400" />;
      case 'store':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      default:
        return <Globe className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div
      className={`px-3 py-2.5 rounded-xl border ${
        data.isActive
          ? 'border-brand-cyan bg-cyan-950/60 glow-cyan animate-pulse'
          : 'border-white/10 bg-surface-900/80'
      } shadow-lg backdrop-blur-md flex items-center gap-2.5 w-44 transition-all`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 bg-brand-cyan border border-white"
      />

      <div className="w-7 h-7 rounded-lg bg-surface-950/80 border border-white/5 flex items-center justify-center shrink-0">
        {getAppIcon(data.app)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-white truncate">
          {data.label}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="demo" size="sm">DEMO</Badge>
          {data.isActive && (
            <span className="flex items-center gap-1 text-[9px] text-brand-cyan font-mono font-bold animate-pulse">
              <Radio className="w-2.5 h-2.5" />
              <span>ACTIVE</span>
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-brand-purple border border-white"
      />
    </div>
  );
});

AppConnectorNode.displayName = 'AppConnectorNode';
