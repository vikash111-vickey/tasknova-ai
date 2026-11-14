-- Realistic Demo Seed Data for Supabase

-- Insert Demo Profile
INSERT INTO profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@tasknova.local', 'Demo Operator', 'operator')
ON CONFLICT (id) DO NOTHING;

-- Insert Connectors / Integrations
INSERT INTO integrations (id, user_id, name, type, is_live, status, config)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Demo Email Service', 'email', false, 'connected', '{"provider": "demo"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Demo Slack Notifier', 'slack', false, 'connected', '{"channel": "#ops"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Demo Google Sheets', 'sheets', false, 'connected', '{"sheetId": "demo-sheet-1"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert Demo Tasks
INSERT INTO tasks (id, user_id, title, instructions, status, mode, priority, tags)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DEMO: Weekly Invoice Reconciliation', 'Match Stripe transaction receipts with database accounts and notify finance channel.', 'completed', 'demo', 'high', ARRAY['finance', 'stripe']),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'DEMO: Automated User Onboarding Verification', 'Validate identity proofs and send welcome pack through email connector.', 'executing', 'demo', 'normal', ARRAY['onboarding', 'email'])
ON CONFLICT (id) DO NOTHING;

-- Insert Task Steps
INSERT INTO task_steps (id, task_id, step_number, name, action, status)
VALUES
  ('step-00000000-0001', '10000000-0000-0000-0000-000000000001', 1, 'Fetch Stripe Receipts', 'stripe.list_charges', 'completed'),
  ('step-00000000-0002', '10000000-0000-0000-0000-000000000001', 2, 'Cross-reference LocalStore Invoices', 'store.match_invoices', 'completed'),
  ('step-00000000-0003', '10000000-0000-0000-0000-000000000001', 3, 'Generate Verification Proof Hash', 'verifier.sign_receipt', 'completed')
ON CONFLICT (id) DO NOTHING;

-- Insert Execution Events
INSERT INTO execution_events (id, task_id, user_id, type, message)
VALUES
  ('evt-00000000-0001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'status_change', 'Task initiated in demo environment.'),
  ('evt-00000000-0002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'verification', 'Proof hash verified.')
ON CONFLICT (id) DO NOTHING;

-- Insert Verification Record
INSERT INTO verification_records (id, task_id, user_id, status, proof_hash, checks_performed, signature)
VALUES
  ('ver-00000000-0001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'verified', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', ARRAY['schema_validation', 'signature_verification'], 'SIG_TASKNOVA_DEMO_PROOF_01')
ON CONFLICT (id) DO NOTHING;

-- Insert Notifications
INSERT INTO notifications (id, user_id, title, message, type, read)
VALUES
  ('notif-00000000-0001', '00000000-0000-0000-0000-000000000001', 'Task Completed (DEMO)', 'Weekly Invoice Reconciliation completed with 100% verified proof.', 'success', false),
  ('notif-00000000-0002', '00000000-0000-0000-0000-000000000001', 'Approval Required', 'New user onboarding dispatch requires confirmation.', 'warning', false)
ON CONFLICT (id) DO NOTHING;

-- Insert Policies
INSERT INTO policies (id, user_id, name, rule_type, rule_config)
VALUES
  ('pol-00000000-0001', '00000000-0000-0000-0000-000000000001', 'Require Human Approval for Batch Actions', 'require_approval', '{"threshold": 50}'::jsonb)
ON CONFLICT (id) DO NOTHING;
