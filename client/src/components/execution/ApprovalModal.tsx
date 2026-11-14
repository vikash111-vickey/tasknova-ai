import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Textarea } from '../ui/Textarea';
import { Approval, api } from '../../lib/api';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  Mail,
  Paperclip,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  approval: Approval | null;
  onActionComplete: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  approval,
  onActionComplete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPayloadJson, setEditedPayloadJson] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);

  // Parse payload properties for display
  const payload = approval?.payload || {};
  const recipient = (payload.to as string) || (payload.recipient as string) || 'recipient@tasknova.local';
  const subject = (payload.subject as string) || (payload.title as string) || 'Executive Report Summary';
  const bodyText = (payload.body as string) || (payload.content as string) || JSON.stringify(payload, null, 2);
  const attachment = (payload.attachmentName as string) || (payload.fileName as string) || (payload.file as string) || 'Weekly_Report.pdf';

  // Expiry countdown timer
  useEffect(() => {
    if (!approval || !isOpen) return;

    if (approval.expiresAt) {
      const expiryTime = new Date(approval.expiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setSecondsRemaining(diff > 0 ? diff : 300);
    } else {
      setSecondsRemaining(300);
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [approval, isOpen]);

  useEffect(() => {
    if (approval?.payload) {
      setEditedPayloadJson(JSON.stringify(approval.payload, null, 2));
    }
    setIsEditing(false);
    setEditError(null);
  }, [approval]);

  if (!approval) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.approveAction(approval.id);
      onActionComplete();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      setEditError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await api.rejectAction(approval.id);
      onActionComplete();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rejection failed';
      setEditError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setEditError(null);
      const parsed = JSON.parse(editedPayloadJson);
      setLoading(true);
      await api.editApprovalPayload(approval.id, parsed);
      setIsEditing(false);
      onActionComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format';
      setEditError(`Cannot save edits: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Human-in-the-Loop Gate: Authorization Required"
      size="lg"
    >
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-300 flex items-center gap-2">
              <span>High-Impact Action Requiring Operator Review</span>
              <Badge variant="demo" size="sm">DEMO</Badge>
            </div>
            <p className="mt-1 text-xs text-amber-200/80">
              The autonomous orchestrator paused execution at step <strong>{approval.stepId}</strong>.
              Review the exact parameters and verify recipient before granting dispatch credentials.
            </p>
          </div>
        </div>

        {/* Action Header & Countdown */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-surface-900/80 border border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Action:</span>
            <Badge variant="info" size="md" className="font-mono text-xs">
              {approval.actionRequired || 'email.send'}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-500/20 px-3 py-1.5 rounded-md">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Time Remaining:</span>
            <span className="font-bold">{formatTimer(secondsRemaining)}</span>
          </div>
        </div>

        {/* Main Details View */}
        {!isEditing ? (
          <div className="space-y-4">
            {/* Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-surface-900/60 border border-white/5">
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Target Recipient</span>
                </div>
                <div className="font-mono text-xs text-white break-all">
                  {recipient}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-900/60 border border-white/5">
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                  <Paperclip className="w-3.5 h-3.5 text-brand-purple" />
                  <span>Verified Attachment</span>
                </div>
                <div className="font-mono text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{attachment}</span>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="p-3 rounded-lg bg-surface-900/60 border border-white/5">
              <div className="text-xs text-slate-400 mb-1">Subject:</div>
              <div className="text-sm font-semibold text-white">{subject}</div>
            </div>

            {/* Full Message Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Full Message Content Preview:</span>
                </span>
                <span className="text-[11px] text-slate-500">Cryptographically bound hash: {approval.payloadHash?.slice(0, 12)}...</span>
              </div>
              <div className="p-4 rounded-xl bg-surface-950/90 border border-white/10 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed selection:bg-brand-purple selection:text-white">
                {bodyText}
              </div>
            </div>
          </div>
        ) : (
          /* JSON / Payload Editor */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Modifying payload will recompute hash and invalidate prior sign-offs.</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white underline text-xs"
              >
                Cancel Editing
              </button>
            </div>
            <Textarea
              value={editedPayloadJson}
              onChange={(e) => setEditedPayloadJson(e.target.value)}
              rows={10}
              className="font-mono text-xs bg-surface-950 text-emerald-300"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                disabled={loading}
              >
                Save Edits (Requires Re-approval)
              </Button>
            </div>
          </div>
        )}

        {editError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {editError}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isEditing && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsEditing(true)}
                disabled={loading}
                className="gap-1.5 text-xs w-full sm:w-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Payload</span>
              </Button>
            )}

            <Button
              variant="danger"
              size="md"
              onClick={handleReject}
              disabled={loading}
              className="gap-1.5 text-xs w-full sm:w-auto"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject</span>
            </Button>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleApprove}
            disabled={loading || secondsRemaining === 0}
            className="gap-2 text-xs w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve and Execute</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
