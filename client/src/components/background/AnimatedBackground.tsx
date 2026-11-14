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
      const particles2D = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        radius: Math.random() * 1.5 + 0.8,
        isLavender: Math.random() < 0.25,
      }));

      let mouse2D = { x: -1000, y: -1000 };
      const handleMouseMove2D = (e: MouseEvent) => {
        mouse2D.x = e.clientX;
        mouse2D.y = e.clientY;
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

        // Draw and update points
        for (const p of particles2D) {
          // Mouse reaction in 2D
          const mdx = p.x - mouse2D.x;
          const mdy = p.y - mouse2D.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 140 && mdist > 0.1) {
            const push = (1 - mdist / 140) * 1.5;
            p.x += (mdx / mdist) * push;
            p.y += (mdy / mdist) * push;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.isLavender ? 'rgba(170, 136, 255, 0.75)' : 'rgba(220, 220, 230, 0.45)';
          ctx.fill();

          if (!reducedMotion) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
          }
        }

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
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Camera Gaze Lerp: smoothly and gently tracks cursor across viewport
      mouse.x += (mouse.targetX - mouse.x) * 0.03;
      mouse.y += (mouse.targetY - mouse.y) * 0.03;

      const targetCamX = baseCameraPos.x - mouse.x * 0.35;
      const targetCamY = baseCameraPos.y + mouse.y * 0.25;
      camera.position.x += (targetCamX - camera.position.x) * 0.025;
      camera.position.y += (targetCamY - camera.position.y) * 0.025;
      camera.lookAt(0, 0, 0);

      // Subtle living multi-axis harmonic breathing of the group - slow and calm
      pointsGroup.rotation.y = baseRotY + Math.sin(elapsedTime * 0.06) * 0.04;
      pointsGroup.rotation.z = baseRotZ + Math.sin(elapsedTime * 0.05) * 0.03;

      // Project mouse into the particle cloud local coordinate space
      raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
      raycaster.ray.intersectPlane(interactionPlane, worldCursorIntersect);
      localCursor.copy(worldCursorIntersect);
      pointsGroup.worldToLocal(localCursor);

      const posArr = geometry.attributes.position.array as Float32Array;
      const colorArr = geometry.attributes.color.array as Float32Array;

      // Dynamic cursor interaction parameters
      const localRadius = 1.15;
      const localRadiusSq = localRadius * localRadius;
      const hasRecentMotion = mouse.speed > 0.02;

      // Mouse local velocity vector estimation
      const localMouseVx = mouse.vx * 0.02;
      const localMouseVy = mouse.vy * 0.02;

      // Physics Loop: Slow, Majestic Living Curl Stream + Cursor Fluid Whirlpool
      const orbitSpeed = 0.0016; // Slow majestic carousel stream (approx ~4x slower)
      const curlFreq = 1.4;
      const curlSpeed = 0.18; // Slow curl noise evolution

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;

        let px = posArr[idx];
        let py = posArr[idx + 1];
        let pz = posArr[idx + 2];

        const isAmbientParticle = baseRadii[i * 2] === 0;

        // Perpetual gentle curl noise stream
        const flowWeight = randomAttributes[idx + 1];
        const s1 = Math.sin(py * curlFreq + elapsedTime * curlSpeed);
        const c1 = Math.cos(pz * (curlFreq * 1.2) + elapsedTime * (curlSpeed * 0.8));
        const s2 = Math.sin(pz * curlFreq + elapsedTime * (curlSpeed * 0.9));
        const c2 = Math.cos(px * (curlFreq * 1.2) + elapsedTime * (curlSpeed * 0.7));
        const s3 = Math.sin(px * curlFreq + elapsedTime * (curlSpeed * 0.85));
        const c3 = Math.cos(py * (curlFreq * 1.2) + elapsedTime * curlSpeed);

        const curlX = (s1 + c1) * 0.0007 * flowWeight;
        const curlY = (s2 + c2) * 0.0007 * flowWeight;
        const curlZ = (s3 + c3) * 0.0006 * flowWeight;

        velocities[idx] += curlX;
        velocities[idx + 1] += curlY;
        velocities[idx + 2] += curlZ;

        // Dynamic Cursor Fluid Interaction (Soft, elegant reaction to mouse)
        const dx = px - localCursor.x;
        const dy = py - localCursor.y;
        const dz = pz - localCursor.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < localRadiusSq) {
          const dist = Math.sqrt(distSq) + 0.001;
          const falloff = 1.0 - dist / localRadius;
          const falloffSq = falloff * falloff;

          // Tangential Vortex Whirlpool around cursor
          const vortexStrength = 0.022;
          velocities[idx] += (-dy / dist) * vortexStrength * falloffSq;
          velocities[idx + 1] += (dx / dist) * vortexStrength * falloffSq;

          // Outward Repulsive Bow Wave
          const pushStrength = 0.015;
          velocities[idx] += (dx / dist) * pushStrength * falloffSq;
          velocities[idx + 1] += (dy / dist) * pushStrength * falloffSq;
          velocities[idx + 2] += (dz / dist) * (pushStrength * 0.5) * falloffSq;

          // Fluid Drag / Stirring Impulse along mouse movement
          if (hasRecentMotion) {
            const dragForce = Math.min(mouse.speed * 0.03, 0.035) * falloffSq;
            velocities[idx] += localMouseVx * dragForce;
            velocities[idx + 1] += localMouseVy * dragForce;
          }
        }

        if (!isAmbientParticle) {
          // Advance perpetual orbital stream along the sculpted ring
          let u = originAngles[i * 2] + orbitSpeed;
          if (u > Math.PI * 2) u -= Math.PI * 2;
          originAngles[i * 2] = u;

          const v = originAngles[i * 2 + 1];
          const rMajor = baseRadii[i * 2] + Math.sin(elapsedTime * 0.15 + u * 2) * 0.02;
          const rMinor = baseRadii[i * 2 + 1];

          // Torus baseline target coordinates
          const targetX = (rMajor + rMinor * Math.cos(v)) * Math.cos(u);
          const targetY = (rMajor + rMinor * Math.cos(v)) * Math.sin(u);
          const targetZ = rMinor * Math.sin(v) + Math.sin(u * 2) * 0.08;

          // Gentle Elastic Healing Spring Force back to Sculpted Ring
          const spring = 0.012;
          velocities[idx] += (targetX - px) * spring;
          velocities[idx + 1] += (targetY - py) * spring;
          velocities[idx + 2] += (targetZ - pz) * spring;
        } else {
          // Ambient foreground particles drift slowly across the entire screen
          velocities[idx] += originAngles[i * 2];
          velocities[idx + 1] += originAngles[i * 2 + 1];

          // Wrap around viewport bounds
          if (px > 1.45) posArr[idx] = -1.45;
          if (px < -1.45) posArr[idx] = 1.45;
          if (py > 1.05) posArr[idx + 1] = -1.05;
          if (py < -1.05) posArr[idx + 1] = 1.05;
        }

        // 5. Velocity Damping
        velocities[idx] *= 0.94;
        velocities[idx + 1] *= 0.94;
        velocities[idx + 2] *= 0.94;

        // 6. Integrate Position
        posArr[idx] += velocities[idx];
        posArr[idx + 1] += velocities[idx + 1];
        posArr[idx + 2] += velocities[idx + 2];

        // 7. Dynamic Sparkle / Shimmer Modulation - slow, relaxing pulse
        const sparklePhase = randomAttributes[idx];
        const sparkle = 0.75 + Math.sin(elapsedTime * 1.2 + sparklePhase * 24.0) * 0.25;
        if (randomAttributes[idx + 2] < 0.22) {
          // Vibrant lavender nodes pulse smoothly
          colorArr[idx] = colorLavender.r * sparkle;
          colorArr[idx + 1] = colorLavender.g * sparkle;
          colorArr[idx + 2] = colorLavender.b * sparkle;
        }
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;

      // Gradually decay mouse velocity
      mouse.speed *= 0.92;

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
