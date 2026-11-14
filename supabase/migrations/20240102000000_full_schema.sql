-- Complete Supabase Schema Migration with RLS and Storage Policies
-- TASKNOVA AI — Production Schema

-- Enable pgcrypto extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  password_hash TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically synchronize users created in Supabase Auth (auth.users) into profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mode TEXT NOT NULL DEFAULT 'demo',
  priority TEXT NOT NULL DEFAULT 'normal',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  plan JSONB DEFAULT '{}'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  trust_score NUMERIC DEFAULT 100,
  duration_seconds NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Task Steps Table
CREATE TABLE IF NOT EXISTS task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  name TEXT NOT NULL,
  action TEXT NOT NULL,
  tool TEXT,
  dependencies TEXT[] DEFAULT ARRAY[]::TEXT[],
  depends_on TEXT[] DEFAULT ARRAY[]::TEXT[],
  requires_approval BOOLEAN DEFAULT false,
  risk_level TEXT DEFAULT 'low',
  retry_count INT DEFAULT 0,
  output_ref TEXT,
  verification_status TEXT DEFAULT 'PENDING',
  status TEXT NOT NULL DEFAULT 'pending',
  input JSONB DEFAULT '{}'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Ensure all step columns exist if the table was previously created
ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS tool TEXT;
ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS dependencies TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS depends_on TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';
ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS output_ref TEXT;
ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'PENDING';

-- 4. Execution Events Table
CREATE TABLE IF NOT EXISTS execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step_id TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure event step_id is TEXT to support arbitrary step IDs
ALTER TABLE execution_events ALTER COLUMN step_id TYPE TEXT;

-- 5. Integrations Table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_live BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'connected',
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 6. Approvals Table
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_required TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

-- 7. Verification Records Table
CREATE TABLE IF NOT EXISTS verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID UNIQUE NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'verified',
  proof_hash TEXT NOT NULL,
  checks_performed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  signature TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Evidence Records Table
CREATE TABLE IF NOT EXISTS evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  method TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_ref_id TEXT,
  evidence_summary TEXT NOT NULL,
  status TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'demo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Generated Files Table
CREATE TABLE IF NOT EXISTS generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Policies Table
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Proof Ledger Table
CREATE TABLE IF NOT EXISTS proof_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  proof_hash TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Chaos Faults Table
CREATE TABLE IF NOT EXISTS chaos_faults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fault_type TEXT NOT NULL,
  target_action TEXT NOT NULL,
  probability NUMERIC NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_steps_task_id ON task_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_execution_events_task_id ON execution_events(task_id);
CREATE INDEX IF NOT EXISTS idx_execution_events_user_id ON execution_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_proof_ledger_task ON proof_ledger(task_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_task ON evidence_records(task_id);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE chaos_faults ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own records (and service_role bypasses automatically)
CREATE POLICY "Users view and update own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own task steps" ON task_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_steps.task_id AND tasks.user_id = auth.uid())
);
CREATE POLICY "Users view own execution events" ON execution_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own integrations" ON integrations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own approvals" ON approvals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own verifications" ON verification_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own evidence" ON evidence_records FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = evidence_records.task_id AND tasks.user_id = auth.uid())
);
CREATE POLICY "Users view own files" ON generated_files FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own schedules" ON schedules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own policies" ON policies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own ledger" ON proof_ledger FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own chaos faults" ON chaos_faults FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for generated files
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated_files', 'generated_files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload and read own generated files"
ON storage.objects FOR ALL
USING (bucket_id = 'generated_files' AND auth.uid()::text = (storage.foldername(name))[1]);
