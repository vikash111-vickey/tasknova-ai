import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  ListOrdered,
  Lock,
} from 'lucide-react';

export interface StudyItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  aim: string;
  objective: string;
  info: string;
  task: string[];
  result: string;
  actionPrompt: string;
  badge: string;
}

interface StudyDetailModalProps {
  study: StudyItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudyDetailModal: React.FC<StudyDetailModalProps> = ({ study, isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!study) return null;

  const handleLaunch = () => {
    onClose();
    navigate(`/dashboard?prompt=${encodeURIComponent(study.actionPrompt)}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`RESEARCH STUDY ${study.tag} — ${study.title.toUpperCase()}`}
      size="lg"
      className="bg-[#0a0a0a] border border-[#2a2a2a] text-[#dddddd] font-mono"
    >
      <div className="space-y-6 text-xs leading-relaxed max-h-[75vh] overflow-y-auto pr-2">
        {/* Header meta */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
          <div>
            <h3 className="text-base font-bold text-white font-mono">{study.title}</h3>
            <p className="text-[11px] text-[#aa88ff]">{study.subtitle}</p>
          </div>
          <Badge variant="demo" size="md">
            {study.badge}
          </Badge>
        </div>

        {/* AIM Block */}
        <div className="p-4 rounded-md bg-[#111116] border border-[#2a2a2a] space-y-1.5">
          <div className="flex items-center gap-2 text-[#aa88ff] font-bold uppercase tracking-wider text-[11px]">
            <Sparkles className="w-4 h-4" />
            <span>[AIM]</span>
          </div>
          <p className="text-[#cccccc]">{study.aim}</p>
        </div>

        {/* OBJECTIVE Block */}
        <div className="p-4 rounded-md bg-[#111116] border border-[#2a2a2a] space-y-1.5">
          <div className="flex items-center gap-2 text-[#aa88ff] font-bold uppercase tracking-wider text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>[OBJECTIVE]</span>
          </div>
          <p className="text-[#cccccc]">{study.objective}</p>
        </div>

        {/* INFO & ARCHITECTURE Block */}
        <div className="p-4 rounded-md bg-[#111116] border border-[#2a2a2a] space-y-1.5">
          <div className="flex items-center gap-2 text-[#aa88ff] font-bold uppercase tracking-wider text-[11px]">
            <Cpu className="w-4 h-4" />
            <span>[INFO &amp; ARCHITECTURE]</span>
          </div>
          <p className="text-[#cccccc]">{study.info}</p>
        </div>

        {/* TASK / WORKFLOW STEPS Block */}
        <div className="p-4 rounded-md bg-[#050508] border border-[#2a2a2a] space-y-2">
          <div className="flex items-center gap-2 text-[#aa88ff] font-bold uppercase tracking-wider text-[11px]">
            <ListOrdered className="w-4 h-4" />
            <span>[TASK &amp; WORKFLOW EXECUTION STEPS]</span>
          </div>
          <div className="space-y-2 pt-1">
            {study.task.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded bg-[#0a0a0a] border border-[#1f1f26] text-[11px]"
              >
                <span className="px-1.5 py-0.5 rounded bg-[#1c1c1c] text-[#aa88ff] font-bold text-[10px]">
                  0{idx + 1}
                </span>
                <span className="text-[#dddddd] font-mono">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RESULT & PROOF Block */}
        <div className="p-4 rounded-md bg-[#0d1410] border border-emerald-900/40 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>[RESULT &amp; CRYPTOGRAPHIC PROOF]</span>
          </div>
          <p className="text-emerald-200/90">{study.result}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#2a2a2a]">
          <div className="text-[11px] text-[#8a8a8a] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#aa88ff]" />
            <span>Deterministic verification verified</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-1 sm:flex-none">
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleLaunch}
              className="flex-1 sm:flex-none gap-2 bg-[#aa88ff] text-black font-bold uppercase shadow-glow-purple px-5"
            >
              <span>Launch This Workflow</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StudyDetailModal;
