# MASTER PROMPT & SYSTEM SPECIFICATION

## Global Rules
1. Before coding, read docs/MASTER_PROMPT.md, docs/SPATIAL_UI.md and docs/DECISIONS.md. If DECISIONS.md conflicts with the other two, DECISIONS.md wins.
2. Inspect the existing project first. Preserve working code. Do not recreate working config.
3. Use the pinned dependency versions in DECISIONS.md. Do not upgrade packages casually.
4. The app must run with ZERO API keys: npm install && npm run dev. Keys only enable live upgrades.
5. Never fake success. Never hardcode a successful result. Demo connectors must do real work against the demo store and every demo output must be labeled DEMO in the UI.
6. No placeholder functions, no TODO stubs, no empty buttons, no dead routes.
7. All server inputs validated with Zod. Consistent JSON envelope: { success, data, message }. No raw errors to the user.
8. Keep AI planning, execution and verification in separate modules.
9. Respect prefers-reduced-motion. 3D is lazy loaded and has a 2D fallback.
10. When the phase is finished: run npm run build, npm run typecheck and npm test, start the app, exercise every feature you built, fix every error and console warning, then print a checklist of what you personally verified. Do not claim anything you did not run.
11. Stop at the end of the phase and wait. Do not start the next phase.

## System Architecture
- Monorepo: `client/`, `server/`, `supabase/`, `docs/`.
- Repository Interface: `LocalStore` default JSON file persistence, switchable to `SupabaseStore` when keys are provided.
- Real-time updates: Server-Sent Events (SSE).
- Modularity: AI Planning, Execution, and Verification separated into dedicated modules.
- Resilience: Fully functional offline with zero keys. Fallbacks always labeled explicitly.
