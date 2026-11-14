import React, { useState } from 'react';
import { HelpCircle, Send, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

export interface ClarificationFormProps {
  questions: string[];
  missingInfo: string[];
  onSubmit: (clarifications: Record<string, string>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ClarificationForm: React.FC<ClarificationFormProps> = ({
  questions,
  missingInfo,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleInputChange = (questionIdx: number, val: string) => {
    setAnswers((prev) => ({
      ...prev,
      [`q_${questionIdx}`]: val,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <div className="p-5 rounded-2xl glass-strong border border-amber-500/40 shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Clarification Required</h3>
              <Badge variant="warning" size="sm">
                Action Needed
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              The AI Planner needs a few more details before safely constructing an execution DAG.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded text-slate-400 hover:text-white transition-colors"
          aria-label="Dismiss questions"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {missingInfo.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-amber-300/90 space-y-1">
          <span className="font-semibold text-amber-400">Missing essentials:</span>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
            {missingInfo.map((info, idx) => (
              <li key={idx}>{info}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {questions.map((q, idx) => (
          <div key={idx}>
            <Input
              label={`Question ${idx + 1}: ${q}`}
              placeholder="Type your clarification..."
              value={answers[`q_${idx}`] || ''}
              onChange={(e) => handleInputChange(idx, e.target.value)}
              required
            />
          </div>
        ))}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            className="gap-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>Submit Clarification &amp; Plan</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
