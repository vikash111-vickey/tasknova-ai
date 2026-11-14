# TASKNOVA AI — 3-Minute Executive Pitch & Live Demo Script

**Theme**: *"From Prompt to Cryptographically Audited Action — With Zero Hallucinations and Zero-Key Friction."*

---

## ⏱️ Pitch Timeline (180 Seconds)

```
0:00 ─── 0:45  The Problem & Spatial Command Center
0:45 ─── 1:30  Natural Language to DAG & Autonomous Planning
1:30 ─── 2:15  Autonomous Execution & Human-in-the-Loop Governance
2:15 ─── 3:00  Independent Verification, SHA-256 Proof Ledger & Certificate
```

---

## Minute 0:00 – 0:45: The Problem & Spatial Command Center

### Speaker Narrative:
> *"Modern AI agents suffer from two fatal flaws: they hallucinate outcomes and operate as unverified black boxes. If an AI agent claims it sent your executive financial summary or scheduled a board meeting, how do you verify it actually happened without manual inspection?*
>
> *Welcome to **TASKNOVA AI**. TASKNOVA is an autonomous execution platform that separates planning, execution, and verification. It runs right now on this machine with **zero API keys** and zero external configuration."*

### On-Screen Actions:
1. Open `http://localhost:3001` (or click **"Use Demo Account"** on the Login screen).
2. The **Spatial Dashboard** appears:
   - Point out the **3D AI Brain** in the center floating in an idle particle field.
   - Point out the **Trust Score Average (96%)**, **Time Saved (22 mins/run)**, and live **KPI cards**.
   - Note the **`[DEMO MODE]`** badge signaling zero-key sandbox isolation.

---

## Minute 0:45 – 1:30: Natural Language to DAG & Autonomous Planning

### Speaker Narrative:
> *"Let's give TASKNOVA a complex operational request. Instead of blindly executing code, TASKNOVA's Planning Engine dissects the intent, maps tool constraints, evaluates security risks, and generates a Directed Acyclic Graph (DAG)."*

### On-Screen Actions:
1. In the central command prompt, click the preset chip:
   **"Generate weekly financial audit report and email leadership"**
2. Click **Plan Execution** (or press Enter).
3. The 3D Brain smoothly transitions from *idle* to *thinking* (pulsing purple aura) to *planning* (connected blue node network).
4. The **Plan Preview Modal** appears:
   - Point out the 5-step DAG:
     1. `stripe.list_charges` (Low Risk)
     2. `store.match_invoices` (Low Risk)
     3. `reports.generate_summary` (Medium Risk)
     4. `approval.request` (Human Authorization Gate)
     5. `email.send` (High Risk)
5. Click **"Approve & Open Execution Workspace"**.

---

## Minute 1:30 – 2:15: Execution & Human Governance

### Speaker Narrative:
> *"Here in the Spatial Execution Workspace, watch our dependency-aware orchestrator. Upstream steps run concurrently under a cap of 3. But look at step 4: because emailing leadership involves external financial figures, TASKNOVA automatically halts execution at the human authorization gate."*

### On-Screen Actions:
1. The **Interactive ReactFlow DAG** highlights running nodes in real time via Server-Sent Events.
2. Steps 1, 2, and 3 complete in parallel.
3. Execution safely halts with status **`AWAITING_APPROVAL`**.
4. Click **"Review Approval"**:
   - Show the sensitive payload (recipient, subject line, attachment reference).
   - Point out the calculated **SHA-256 payload checksum**.
   - (Optional) Toggle **Chaos Mode** to demonstrate fault recovery.
5. Click **"Authorize Execution"**.
6. Execution resumes immediately. The 3D Brain radiates teal and green as the final step dispatches to the demo mail server.

---

## Minute 2:15 – 3:00: Verification, Cryptographic Proof Ledger & Certificate

### Speaker Narrative:
> *"Now for the core innovation: how do you know the report was actually accurate and dispatched? Notice TASKNOVA does not trust the execution return value.
>
> An independent Verification Engine re-reads the actual provider state: it checks the PDF page count and checksum, and inspects the mail server outbox.
>
> Every piece of evidence is hashed into an immutable SHA-256 Merkle chain. If anyone tampers with a single character in the audit record, the chain breaks and the Trust Score drops to zero."*

### On-Screen Actions:
1. Scroll down to the **Cryptographic Proof Ledger**:
   - Point out the green **"Chain Intact: 5 Blocks Verified"** badge and **Trust Score: 96%**.
   - Show the mathematical hash chain ($H_n = \text{SHA-256}(H_{n-1} + \text{canonical}(R_n))$).
2. Click **"Verify Chain Integrity"**:
   - The system recomputes all hashes in real time and displays confirmation.
3. Click **"Download Proof Certificate"**:
   - An authenticated PDF opens, complete with timestamps, digital signatures, and task audit trail.

### Concluding Remark:
> *"TASKNOVA AI: Autonomous efficiency with enterprise trust and mathematical certainty. Thank you."*
