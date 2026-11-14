export type BrainState =
  | 'idle'
  | 'thinking'
  | 'planning'
  | 'executing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'recovering';

export interface AIBrainProps {
  state?: BrainState;
  size?: number | string;
  force2D?: boolean;
  className?: string;
}

export interface StateColors {
  primary: string;
  secondary: string;
  glow: string;
  speed: number;
}

export const STATE_COLOR_CONFIG: Record<BrainState, StateColors> = {
  idle: {
    primary: '#06b6d4', // cyan
    secondary: '#8b5cf6', // purple
    glow: 'rgba(6, 182, 212, 0.4)',
    speed: 0.6,
  },
  thinking: {
    primary: '#a855f7', // purple
    secondary: '#ec4899', // pink
    glow: 'rgba(168, 85, 247, 0.6)',
    speed: 1.8,
  },
  planning: {
    primary: '#3b82f6', // blue
    secondary: '#06b6d4', // cyan
    glow: 'rgba(59, 130, 246, 0.5)',
    speed: 1.0,
  },
  executing: {
    primary: '#14b8a6', // teal
    secondary: '#06b6d4', // cyan
    glow: 'rgba(20, 184, 166, 0.7)',
    speed: 2.2,
  },
  verifying: {
    primary: '#0d9488', // focused teal
    secondary: '#10b981', // emerald
    glow: 'rgba(13, 148, 136, 0.6)',
    speed: 1.2,
  },
  completed: {
    primary: '#10b981', // green
    secondary: '#059669', // deep green
    glow: 'rgba(16, 185, 129, 0.6)',
    speed: 0.5,
  },
  failed: {
    primary: '#f43f5e', // rose/red
    secondary: '#dc2626', // deep red
    glow: 'rgba(244, 63, 94, 0.6)',
    speed: 0.8,
  },
  recovering: {
    primary: '#f59e0b', // amber
    secondary: '#d97706', // deep amber
    glow: 'rgba(245, 158, 11, 0.7)',
    speed: 1.6,
  },
};
