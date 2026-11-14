# TASKNOVA AI — Technical Limitations & Known Boundaries

In accordance with our engineering standards of transparency and rigor, this document outlines the current technical limitations, system boundaries, and architectural trade-offs of **TASKNOVA AI**.

---

## 1. Storage & Persistence

### 1.1 In-Memory & Local JSON Store
- **Single Process File Locks**: The default `LocalStore` uses atomic JSON writes (`store.json.tmp` → rename) to ensure file integrity. While crash-safe for single-instance operations, it is not designed for distributed multi-server clusters sharing a mounted disk.
- **Production Recommendation**: When deploying across multiple container replicas, enable the `SupabaseStore` by configuring `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Scheduling & Concurrency

### 2.1 Single-Node Node-Cron Scheduler
- **Memory-Bound Jobs**: Recurring schedules in `scheduler.ts` execute via `node-cron` in the primary Node.js process. If the server process is killed or restarted, recurring schedules resume upon startup, but missed cron intervals during server downtime are not retroactively executed.
- **Future Roadmap**: Integration with distributed job queues (e.g. BullMQ / Redis or pg-boss) for high-availability enterprise clusters.

### 2.2 Concurrency Caps
- The orchestrator currently enforces a concurrency cap of **3 concurrent step executions per task** to avoid hammering third-party API rate limits and preventing memory spikes on lightweight servers.

---

## 3. Sandboxed Demo Store vs. Live Third-Party APIs

### 3.1 Demo Store Scope
- The in-memory `DemoStore` simulates Google Drive, Gmail, Google Calendar, Stripe, and Slack with high fidelity (including outbox checks, drive file IDs, and calendar conflict detection).
- However, simulated third-party responses do not emulate all real-world transient edge cases, such as OAuth refresh token revocation, third-party webhook drops, or Google Drive API quotas.

### 3.2 Live Integration Requirements
- For live external tool access, valid OAuth credentials (client ID, client secret, and user authorization grant) are required. In zero-config mode, all actions safely route to `DemoStore` with prominent `[DEMO]` badges.

---

## 4. AI Planning Capabilities

### 4.1 Template Planner Scope
- When no Gemini API key is provided, the deterministic `TemplatePlanner` supports the 3 core enterprise demo workflows:
  1. Financial audit and leadership reporting (`stripe` + `store` + `email`).
  2. Multi-participant calendar scheduling (`calendar` + `email`).
  3. Drive document ingestion, summarization, and upload (`drive` + `reports`).
- Unrecognized prompts falling outside these patterns return a polite clarification request prompting the operator to select one of the supported workflows or provide an API key.

---

## 5. Security & Browser Boundaries

### 5.1 Web Tools Connector (SSRF)
- The `WebToolsConnector` enforces a strict allow-list for external HTTP queries and scraping, blocking private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`) and cloud metadata endpoints (`169.254.169.254`).
- DNS rebinding attacks are mitigated at the initial socket layer, but deep packet inspection is delegated to external enterprise firewalls.

### 5.2 Client-Side 3D Graphics
- While React Three Fiber uses lightweight geometry (<300 particles), legacy browsers lacking WebGL2 automatically fall back to the 2D SVG canvas. The user can also toggle `prefers-reduced-motion` in Appearance settings to disable 3D animation entirely.
