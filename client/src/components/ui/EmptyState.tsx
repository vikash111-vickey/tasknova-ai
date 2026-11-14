import React from 'react';
import { motion } from 'framer-motion';
import { Layers, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  phaseBadge?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  phaseBadge,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl glass border border-slate-800/80 max-w-lg mx-auto',
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-4 shadow-glow-cyan">
        {icon || <Layers className="w-8 h-8" />}
      </div>

      {phaseBadge && (
        <Badge variant="demo" size="sm" className="mb-3">
          {phaseBadge}
        </Badge>
      )}

      <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
      <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" size="sm" className="mt-6 gap-2">
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
};
