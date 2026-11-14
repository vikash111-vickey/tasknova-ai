import React from 'react';
import { cn } from '../../lib/utils';

export interface StatusDotProps {
  status?: 'idle' | 'active' | 'success' | 'warning' | 'error';
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status = 'active',
  pulse = true,
  size = 'md',
  className,
}) => {
  const colors = {
    idle: 'bg-slate-400',
    active: 'bg-teal-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-rose-400',
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <span className={cn('relative inline-flex items-center justify-center', sizes[size], className)}>
      {pulse && status !== 'idle' && (
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            colors[status]
          )}
        />
      )}
      <span className={cn('relative inline-flex rounded-full', sizes[size], colors[status])} />
    </span>
  );
};
