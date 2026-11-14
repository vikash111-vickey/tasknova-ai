# TASKNOVA AI — Autonomous AI Execution Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero-Key Guaranteed](https://img.shields.io/badge/API%20Keys-Zero%20Required-brightgreen.svg)](#zero-key-guarantee)
[![Trust Score: SHA-256 Verified](https://img.shields.io/badge/Audit-Cryptographic%20Proof%20Ledger-cyan.svg)](#cryptographic-proof-ledger)

**TASKNOVA AI** is a resilient autonomous execution platform designed to plan, orchestrate, verify, and cryptographically audit multi-step workflows across business tools with human-in-the-loop governance and an immersive 3D spatial user interface.

---

## ⚡ 5-Line Quickstart

```bash
git clone https://github.com/example/tasknova-ai.git && cd tasknova-ai
npm install
npm run seed
npm run build
npm start
```
*Open [http://localhost:3001](http://localhost:3001) in your browser. (Click **"Use Demo Account"** to explore instantly with zero setup).*

---

## 🌟 Core Highlights

- **Zero-Key Guarantee**: Out of the box, TASKNOVA operates flawlessly with **zero API keys or external services**. Powered by a deterministic `TemplatePlanner` and an in-memory `DemoStore` (Google Drive, Gmail, Google Calendar, Stripe, Slack). When a Gemini API key is present in server env, it auto-promotes to live LLM planning.
- **Three Decoupled Engines**:
  1. **Planning Engine**: Translates natural language into validated DAGs with risk tiers and approval gates.
  2. **Execution Engine**: State-machine-driven orchestrator with concurrency caps, idempotency keys, and exponential backoff.
  3. **Verification Engine**: Completely independent from execution. Re-reads target state (checksum, outbox, calendar) to verify results.
- **SHA-256 Proof Ledger**: Each verified action appends to a tamper-evident cryptographic hash chain ($H_n = \text{SHA-256}(H_{n-1} + \text{canonical}(R_n))$). Exportable PDF Proof Certificates with verification qr-code hashes.
- **Spatial UI & 3D AI Brain**: Built with React Three Fiber, featuring state-reactive particle halos, glassmorphism panels, and interactive ReactFlow DAG workspaces. Automatically falls back to 2D SVG for accessibility and reduced-motion preferences.
- **Human-in-the-Loop Governance**: High-risk actions (e.g. sending financial emails or modifying databases) halt execution until authorized. Payloads can be inspected and edited before execution resumes.
- **Chaos Mode & Autonomous Self-Healing**: Injects simulated network drops, rate limits, or auth timeouts; the self-healing orchestrator recovers automatically and logs transparent telemetry.

---

## 🛠️ Monorepo Structure

```
├── client/              # React 18 + Vite 5 + TailwindCSS + ReactFlow + Three.js
│   ├── src/components/  # 3D AIBrain, Spatial DAG, Reusable UI Kit
│   ├── src/pages/       # Dashboard, Workflows, Connectors, Analytics, Reports, Settings
│   └── src/lib/         # Typed API client, SSE subscriptions, stores
├── server/              # Express 4 + TypeScript + Zod + pdf-lib
│   ├── src/connectors/  # Drive, Gmail, Calendar, Stripe, Slack, WebTools
│   ├── src/repository/  # Dual-store: LocalStore (atomic JSON) & SupabaseStore
│   ├── src/services/    # AI Planning, Orchestrator, Verification, Proof Ledger, Scheduler
│   └── src/routes/      # REST API endpoints (/auth, /tasks, /executions, /proof, etc.)
├── docs/                # Architecture, API Reference, Execution Flow, Limitations
├── supabase/            # PostgreSQL migrations and seed scripts
└── DEMO_SCRIPT.md       # 3-Minute pitch & live demo guide
```

---

## 🚀 Key Commands

| Command | Action |
|---|---|
| `npm run dev` | Runs both client (port 5173) and backend (port 3001) concurrently |
| `npm run build` | Compiles client and server into optimized production bundles |
| `npm start` | Launches production server (serves API + client from port 3001) |
| `npm test` | Runs Vitest test suites across client and server |
| `npm run typecheck` | Validates strict TypeScript compilation across all packages |
| `npm run seed` | Re-initializes LocalStore with realistic demo tasks and users |

---

## 🛡️ Security & Privacy

- **No Secrets in Bundles**: Zero API keys or tokens are packed into the client bundle.
- **Strict SSRF Defense**: Web connectors block requests to private subnets (RFC 1918), loopback addresses, and cloud instance metadata endpoints (`169.254.169.254`).
- **Prompt Injection Immunity**: External data inputs cannot manipulate DAG structure or bypass approval policies.
- **Hardened Server**: Helmet headers, strict CORS, rate limiters on auth & planning, and 2MB payload limits.

---

## 📄 License

TASKNOVA AI is distributed under the MIT License. See [LICENSE](LICENSE) for details.
