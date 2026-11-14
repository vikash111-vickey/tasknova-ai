# TASKNOVA AI — Architectural Overview

This document describes the high-level architecture, module decomposition, and data flow of **TASKNOVA AI**.

```
+-------------------------------------------------------------------------+
|                              SPATIAL UI                                 |
|   +-------------------+  +---------------------+  +-----------------+   |
|   | 3D AI Brain (R3F) |  | ReactFlow DAG Canvas|  | Glass Panels    |   |
|   +---------+---------+  +----------+----------+  +--------+--------+   |
|             |                       |                      |            |
|             +-----------------------+----------------------+            |
|                                     | SSE & REST API                     |
+-------------------------------------v-----------------------------------+
|                           EXPRESS API LAYER                             |
|  - Auth (/api/auth)               - Planning (/api/planning)            |
|  - Tasks (/api/tasks)             - Executions (/api/executions)        |
|  - Proof Ledger (/api/proof)      - Integrations & SSE (/api/events)    |
+-------------------------------------+-----------------------------------+
|                                     |                                   |
|   +-----------------------+   +-----v-----------------+   +---------v-----------+
|   |   PLANNING ENGINE     |   |   EXECUTION ENGINE    |   | VERIFICATION ENGINE |
|   | - Intent Analysis     |   | - State Machine       |   | - Independent Check |
|   | - DAG Compilation     |   | - Orchestrator (Cap=3)|   | - Checksum / Outbox |
|   | - Template / Gemini   |   | - Retry / Backoff     |   | - SHA-256 Ledger    |
|   +-----------------------+   +-----------------------+   +---------------------+
|                                     |                                   |
|   +---------------------------------v-----------------------------------+
|   |                       TOOL CONNECTORS & DEMO STORE                  |
|   |   [Google Drive]  [Gmail]  [Google Calendar]  [Stripe]  [Slack]     |
|   +---------------------------------+-----------------------------------+
|                                     |                                   |
+-------------------------------------v-----------------------------------+
|                          DUAL-STORE PERSISTENCE                         |
|        LocalStore (Default, atomic JSON)  <--->  SupabaseStore          |
+-------------------------------------------------------------------------+
```

---

## 1. Decoupled Core Engines

### 1.1 Planning Engine (`server/src/services/ai/`, `server/src/services/planning/`)
- Analyzes user instructions to extract explicit objectives, target tools, parameters, and risk categories.
- Compiles instructions into a Directed Acyclic Graph (DAG) with dependency nodes.
- Checks policies and tool requirements to flag steps that require human authorization (`requires_approval = true`).
- Supports **GeminiProvider** for live AI planning and **TemplatePlanner** for zero-key deterministic fallback.

### 1.2 Execution Engine (`server/src/services/execution/`)
- Orchestrates step runs based on topological sorting and dependency completion.
- Limits concurrent steps to 3 to prevent API rate limits.
- State Machine with strict transition validation:
  `CREATED` → `PLANNING` → `AWAITING_APPROVAL` → `QUEUED` → `RUNNING` → `VERIFYING` → `COMPLETED` / `FAILED` / `RECOVERY_IN_PROGRESS` / `CANCELLED`.
- Steps are gated: a dependent step executes **only when its prerequisites are verified**, not merely completed.
- Execution lock stops duplicate runs and returns the existing execution safely.

### 1.3 Verification Engine (`server/src/services/verification/`)
- Runs independently of execution code.
- Rather than trusting the execution return code, the verification engine queries the provider state:
  - *Google Drive*: Re-reads file by ID, compares file size, name, and SHA-256 content checksum.
  - *Gmail*: Checks outbox for matching recipient, subject, and provider message ID.
  - *Calendar*: Queries calendar events and confirms title, timestamp, and attendees.
  - *Reports / PDFs*: Validates PDF magic bytes, page count, and expected text sections.
- Computes **Trust Score** based on verification pass rate, idempotency compliance, and evidence freshness.

---

## 2. Cryptographic Proof Ledger (`server/src/services/verification/proofLedger.ts`)

Every verified step produces an `EvidenceRecord` that is hashed into a SHA-256 tamper-evident ledger:
$$H_n = \text{SHA-256}(H_{n-1} + \text{canonical\_json}(R_n))$$

- **Genesis Block**: Seeded with 64 zero-hex characters (`0000...0000`).
- **Chain Verification**: Endpoint `POST /api/tasks/:id/proof/verify` re-computes every block from genesis to tip, identifying the exact index of any modified or forged block.
- **Certificate Export**: Generates an authenticated PDF certificate featuring task details, step breakdown, and ledger hash checkpoints.

---

## 3. Dual-Store Persistence

The system uses a unified `Repository` interface with two pluggable adapters:

1. **LocalStore** (Default):
   - Stores all tables (`tasks`, `task_steps`, `execution_events`, `approvals`, `proof_ledger`, `schedules`, `policies`) in an atomic JSON file (`server/data/store.json`).
   - Implements atomic writes (`write-to-tmp` + `rename`) to prevent database corruption during sudden process halts.
   - Zero installation, zero external database requirement.
2. **SupabaseStore**:
   - Automatically activates when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
   - Leverages PostgreSQL tables with Row Level Security (RLS) policies and UUID primary keys.

---

## 4. Real-Time Telemetry & SSE Broker

- Express endpoint `GET /api/events` establishes a persistent Server-Sent Events (SSE) connection with the client.
- Orchestrator broadcasts execution events, state machine transitions, and verification milestones in real time.
- The 3D AI Brain dynamically derives its visual state (`thinking`, `planning`, `executing`, `verifying`, `completed`, `failed`) exclusively from verified SSE transitions.
