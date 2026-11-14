import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-mono font-medium rounded-md transition-all duration-300 ease-axon focus:outline-none focus:ring-2 focus:ring-[#aa88ff]/50 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary:
        'bg-[#aa88ff] hover:bg-[#c4b5fd] text-black font-semibold shadow-glow-purple active:bg-[#9066f0]',
      secondary:
        'bg-[#1c1c1c] hover:bg-[#252528] text-[#dddddd] border border-[#2a2a2a] hover:border-[#aa88ff]/30',
      ghost:
        'bg-transparent hover:bg-[#1c1c1c] text-[#8a8a8a] hover:text-white',
      danger:
        'bg-rose-600 hover:bg-rose-500 text-white shadow-sm hover:shadow-glow-red active:bg-rose-700',
      outline:
        'border border-[#2a2a2a] hover:border-[#aa88ff]/60 bg-transparent text-[#dddddd] hover:bg-[#1c1c1c]',
      glass:
        'glass hover:bg-[#1c1c1c] text-white hover:border-[#aa88ff]/50 shadow-sm',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-2.5 gap-2.5',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={disabled || isLoading ? undefined : { scale: 1.02 }}
        whileTap={disabled || isLoading ? undefined : { scale: 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
