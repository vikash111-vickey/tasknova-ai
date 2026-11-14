# TASKNOVA AI — API Reference

All REST endpoints return responses formatted with the standard JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable status summary"
}
```

Error responses return `{ "success": false, "error": "...", "message": "..." }` with appropriate HTTP status codes (`400`, `401`, `403`, `404`, `409`, `429`, `500`).

---

## 1. Authentication & Users

### `POST /api/auth/register`
Creates a new user profile with hashed password credentials.
- **Body**: `{ email, password, full_name? }`
- **Response**: `{ user: { id, email, full_name, role }, token }`

### `POST /api/auth/login`
Authenticates a user and returns a signed JWT token.
- **Body**: `{ email, password }`
- **Response**: `{ user: { id, email, full_name, role }, token }`

### `GET /api/auth/me`
Returns the active session's profile.
- **Headers**: `Authorization: Bearer <token>`

### `GET /api/users/export`
Exports all account data (tasks, steps, events, approvals, proofs) in JSON format.

---

## 2. Planning Engine

### `POST /api/planning/generate`
Analyzes natural language prompt and generates a structured DAG execution plan.
- **Body**: `{ instruction: string, autoApprove?: boolean }`
- **Response**: `{ plan: ExecutionPlan, intentAnalysis: IntentAnalysis, taskId: string }`

### `POST /api/planning/:taskId/approve-plan`
Approves the DAG plan and transitions the task into executable state.
- **Response**: `{ task: Task, steps: TaskStep[] }`

---

## 3. Tasks & Executions

### `GET /api/tasks`
Lists all tasks for the authenticated user with optional filtering by status and search terms.
- **Query params**: `status?`, `search?`, `limit?`, `offset?`

### `GET /api/tasks/:id`
Retrieves detailed task metadata, step statuses, and verification logs.

### `POST /api/executions/:taskId/run`
Executes an approved task DAG using the dependency-aware orchestrator.
- **Body**: `{ chaosMode?: boolean }`
- **Response**: `{ status: "RUNNING" | "AWAITING_APPROVAL" | "COMPLETED", ... }`

### `POST /api/executions/:taskId/cancel`
Cancels a running or queued task, halting pending steps while preserving verified evidence.

### `POST /api/executions/:taskId/retry`
Retries failed or uncompleted steps in a task.

---

## 4. Human Approval System

### `GET /api/approvals`
Lists pending and historical human approval requests.
- **Query params**: `status?` (e.g. `PENDING`, `APPROVED`, `REJECTED`)

### `POST /api/approvals/:id/approve`
Grants authorization for an approval-gated step. Orchestrator automatically resumes execution.

### `POST /api/approvals/:id/reject`
Rejects the action. Halts dependent execution branch with user explanation.

### `PUT /api/approvals/:id/edit`
Allows an operator to modify sensitive step input payloads (e.g. email subject or recipient). Recalculates the SHA-256 payload checksum and resets the decision.

---

## 5. Verification & Proof Ledger

### `GET /api/tasks/:id/proof`
Retrieves the complete cryptographic proof ledger chain, raw evidence records, and trust score breakdown.

### `POST /api/tasks/:id/proof/verify`
Recomputes SHA-256 hashes across every block from genesis to tip.
- **Response**:
  ```json
  {
    "valid": true,
    "chainLength": 5,
    "rootHash": "0000...0000",
    "latestHash": "d8e3...",
    "trustScore": 96
  }
  ```

### `GET /api/tasks/:id/proof/certificate`
Downloads a cryptographically signed Proof Certificate PDF for the task.

---

## 6. Schedules & Policies

### `GET /api/schedules` & `POST /api/schedules`
Manages cron-based automated workflow schedules.

### `GET /api/policies` & `POST /api/policies`
Configures governance rules (e.g., auto-approval thresholds, prohibited actions, high-risk flags).

---

## 7. Telemetry & Real-Time Events

### `GET /api/events`
Server-Sent Events (SSE) stream broadcasting live task, step, verification, and chaos events.
- **Headers**: `Accept: text/event-stream`

### `GET /api/analytics/metrics`
Returns aggregated performance metrics: total executions, trust score average, time saved (mins), and error rates.

### `GET /api/health`
Health check endpoint reporting server status, active store adapter (LocalStore / SupabaseStore), and active AI provider.
