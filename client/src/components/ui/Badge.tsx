import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'demo' | 'accent';
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'sm',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center font-mono font-medium rounded border select-none transition-all duration-300';

  const variants = {
    default: 'bg-[#1c1c1c] text-[#cfcfcf] border-[#2a2a2a]',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    error: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    info: 'bg-[#aa88ff]/10 text-[#aa88ff] border-[#aa88ff]/30',
    demo: 'bg-[#1c1c1c] text-[#aa88ff] border-[#2a2a2a] tracking-wider shadow-sm',
    accent: 'bg-[#aa88ff] text-black border-transparent font-bold shadow-glow-purple',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 uppercase tracking-wide',
    md: 'text-xs px-2.5 py-1 uppercase tracking-wide',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {variant === 'demo' && !children ? 'DEMO' : children}
    </span>
  );
};
