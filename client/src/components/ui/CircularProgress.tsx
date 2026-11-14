import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CircularProgressProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: 'cyan' | 'purple' | 'green' | 'amber' | 'red';
  className?: string;
  showText?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 64,
  strokeWidth = 6,
  color = 'cyan',
  className,
  showText = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorStyles = {
    cyan: 'text-teal-400 stroke-current',
    purple: 'text-purple-400 stroke-current',
    green: 'text-emerald-400 stroke-current',
    amber: 'text-amber-400 stroke-current',
    red: 'text-rose-400 stroke-current',
  };

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-slate-800"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('transition-all', colorStyles[color])}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span className="absolute font-mono text-xs font-semibold text-slate-200">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};
