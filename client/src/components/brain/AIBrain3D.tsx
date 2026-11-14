import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AIBrainProps, BrainState, STATE_COLOR_CONFIG } from './AIBrainTypes';
import { cn } from '../../lib/utils';

interface BrainSceneProps {
  state: BrainState;
}

const BrainScene: React.FC<BrainSceneProps> = ({ state }) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const config = STATE_COLOR_CONFIG[state];

  // Particle positions: 160 particles orbiting the core (well under 300 limit)
  const [particlePositions] = useMemo(() => {
    const count = 160;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 2.0 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return [positions];
  }, []);

  useFrame((clockState, delta) => {
    const elapsed = clockState.clock.getElapsedTime();
    const speed = config.speed;
    const { pointer } = clockState;

    // Smooth cursor gaze parallax tilt
    if (groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -pointer.y * 0.28,
        delta * 3.5
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        pointer.x * 0.38,
        delta * 3.5
      );
    }

    // Rings rotation
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 0.6 * speed;
      ring1Ref.current.rotation.y += delta * 0.4 * speed;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y += delta * 0.5 * speed;
      ring2Ref.current.rotation.z += delta * 0.7 * speed;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x -= delta * 0.4 * speed;
      ring3Ref.current.rotation.z += delta * 0.5 * speed;
    }

    // Particle orbit rotation
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.3 * speed;
      particlesRef.current.rotation.x += delta * 0.1 * speed;
    }

    // Core pulsing animation
    if (coreRef.current) {
      if (state === 'thinking') {
        const pulse = 1 + Math.sin(elapsed * 6) * 0.15;
        coreRef.current.scale.set(pulse, pulse, pulse);
      } else if (state === 'executing') {
        const pulse = 1 + Math.sin(elapsed * 4) * 0.08;
        coreRef.current.scale.set(pulse, pulse, pulse);
      } else if (state === 'failed') {
        const pulse = 1 + Math.sin(elapsed * 3) * 0.12;
        coreRef.current.scale.set(pulse, pulse, pulse);
      } else {
        const pulse = 1 + Math.sin(elapsed * 1.5) * 0.04;
        coreRef.current.scale.set(pulse, pulse, pulse);
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.5} color={config.primary} />
      <pointLight position={[-5, -5, -5]} intensity={0.8} color={config.secondary} />

      <group ref={groupRef}>
        {/* Core glowing sphere */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[1.15, 32, 32]} />
          <meshStandardMaterial
            color={config.primary}
            emissive={config.primary}
            emissiveIntensity={state === 'thinking' || state === 'executing' ? 0.9 : 0.6}
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>

        {/* Rotating Ring 1 */}
        <mesh ref={ring1Ref} rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[1.9, 0.025, 16, 80]} />
          <meshBasicMaterial color={config.primary} transparent opacity={0.7} />
        </mesh>

        {/* Rotating Ring 2 */}
        <mesh ref={ring2Ref} rotation={[0, Math.PI / 3, Math.PI / 6]}>
          <torusGeometry args={[2.2, 0.02, 16, 80]} />
          <meshBasicMaterial color={config.secondary} transparent opacity={0.6} />
        </mesh>

        {/* Rotating Ring 3 */}
        <mesh ref={ring3Ref} rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
          <torusGeometry args={[2.4, 0.018, 16, 80]} />
          <meshBasicMaterial color={config.primary} transparent opacity={0.5} />
        </mesh>

        {/* Small Particle Orbit (< 300 points) */}
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particlePositions.length / 3}
              array={particlePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.06}
            color={config.secondary}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </>
  );
};

export const AIBrain3D: React.FC<AIBrainProps & { isVisible?: boolean }> = ({
  state = 'idle',
  size = 280,
  className,
  isVisible = true,
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={cn('relative select-none pointer-events-none', className)}
      style={{ width: dimension, height: dimension }}
      role="img"
      aria-label={`AI Brain in ${state} state (3D visual)`}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        frameloop={isVisible ? 'always' : 'demand'}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      >
        <BrainScene state={state} />
      </Canvas>
    </div>
  );
};

export default AIBrain3D;
