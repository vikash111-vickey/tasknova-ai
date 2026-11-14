# Architecture Decisions

These architectural decisions are binding across all phases:

- Persistence: Repository interface with LocalStore (JSON file, default, zero-config) and SupabaseStore (used only when SUPABASE env keys exist).
- Auth: Supabase Auth if configured, else local demo account with signed JWT.
- Live updates: Server-Sent Events at /api/executions/:id/stream.
- AI: AIProvider interface; adapters Gemini, OpenAI-compatible, and TemplatePlanner fallback (always labeled 'Template planner').
- Connectors: each has demo and live implementations behind one interface; demo store is separate from live data.
- Scheduler: node-cron.
- 3D: three 0.160.0, @react-three/fiber 8.15.x, @react-three/drei 9.88.x for the AI Brain only, lazy-loaded with 2D fallback. Workflow graph uses reactflow 11.
- Pinned: react 18.3.1, vite 5.4.x, tailwindcss 3.4.x, framer-motion 11.x, recharts 2.x, zod 3.x, express 4.x.
