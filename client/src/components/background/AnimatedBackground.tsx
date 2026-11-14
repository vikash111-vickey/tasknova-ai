import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const AnimatedBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check prefers-reduced-motion
    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    // Probe WebGL availability
    let isWebGLAvailable = false;
    try {
      const probeCanvas = document.createElement('canvas');
      isWebGLAvailable = Boolean(
        window.WebGLRenderingContext &&
          (probeCanvas.getContext('webgl') || probeCanvas.getContext('experimental-webgl'))
      );
    } catch {
      isWebGLAvailable = false;
    }

    // --- 2D Fallback for reduced motion or no WebGL ---
    if (reducedMotion || !isWebGLAvailable) {
      const ctx = canvas.getContext('2d');
      if (!ctx || typeof ctx.fillRect !== 'function') return;

      let width = (canvas.width = window.innerWidth);
      let height = (canvas.height = window.innerHeight);

      const resize2D = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resize2D);

      const particleCount = 45;
      const particles2D = Array.from({ length: particleCount }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        return {
          x,
          y,
          homeX: x,
          homeY: y,
          vx: 0,
          vy: 0,
          radius: Math.random() * 1.5 + 0.8,
          isLavender: Math.random() < 0.25,
        };
      });

      let mouse2D = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, speed: 0 };
      const handleMouseMove2D = (e: MouseEvent) => {
        const dx = e.clientX - mouse2D.prevX;
        const dy = e.clientY - mouse2D.prevY;
        mouse2D.speed = Math.sqrt(dx * dx + dy * dy);
        mouse2D.x = e.clientX;
        mouse2D.y = e.clientY;
        mouse2D.prevX = e.clientX;
        mouse2D.prevY = e.clientY;
      };
      window.addEventListener('mousemove', handleMouseMove2D);

      let animId: number;
      const render2D = () => {
        ctx.clearRect(0, 0, width, height);

        // Faint connecting lines
        for (let i = 0; i < particles2D.length; i++) {
          for (let j = i + 1; j < particles2D.length; j++) {
            const dx = particles2D[i].x - particles2D[j].x;
            const dy = particles2D[i].y - particles2D[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
              ctx.beginPath();
              ctx.strokeStyle = `rgba(170, 136, 255, ${0.14 * (1 - dist / 130)})`;
              ctx.lineWidth = 0.6;
              ctx.moveTo(particles2D[i].x, particles2D[i].y);
              ctx.lineTo(particles2D[j].x, particles2D[j].y);
              ctx.stroke();
            }
          }
        }

        // Draw and update points - ONLY move when mouse interacts
        for (const p of particles2D) {
          if (mouse2D.speed > 0.5) {
            const mdx = p.x - mouse2D.x;
            const mdy = p.y - mouse2D.y;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mdist < 140 && mdist > 0.1) {
              const push = (1 - mdist / 140) * 2.0;
              p.vx += (mdx / mdist) * push;
              p.vy += (mdy / mdist) * push;
            }
          }

          // Spring back to home position
          p.vx += (p.homeX - p.x) * 0.04;
          p.vy += (p.homeY - p.y) * 0.04;
          p.vx *= 0.86;
          p.vy *= 0.86;

          p.x += p.vx;
          p.y += p.vy;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.isLavender ? 'rgba(170, 136, 255, 0.75)' : 'rgba(220, 220, 230, 0.45)';
          ctx.fill();
        }

        mouse2D.speed *= 0.85;

        if (!reducedMotion) {
          animId = requestAnimationFrame(render2D);
        }
      };
      render2D();

      return () => {
        window.removeEventListener('resize', resize2D);
        window.removeEventListener('mousemove', handleMouseMove2D);
        cancelAnimationFrame(animId);
      };
    }

    // --- 3D WebGL Infinite Living Particle Cloud (AXON Recreation Specification) ---
    const scene = new THREE.Scene();
    // Transparent background so particles float in front of the page without hiding content
    scene.background = null;

    // Camera: FOV 30, base position (-1.17, 0, 6) looking at origin (PDF Brief Page 4)
    const baseCameraPos = new THREE.Vector3(-1.17, 0, 6.2);
    const camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.copy(baseCameraPos);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Particle Count: 22,000 points on desktop for fluid 60fps living motion, 7,000 on mobile
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 7000 : 22000;

    const positions = new Float32Array(particleCount * 3);
    const originAngles = new Float32Array(particleCount * 2); // [u, v] for continuous orbital flow
    const baseRadii = new Float32Array(particleCount * 2);    // [rMajor, rMinor]
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const randomAttributes = new Float32Array(particleCount * 3);

    // Colors matching AXON Brief
    const colorWhite = new THREE.Color(0xdadce5);
    const colorSlate = new THREE.Color(0x727588);
    const colorLavender = new THREE.Color(0xaa88ff);
    const colorDiamond = new THREE.Color(0xffffff);

    // Generate Sculpted Organic Torus + Ambient Foreground Living Field
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const isAmbient = i < particleCount * 0.32; // 32% ambient foreground particles across entire viewport

      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;

      let x: number, y: number, z: number;
      let rMajor = 0.72;
      let rMinor = 0.28;

      if (isAmbient) {
        // Dispersed across the entire screen in front of page content
        x = (Math.random() - 0.5) * 2.8;
        y = (Math.random() - 0.5) * 2.0;
        z = (Math.random() - 0.5) * 0.9;
        originAngles[i * 2] = (Math.random() - 0.5) * 0.0004; // slow ambient drift vx
        originAngles[i * 2 + 1] = (Math.random() - 0.5) * 0.0004; // slow ambient drift vy
        baseRadii[i * 2] = 0; // flag for ambient
        baseRadii[i * 2 + 1] = 0;
      } else {
        // Lobed sculpted attractor: major radius 0.72 with harmonic lobe variation
        rMajor = 0.72 + Math.sin(u * 3) * 0.12;
        rMinor = 0.28 + Math.cos(v * 2) * 0.08;

        originAngles[i * 2] = u;
        originAngles[i * 2 + 1] = v;
        baseRadii[i * 2] = rMajor;
        baseRadii[i * 2 + 1] = rMinor;

        // Initial position on the sculpted bent ring
        x = (rMajor + rMinor * Math.cos(v)) * Math.cos(u);
        y = (rMajor + rMinor * Math.cos(v)) * Math.sin(u);
        z = rMinor * Math.sin(v) + Math.sin(u * 2) * 0.12;
      }

      // Jitter for cloud volume
      const jitter = (Math.random() - 0.5) * 0.08;
      positions[idx] = x + jitter;
      positions[idx + 1] = y + jitter;
      positions[idx + 2] = z + jitter;

      velocities[idx] = 0;
      velocities[idx + 1] = 0;
      velocities[idx + 2] = 0;

      // Random attributes for phase, curl-response, and shimmer
      randomAttributes[idx] = Math.random(); // sparkle phase
      randomAttributes[idx + 1] = Math.random() * 0.5 + 0.75; // flow response
      randomAttributes[idx + 2] = Math.random(); // lavender chance

      // 24% sparse lavender accent, 18% bright diamond, remainder white-slate gradient
      const isLavender = Math.random() < 0.24;
      const isBright = Math.random() < 0.18;
      const c = isLavender
        ? colorLavender
        : isBright
        ? colorDiamond
        : colorSlate.clone().lerp(colorWhite, Math.random());

      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    // Capture resting home positions so particles only move upon mouse interaction
    const homePositions = new Float32Array(positions);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circular Matcap point sprite generator
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 64;
    spriteCanvas.height = 64;
    const sCtx = spriteCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(215, 205, 255, 0.9)');
      grad.addColorStop(0.65, 'rgba(170, 136, 255, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 64, 64);
    }
    const spriteTexture = new THREE.CanvasTexture(spriteCanvas);

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.082 : 0.068,
      map: spriteTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    // Group holding the points: position (0.343, 0.16, -1), scale (4.8, 4.8, 5.2)
    // Degrees: (-28.4, 30, 4.92) as specified in Brief Page 4
    const pointsGroup = new THREE.Group();
    pointsGroup.position.set(0.343, 0.16, -0.6);
    const baseRotX = (-28.4 * Math.PI) / 180;
    const baseRotY = (30 * Math.PI) / 180;
    const baseRotZ = (4.92 * Math.PI) / 180;
    pointsGroup.rotation.set(baseRotX, baseRotY, baseRotZ);
    pointsGroup.scale.set(4.6, 4.6, 5.0);

    const pointCloud = new THREE.Points(geometry, material);
    pointsGroup.add(pointCloud);
    scene.add(pointsGroup);

    // Mouse Tracking & Dynamic Fluid Vortex State
    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      prevTargetX: 0,
      prevTargetY: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      lastMoveTime: performance.now(),
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      mouse.targetX = (clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(clientY / window.innerHeight) * 2 + 1;

      const now = performance.now();
      const dt = Math.max(1, now - mouse.lastMoveTime) / 1000;
      mouse.lastMoveTime = now;

      const dX = mouse.targetX - mouse.prevTargetX;
      const dY = mouse.targetY - mouse.prevTargetY;
      mouse.vx = dX / dt;
      mouse.vy = dY / dt;
      mouse.speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);

      mouse.prevTargetX = mouse.targetX;
      mouse.prevTargetY = mouse.targetY;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Raycaster for cursor 3D fluid interaction
    const raycaster = new THREE.Raycaster();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.6);
    const worldCursorIntersect = new THREE.Vector3();
    const localCursor = new THREE.Vector3();

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Camera Gaze Lerp: only responds when mouse is actively moved
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      const targetCamX = baseCameraPos.x - mouse.x * 0.25;
      const targetCamY = baseCameraPos.y + mouse.y * 0.15;
      camera.position.x += (targetCamX - camera.position.x) * 0.03;
      camera.position.y += (targetCamY - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      // Background structure stays completely fixed in space (no autonomous spinning or wobbling)
      pointsGroup.rotation.set(baseRotX, baseRotY, baseRotZ);

      // Mouse motion detection
      const isMouseMoving = mouse.speed > 0.008;

      if (isMouseMoving) {
        raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
        raycaster.ray.intersectPlane(interactionPlane, worldCursorIntersect);
        localCursor.copy(worldCursorIntersect);
        pointsGroup.worldToLocal(localCursor);
      }

      const posArr = geometry.attributes.position.array as Float32Array;

      // Dynamic cursor interaction parameters
      const localRadius = 1.25;
      const localRadiusSq = localRadius * localRadius;
      const localMouseVx = mouse.vx * 0.025;
      const localMouseVy = mouse.vy * 0.025;

      let hasActiveMotion = false;

      // Physics Loop: ONLY moves when the user moves their mouse
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;

        const px = posArr[idx];
        const py = posArr[idx + 1];
        const pz = posArr[idx + 2];

        // 1. Cursor fluid swirl and repulsive wave - ONLY triggered by mouse movement
        if (isMouseMoving) {
          const dx = px - localCursor.x;
          const dy = py - localCursor.y;
          const dz = pz - localCursor.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < localRadiusSq) {
            const dist = Math.sqrt(distSq) + 0.001;
            const falloff = 1.0 - dist / localRadius;
            const falloffSq = falloff * falloff;

            // Swirl around cursor direction
            const vortexStrength = 0.032;
            velocities[idx] += (-dy / dist) * vortexStrength * falloffSq;
            velocities[idx + 1] += (dx / dist) * vortexStrength * falloffSq;

            // Push outward
            const pushStrength = 0.022;
            velocities[idx] += (dx / dist) * pushStrength * falloffSq;
            velocities[idx + 1] += (dy / dist) * pushStrength * falloffSq;
            velocities[idx + 2] += (dz / dist) * (pushStrength * 0.5) * falloffSq;

            // Fluid drag along cursor vector
            const dragForce = Math.min(mouse.speed * 0.04, 0.05) * falloffSq;
            velocities[idx] += localMouseVx * dragForce;
            velocities[idx + 1] += localMouseVy * dragForce;
          }
        }

        // 2. Restoring spring force back to resting home position
        const hx = homePositions[idx];
        const hy = homePositions[idx + 1];
        const hz = homePositions[idx + 2];

        const spring = 0.028;
        velocities[idx] += (hx - px) * spring;
        velocities[idx + 1] += (hy - py) * spring;
        velocities[idx + 2] += (hz - pz) * spring;

        // 3. Strong friction/damping so particles settle into complete stillness immediately
        velocities[idx] *= 0.86;
        velocities[idx + 1] *= 0.86;
        velocities[idx + 2] *= 0.86;

        // 4. Update position only if moving, otherwise freeze at home coordinates
        const vx = velocities[idx];
        const vy = velocities[idx + 1];
        const vz = velocities[idx + 2];
        const isDisplaced = Math.abs(px - hx) > 0.0001 || Math.abs(py - hy) > 0.0001;

        if (Math.abs(vx) > 0.00005 || Math.abs(vy) > 0.00005 || Math.abs(vz) > 0.00005 || isDisplaced) {
          posArr[idx] += vx;
          posArr[idx + 1] += vy;
          posArr[idx + 2] += vz;
          hasActiveMotion = true;
        } else {
          posArr[idx] = hx;
          posArr[idx + 1] = hy;
          posArr[idx + 2] = hz;
          velocities[idx] = 0;
          velocities[idx + 1] = 0;
          velocities[idx + 2] = 0;
        }
      }

      if (hasActiveMotion || isMouseMoving) {
        geometry.attributes.position.needsUpdate = true;
      }

      // Smooth decay of mouse velocity
      mouse.speed *= 0.82;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      material.dispose();
      spriteTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-20 overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        id="bg"
        className="absolute inset-0 block w-full h-full pointer-events-none opacity-90"
      />
    </div>
  );
};

export default AnimatedBackground;
