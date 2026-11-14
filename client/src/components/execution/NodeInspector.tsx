import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TaskStep, ProofLedgerEntry } from '../../lib/api';
import {
  X,
  ShieldCheck,
  Clock,
  Layers,
  FileCode,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Hash,
} from 'lucide-react';

interface NodeInspectorProps {
  step: TaskStep | null;
  ledgerEntry?: ProofLedgerEntry | null;
  onClose: () => void;
  onViewProof?: () => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  step,
  ledgerEntry,
  onClose,
  onViewProof,
}) => {
  if (!step) return null;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'running':
        return <Badge variant="info">RUNNING</Badge>;
      case 'failed':
        return <Badge variant="error">FAILED</Badge>;
      case 'awaiting_approval':
        return <Badge variant="warning">AWAITING APPROVAL</Badge>;
      default:
        return <Badge variant="default">PENDING</Badge>;
    }
  };

  const getVerificationBadge = (vStatus?: string) => {
    switch (vStatus) {
      case 'VERIFIED':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>VERIFIED</span>
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="error" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>FAILED</span>
          </Badge>
        );
      case 'INCONCLUSIVE':
        return (
          <Badge variant="warning" className="gap-1">
            <HelpCircle className="w-3 h-3" />
            <span>INCONCLUSIVE</span>
          </Badge>
        );
      case 'CHECKING':
        return <Badge variant="info">CHECKING...</Badge>;
      default:
        return <Badge variant="default">PENDING AUDIT</Badge>;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <Card variant="glass" className="border border-white/15 shadow-2xl p-0 overflow-hidden bg-surface-900/95 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surface-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple-light">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white leading-tight">
                {step.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {step.tool}.{step.action}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="demo" size="sm">DEMO</Badge>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-300">
          {/* Status & Verification Row */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-surface-950/60 border border-white/5">
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-semibold block mb-1">
                Execution Status
              </span>
              {getStatusBadge(step.status)}
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-semibold block mb-1">
                Independent Audit
              </span>
              {getVerificationBadge(step.verification_status)}
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-1.5 p-2.5 rounded-lg bg-surface-950/40 border border-white/5 font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 text-[10px] uppercase">
                <Clock className="w-3 h-3 text-brand-cyan" />
                Started:
              </span>
              <span className="text-white">
                {step.startedAt ? new Date(step.startedAt).toLocaleTimeString() : 'Not started'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 text-[10px] uppercase">
                <Clock className="w-3 h-3 text-emerald-400" />
                Completed:
              </span>
              <span className="text-white">
                {step.completedAt ? new Date(step.completedAt).toLocaleTimeString() : 'Pending'}
              </span>
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <span className="text-[10px] uppercase text-slate-500 font-semibold block mb-1">
              DAG Prerequisites
            </span>
            {step.dependencies && step.dependencies.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {step.dependencies.map((dep, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-surface-800 text-[10px] font-mono text-brand-cyan border border-white/5"
                  >
                    {dep}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 italic text-[11px]">Root node (no prerequisites)</span>
            )}
          </div>

          {/* Input Summary */}
          <div>
            <span className="text-[10px] uppercase text-slate-500 font-semibold block mb-1">
              Input Payload (Sanitized)
            </span>
            <pre className="p-2.5 rounded-lg bg-surface-950 font-mono text-[10px] text-slate-300 border border-white/5 max-h-24 overflow-y-auto">
              {JSON.stringify(step.input || {}, null, 2)}
            </pre>
          </div>

          {/* Expected vs Actual Result */}
          <div className="space-y-2">
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-semibold block mb-0.5">
                Expected Result
              </span>
              <div className="p-2 rounded bg-surface-950/60 border border-white/5 text-[11px] text-slate-300">
                {step.expected_output || 'Concrete state output verified by connector'}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-500 font-semibold block mb-0.5">
                Actual Result
              </span>
              <div className="p-2 rounded bg-surface-950/60 border border-white/5 text-[11px] text-emerald-300 font-mono break-all">
                {step.output_ref
                  ? JSON.stringify(step.output_ref)
                  : step.status === 'completed'
                  ? 'Operation accepted and confirmed in provider state'
                  : 'Awaiting execution output'}
              </div>
            </div>
          </div>

          {/* Cryptographic Ledger Evidence Reference */}
          {ledgerEntry && (
            <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/20 space-y-1.5">
              <div className="flex items-center justify-between text-brand-purple-light text-[10px] font-semibold uppercase">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Proof Ledger Anchor
                </span>
                <span>Seq #{ledgerEntry.sequenceNumber}</span>
              </div>
              <div className="font-mono text-[9px] text-slate-400 break-all bg-surface-950/80 p-1.5 rounded">
                <div className="text-slate-500 flex items-center gap-1 mb-0.5">
                  <Hash className="w-2.5 h-2.5" />
                  <span>SHA-256 Record Hash:</span>
                </div>
                <span className="text-brand-cyan">{ledgerEntry.recordHash}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {onViewProof && (
          <div className="p-3 border-t border-white/10 bg-surface-950/60 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewProof}
              className="text-xs gap-1.5 text-brand-purple-light"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Inspect Full Ledger</span>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
