import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'glass' | 'interactive' | 'outline';
  glow?: 'cyan' | 'purple' | 'green' | 'amber' | 'red' | 'none';
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', glow = 'none', children, ...props }, ref) => {
    const base = 'rounded-xl p-6 transition-all duration-300 ease-axon border';

    const variants = {
      default: 'bg-[#0a0a0a]/90 backdrop-blur-md border-[#2a2a2a] text-[#dddddd]',
      glass: 'glass text-[#dddddd]',
      interactive:
        'bg-[#0a0a0a]/90 backdrop-blur-md border-[#2a2a2a] text-[#dddddd] hover:border-[#aa88ff]/50 hover:bg-[#121216] cursor-pointer shadow-sm hover:shadow-glow-purple',
      outline: 'bg-transparent border-[#2a2a2a] text-[#dddddd]',
    };

    const glowStyles = {
      none: '',
      cyan: 'hover:shadow-glow-cyan hover:border-cyan-500/30',
      purple: 'hover:shadow-glow-purple hover:border-[#aa88ff]/40',
      green: 'hover:shadow-glow-green hover:border-emerald-500/30',
      amber: 'hover:shadow-glow-amber hover:border-amber-500/30',
      red: 'hover:shadow-glow-red hover:border-rose-500/30',
    };

    return (
      <motion.div
        ref={ref}
        whileHover={variant === 'interactive' ? { y: -2 } : undefined}
        className={cn(base, variants[variant], glowStyles[glow], className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
