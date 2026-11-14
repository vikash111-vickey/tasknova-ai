# SPATIAL UI GUIDELINES

## Principles
1. **Lazy-loaded 3D with 2D Fallback**:
   - Three.js (0.160.0), @react-three/fiber (8.15.x), and @react-three/drei (9.88.x) are restricted to the AI Brain visualization.
   - 3D view must be dynamically imported / lazy-loaded.
   - When WebGL is unavailable or user has `prefers-reduced-motion` enabled, render an SVG / Canvas 2D fallback.

2. **Workflow Graph**:
   - Built using ReactFlow (v11).
   - High accessibility and responsive controls.

3. **Accessibility**:
   - Strictly honor `prefers-reduced-motion: reduce`.
   - Clear visual indicators, high-contrast dark-mode first design.
   - Explicit labeling for demo outputs ("DEMO") and AI provider status ("Template planner").
