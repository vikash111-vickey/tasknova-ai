import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'cyan' | 'purple' | 'green' | 'amber' | 'red';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = 'cyan',
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors = {
    cyan: 'bg-teal-500 shadow-glow-cyan',
    purple: 'bg-purple-500 shadow-glow-purple',
    green: 'bg-emerald-500 shadow-glow-green',
    amber: 'bg-amber-500 shadow-glow-amber',
    red: 'bg-rose-500 shadow-glow-red',
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="font-medium text-slate-300">{label}</span>}
          {showPercentage && <span className="text-slate-400 font-mono">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full', colors[color])}
        />
      </div>
    </div>
  );
};
