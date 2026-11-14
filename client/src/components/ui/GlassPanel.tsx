import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface GlassPanelProps extends HTMLMotionProps<'div'> {
  intensity?: 'regular' | 'strong';
  glow?: 'cyan' | 'purple' | 'green' | 'amber' | 'red' | 'none';
  children: React.ReactNode;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, intensity = 'regular', glow = 'none', children, ...props }, ref) => {
    const base = 'rounded-2xl p-6 transition-all duration-300';
    const glassClass = intensity === 'strong' ? 'glass-strong' : 'glass';

    const glowMap = {
      none: '',
      cyan: 'glow-cyan border-cyan-500/20',
      purple: 'glow-purple border-purple-500/20',
      green: 'glow-green border-emerald-500/20',
      amber: 'glow-amber border-amber-500/20',
      red: 'glow-red border-rose-500/20',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(base, glassClass, glowMap[glow], className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';
