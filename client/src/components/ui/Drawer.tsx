import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './IconButton';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  side?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  side = 'left',
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const slideVariants = {
    hidden: { x: side === 'left' ? '-100%' : '100%' },
    visible: { x: 0 },
    exit: { x: side === 'left' ? '-100%' : '100%' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Drawer content */}
          <motion.div
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'relative z-10 w-full max-w-xs sm:max-w-sm h-full glass-strong border-r border-slate-800 p-6 flex flex-col justify-between shadow-2xl',
              side === 'right' && 'ml-auto border-l border-r-0',
              className
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
              <IconButton
                aria-label="Close drawer"
                onClick={onClose}
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
