# TASKNOVA AI — Supabase Integration & Real Data Guide

This guide walks you through connecting **Supabase** for Authentication, PostgreSQL Database persistence with Row Level Security (RLS), and real-time backend/frontend execution.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Fill in:
   - **Name**: `TASKNOVA AI` (or your preferred name)
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Choose the region closest to you.
4. Click **Create new project** and wait ~1–2 minutes for provisioning.

---

## 2. Execute Database Schema Migration

1. In your Supabase dashboard, open the **SQL Editor** from the left sidebar.
2. Click **New query**.
3. Copy the entire contents of [`supabase/migrations/20240102000000_full_schema.sql`](../supabase/migrations/20240102000000_full_schema.sql).
4. Paste it into the SQL Editor and click **Run** (or `Ctrl+Enter`).
5. You will see `Success. No rows returned`.

### What This Creates:
- **`profiles`**: User accounts with password hashing, roles (`operator`, `user`, `admin`), and avatars.
- **`tasks`**: Autonomous workflow executions with trust scores and duration metrics.
- **`task_steps`**: Atomic execution DAG nodes with inputs, outputs, and statuses.
- **`execution_events`**: Audit trail and SSE live stream events.
- **`integrations`**: Connected apps (Email, Slack, Sheets, Stripe, GitHub).
- **`approvals`**: Human-in-the-loop authorization gates with decision notes.
- **`verification_records`**: Independent verification outcomes and SHA-256 signatures.
- **`evidence_records`**: Cryptographic evidence of state inspection before completion.
- **`generated_files`**: Generated audit reports, PDFs, and checksums.
- **`notifications`**: System alerts and user notifications.
- **`schedules`**: Cron automation schedules.
- **`policies`**: Security and approval thresholds.
- **`proof_ledger`**: Immutable Merkle hash chain records.
- **`chaos_faults`**: Resilience testing faults.
- **Storage Bucket (`generated_files`)**: Storage for generated PDF certificates and reports.
- **Row Level Security (RLS)**: Enforced across all tables so users cannot access each other's data.

---

## 3. Retrieve Your Supabase API Keys

1. In your Supabase project dashboard, click the **Settings** icon (gear at bottom left).
2. Go to **API** under Configuration.
3. Locate:
   - **Project URL**: e.g., `https://xyzabcdefghijklm.supabase.co`
   - **`anon` `public` key**: For client public queries.
   - **`service_role` `secret` key**: (Click *Reveal*). **Keep this secret!** Required for the server to perform authorized operations and manage verified ledger states.

---

## 4. Configure `server/.env`

Open [`server/.env`](../server/.env) in your editor and paste your credentials:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-custom-jwt-secret-string

# Supabase Live Configuration
SUPABASE_URL=https://xyzabcdefghijklm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
SUPABASE_ANON_KEY=your-actual-anon-public-key-here

# Optional: Add your Gemini or OpenAI API key for live LLM planning
GEMINI_API_KEY=
OPENAI_API_KEY=
```

---

## 5. Start the Application

In the root repository directory, run:

```bash
npm run dev
```

### Automatic Mode Detection:
- When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present:
  - The server console logs: `[Repository] Initialized with SupabaseStore (Live Mode)`
  - The `/api/health` endpoint responds with `{ mode: "live", store: "supabase" }`
  - In the top navigation bar, the status badge automatically switches to **`Supabase Live`**!

---

## 6. Uploading Real Data

### Option A: Via the Web Application (Recommended)
1. **Create Real Users**:
   - Go to `http://localhost:5173/register` and register real user accounts.
2. **Connect Real Applications**:
   - Navigate to `/connectors` to configure production or test OAuth credentials for Email, Slack, Stripe, and Google Sheets.
3. **Execute Real Tasks**:
   - On `/dashboard`, type any natural language prompt or click an example workflow. The system compiles the DAG, requests human approval where configured, executes the connectors, independently verifies the output, and seals the SHA-256 Proof Ledger.
4. **Configure Policies & Automated Schedules**:
   - Navigate to `/settings` &rarr; **Permission Center** to configure high-risk approval thresholds (e.g. require approval for batch actions over \$100 or >50 recipients).
   - Navigate to `/schedules` to schedule automated recurring cron executions.

### Option B: Seeding Supabase With Initial Data
If you wish to pre-populate Supabase with starter data:
1. Open the Supabase **SQL Editor**.
2. Run [`supabase/seed.sql`](../supabase/seed.sql).
3. The demo profile (`demo@tasknova.local`) and base connector records will be inserted.
