import React from 'react';
import { motion } from 'framer-motion';
import { AIBrainProps, STATE_COLOR_CONFIG } from './AIBrainTypes';
import { cn } from '../../lib/utils';

export const AIBrain2D: React.FC<AIBrainProps> = ({
  state = 'idle',
  size = 280,
  className,
}) => {
  const config = STATE_COLOR_CONFIG[state];
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={cn('relative flex items-center justify-center select-none', className)}
      style={{ width: dimension, height: dimension }}
      role="img"
      aria-label={`AI Brain in ${state} state (2D visual)`}
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={`glow-${state}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id={`coreGrad-${state}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="45%" stopColor={config.primary} stopOpacity="0.8" />
            <stop offset="100%" stopColor={config.secondary} stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* Outer Orbit Ring 1 */}
        <motion.ellipse
          cx="100"
          cy="100"
          rx="85"
          ry="32"
          fill="none"
          stroke={config.primary}
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeOpacity="0.6"
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 18 / config.speed,
            ease: 'linear',
          }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Orbit Ring 2 (Tilted) */}
        <motion.ellipse
          cx="100"
          cy="100"
          rx="75"
          ry="40"
          fill="none"
          stroke={config.secondary}
          strokeWidth="1.5"
          strokeDasharray="8 4"
          strokeOpacity="0.5"
          transform="rotate(60 100 100)"
          animate={{ rotate: [60, 420] }}
          transition={{
            repeat: Infinity,
            duration: 14 / config.speed,
            ease: 'linear',
          }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Orbit Ring 3 (Opposite tilt) */}
        <motion.ellipse
          cx="100"
          cy="100"
          rx="70"
          ry="35"
          fill="none"
          stroke={config.primary}
          strokeWidth="1.2"
          strokeDasharray="2 4"
          strokeOpacity="0.4"
          transform="rotate(-50 100 100)"
          animate={{ rotate: [-50, -410] }}
          transition={{
            repeat: Infinity,
            duration: 12 / config.speed,
            ease: 'linear',
          }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Geometric nodes for planning/executing */}
        {state === 'planning' || state === 'executing' ? (
          <g>
            {[0, 60, 120, 180, 240, 300].map((deg, idx) => {
              const rad = (deg * Math.PI) / 180;
              const x = 100 + 55 * Math.cos(rad);
              const y = 100 + 55 * Math.sin(rad);
              return (
                <g key={idx}>
                  <line
                    x1="100"
                    y1="100"
                    x2={x}
                    y2={y}
                    stroke={config.secondary}
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                  <circle cx={x} cy={y} r="3" fill={config.primary} />
                </g>
              );
            })}
          </g>
        ) : null}

        {/* Ambient Halo */}
        <motion.circle
          cx="100"
          cy="100"
          r="48"
          fill={config.glow}
          filter={`url(#glow-${state})`}
          animate={
            state === 'thinking' || state === 'failed'
              ? { scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }
              : { scale: [1, 1.08, 1], opacity: [0.4, 0.6, 0.4] }
          }
          transition={{
            repeat: Infinity,
            duration: state === 'thinking' ? 1.2 : 2.5,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Core Sphere */}
        <circle
          cx="100"
          cy="100"
          r="34"
          fill={`url(#coreGrad-${state})`}
          filter={`url(#glow-${state})`}
        />

        {/* Inner Core Highlight */}
        <circle cx="94" cy="94" r="8" fill="#ffffff" opacity="0.6" />
      </svg>
    </div>
  );
};
