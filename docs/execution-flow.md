# TaskNova Autonomous Execution Flow, Verification & Proof Ledger Specification

This document specifies the execution lifecycle, independent verification architecture, cryptographic proof ledger, recovery engine policies, and trust scoring formula for TaskNova.

---

## 1. Execution Lifecycle & Task State Machine

Every task adheres to an explicit 11-state machine. State transitions are strictly enforced; illegal transitions throw `IllegalStateTransitionError` and are audited in the execution event log.

### Task States
1. `CREATED`: Initial task record initialized from user prompt.
2. `PLANNING`: Intent analyzed and dependency-aware DAG synthesized by AI/Template planner.
3. `AWAITING_APPROVAL`: Execution paused awaiting human operator authorization (e.g. initial plan approval or bound action confirmation before high-risk operations).
4. `QUEUED`: Ready for execution scheduler pickup.
5. `RUNNING`: Step execution in progress with a concurrency cap of 3.
6. `RECOVERY_IN_PROGRESS`: Automated recovery engaged following an error.
7. `VERIFYING`: All execution steps finished; independent state verification and proof ledger integrity check executing.
8. `COMPLETED`: Terminal state; reached **only** when all required steps have `verification_status: 'VERIFIED'`.
9. `PARTIALLY_COMPLETED`: Terminal state; reached when some steps verified but others are inconclusive or failed.
10. `FAILED`: Terminal state; required step failed after retries and recovery exhaustion.
11. `CANCELLED`: Terminal state; cancelled by human operator, preserving completed work and marking pending steps as skipped.

---

## 2. DAG Orchestration & Concurrency

- **Dependency Graph**: Steps are scheduled according to topological dependency order (`dependencies` / `depends_on`).
- **Concurrency Cap**: Up to 3 independent steps execute concurrently (`Promise.all`).
- **Prerequisite Verification**: A dependent step is **only** released when all upstream prerequisites have `verification_status: 'VERIFIED'`. Completed but unverified steps block downstream execution.
- **State Persistence**: Task step state is saved after every phase transition to allow seamless resumption after server restarts.

---

## 3. Independent Verification Engine

The Verification Engine runs completely separate from the execution logic. It re-reads actual external/demo system state via the tool connector's `verify()` method rather than relying on the executing code's reported return value.

### Verification Statuses
- `PENDING`: Initial state before verification check starts.
- `CHECKING`: Verification in progress.
- `VERIFIED`: Concrete check confirmed provider state matches expected output.
- `FAILED`: Check confirmed state does not match or evidence was explicitly refuted.
- `INCONCLUSIVE`: Outcome could not be confirmed with certainty (e.g. missing evidence or ambiguous provider response).

### Verification Rules
1. **Concrete Checks**: Never mark `VERIFIED` without an actual check against external state (e.g. re-reading Drive file metadata and checksum, opening the PDF and verifying page count and section headings, or checking the demo mail server outbox).
2. **Email Verification**: Claims **only** `'accepted by provider mail server'` and never delivery or reading.
3. **Evidence Records**: Every check produces an immutable `EvidenceRecord` storing:
   - `id`, `operationId`, `taskId`, `userId`, `tool`, `method`, `timestamp`, `providerReferenceId`, `evidenceSummary`, `status`, `mode`.
   - Sensitive payloads (passwords, auth headers, private data) are sanitized.

---

## 4. Cryptographic Proof Ledger (Merkle Hash Chain)

Every verified step appends an entry to an immutable hash chain:

$$H_0 = \text{GENESIS\_HASH} = \text{"0"}^{64}$$
$$H_i = \text{SHA256}(H_{i-1} + \text{canonical\_json}(R_i))$$

Where:
- $H_i$: Proof hash for block $i$.
- $H_{i-1}$: Previous block's hash.
- $\text{canonical\_json}(R_i)$: Deterministic JSON serialization with recursively sorted object keys and standard formatting.

### Proof Endpoints
- `GET /api/tasks/:id/proof`: Returns the full chain, latest tip hash, and trust breakdown.
- `POST /api/tasks/:id/proof/verify`: Recomputes every block hash from genesis to tip. If tampered, pinpoints the exact broken link index and record ID.
- `GET /api/tasks/:id/proof/certificate`: Generates a downloadable Proof Certificate PDF containing the full audit trail and DEMO watermark.

---

## 5. Trust Score Formula

The **Trust Score** ($T \in [0, 100]$) quantifies the mathematical confidence in the integrity and success of the task execution.

### Mathematical Definition

$$T = \min\left(100, \max\left(0, \text{round}\left(R_v - P_r \cdot N_r - P_{rec} \cdot N_{rec} - P_{inc} \cdot N_{inc} + B_a \cdot N_a\right)\right)\right)$$

### Components & Parameters
| Parameter | Symbol | Value | Description |
| :--- | :---: | :---: | :--- |
| **Verified Ratio** | $R_v$ | $0 - 100$ | Baseline score: $\text{round}\left(\frac{\text{verified\_steps}}{\text{total\_steps}} \times 100\right)$ |
| **Retry Penalty** | $P_r$ | 5 pts | Penalty deducted per step retry attempt ($N_r$) |
| **Recovery Penalty** | $P_{rec}$ | 10 pts | Penalty deducted per recovery event triggered ($N_{rec}$) |
| **Inconclusive Penalty** | $P_{inc}$ | 15 pts | Penalty deducted per inconclusive verification check ($N_{inc}$) |
| **Approval Bonus** | $B_a$ | +5 pts | Confidence bonus per human-verified approval ($N_a$) |

### Boundary & Integrity Overrides
1. **Cryptographic Tamper Zeroing**: If `verifyChain()` detects any broken hash link or data tampering, $T = 0$ immediately regardless of step outcomes.
2. **Failed Step Cap**: If any required step is in `FAILED` status, the maximum possible trust score is capped at $40$.
3. **Clamping**: The final score is strictly clamped between $0$ and $100$.

---

## 6. Recovery Engine & Resilience Policies

When an error occurs, the Recovery Engine intercepts it before failing the step.

### Error Classification
1. `network`: Transient timeouts, socket resets, connection drops.
2. `auth`: Token expiration, 401 Unauthorized, expired JWT.
3. `permission`: 403 Forbidden, insufficient privileges.
4. `rate_limit`: 429 Too Many Requests.
5. `invalid_input`: Schema validation failure, malformed payload.
6. `not_found`: 404 Entity missing.
7. `provider_unavailable`: 503 Service Unavailable.
8. `verification_mismatch`: Provider state does not match expected output.
9. `unknown`: Unclassified error.

### Policies
- `retry_safe`: For idempotent or read operations; retries with exponential backoff and randomized jitter.
- `check_before_retry`: **Crucial for uncertain outcomes**. Before resending an external request (such as an email or file upload), the engine checks whether the action already succeeded in the provider outbox or storage. If found, it adopts the existing reference and avoids duplicate execution.
- `approved_alternative_path`: Fallback connector if available.
- `human_intervention`: Non-retryable errors (e.g. permissions, destructive operations, schema errors) pause execution and notify the user for manual decision.

### Safety Guarantees
- **Never Retry Destructive Operations**: Deletions and purges are never auto-retried.
- **Never Duplicate Email Dispatch**: Check-before-retry inspects outbox to prevent accidental double-sending.
- **Never Silently Change Destination**: Recipient or target modifications require explicit operator authorization.

---

## 7. Chaos Mode (Fault Injection)

Chaos Mode allows controlled testing of resilience in demo mode:
- Supported faults: `network_timeout`, `auth_expiry`, `verification_mismatch`, `provider_503`.
- Faults are injected through the **real execution path**, ensuring recovery policies run without artificial test shortcuts.
- Each fault decrements an occurrence counter so retries can test full recovery and verification.
