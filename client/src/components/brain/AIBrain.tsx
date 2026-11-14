import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { AIBrainProps } from './AIBrainTypes';
import { AIBrain2D } from './AIBrain2D';

const LazyAIBrain3D = lazy(() => import('./AIBrain3D'));

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const AIBrain: React.FC<AIBrainProps> = ({
  state = 'idle',
  size = 280,
  force2D = false,
  className,
}) => {
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasWebGL(checkWebGLSupport());

    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionQuery.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', handleMotionChange);
      }

      return () => {
        if (motionQuery.removeEventListener) {
          motionQuery.removeEventListener('change', handleMotionChange);
        }
      };
    }
  }, []);

  // IntersectionObserver to pause frameloop when offscreen
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const shouldUse2D = force2D || !hasWebGL || prefersReducedMotion;

  return (
    <div ref={containerRef} className={className}>
      {shouldUse2D ? (
        <AIBrain2D state={state} size={size} />
      ) : (
        <Suspense fallback={<AIBrain2D state={state} size={size} />}>
          <LazyAIBrain3D state={state} size={size} isVisible={isVisible} />
        </Suspense>
      )}
    </div>
  );
};

export default AIBrain;
