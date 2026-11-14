import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export async function seedLocalStore(): Promise<void> {
  const dataDir = path.resolve(__dirname, '../../data');
  const storePath = path.join(dataDir, 'store.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const salt = await bcrypt.genSalt(10);
  const demoPasswordHash = await bcrypt.hash('demo12345', salt);
  const now = new Date().toISOString();

  const demoUserId = '00000000-0000-0000-0000-000000000001';
  const demoTaskId1 = '10000000-0000-0000-0000-000000000001';
  const demoTaskId2 = '10000000-0000-0000-0000-000000000002';

  const seededData = {
    profiles: [
      {
        id: demoUserId,
        email: 'demo@tasknova.local',
        fullName: 'Demo Operator',
        role: 'operator',
        passwordHash: demoPasswordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'user_b@tasknova.local',
        fullName: 'Isolated User B',
        role: 'user',
        passwordHash: demoPasswordHash,
        createdAt: now,
        updatedAt: now,
      },
    ],
    tasks: [
      {
        id: demoTaskId1,
        userId: demoUserId,
        title: 'DEMO: Weekly Invoice Reconciliation',
        instructions: 'Match Stripe transaction receipts with database accounts and notify finance channel.',
        status: 'completed',
        mode: 'demo',
        priority: 'high',
        tags: ['finance', 'reconciliation', 'stripe'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: demoTaskId2,
        userId: demoUserId,
        title: 'DEMO: Automated User Onboarding Verification',
        instructions: 'Validate identity proofs and send welcome pack through email connector.',
        status: 'executing',
        mode: 'demo',
        priority: 'normal',
        tags: ['onboarding', 'email', 'identity'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '20000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002', // User B's task for isolation testing
        title: 'User B Confidential Task',
        instructions: 'Should never be visible to User A.',
        status: 'pending',
        mode: 'demo',
        createdAt: now,
        updatedAt: now,
      },
    ],
    taskSteps: [
      {
        id: 'step-101',
        taskId: demoTaskId1,
        stepNumber: 1,
        name: 'Fetch Stripe Receipts',
        action: 'stripe.list_charges',
        status: 'completed',
        startedAt: now,
        completedAt: now,
      },
      {
        id: 'step-102',
        taskId: demoTaskId1,
        stepNumber: 2,
        name: 'Cross-reference LocalStore Invoices',
        action: 'store.match_invoices',
        status: 'completed',
        startedAt: now,
        completedAt: now,
      },
      {
        id: 'step-103',
        taskId: demoTaskId1,
        stepNumber: 3,
        name: 'Generate Verification Proof Hash',
        action: 'verifier.sign_receipt',
        status: 'completed',
        startedAt: now,
        completedAt: now,
      },
    ],
    executionEvents: [
      {
        id: 'evt-101',
        taskId: demoTaskId1,
        userId: demoUserId,
        type: 'status_change',
        message: 'Task initiated in demo environment.',
        timestamp: now,
      },
      {
        id: 'evt-102',
        taskId: demoTaskId1,
        userId: demoUserId,
        type: 'step_finish',
        message: 'Step 1: Stripe charges collected.',
        timestamp: now,
      },
      {
        id: 'evt-103',
        taskId: demoTaskId1,
        userId: demoUserId,
        type: 'verification',
        message: 'Cryptographic proof hash computed.',
        timestamp: now,
      },
    ],
    integrations: [
      {
        id: 'conn-1',
        userId: demoUserId,
        name: 'Demo Email Service',
        type: 'email',
        isLive: false,
        status: 'connected',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'conn-2',
        userId: demoUserId,
        name: 'Demo Slack Notifier',
        type: 'slack',
        isLive: false,
        status: 'connected',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'conn-3',
        userId: demoUserId,
        name: 'Demo Google Sheets',
        type: 'sheets',
        isLive: false,
        status: 'connected',
        createdAt: now,
        updatedAt: now,
      },
    ],
    approvals: [
      {
        id: 'app-1',
        taskId: demoTaskId2,
        userId: demoUserId,
        title: 'Approve High-Volume Dispatch',
        description: 'Workflow requests permission to notify 250 recipients.',
        actionRequired: 'Authorize email batch delivery',
        status: 'pending',
        createdAt: now,
      },
    ],
    verifications: [
      {
        id: 'ver-1',
        taskId: demoTaskId1,
        userId: demoUserId,
        status: 'verified',
        proofHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        checksPerformed: ['schema_validation', 'signature_verification', 'balance_reconciliation'],
        signature: 'SIG_TASKNOVA_DEMO_PROOF_01',
        verifiedAt: now,
      },
    ],
    generatedFiles: [],
    notifications: [
      {
        id: 'notif-1',
        userId: demoUserId,
        title: 'Task Completed (DEMO)',
        message: 'Weekly Invoice Reconciliation completed with 100% verified proof.',
        type: 'success',
        read: false,
        link: '/executions',
        createdAt: now,
      },
      {
        id: 'notif-2',
        userId: demoUserId,
        title: 'Approval Required',
        message: 'New user onboarding dispatch requires your confirmation.',
        type: 'warning',
        read: false,
        link: '/approvals',
        createdAt: now,
      },
    ],
    schedules: [
      {
        id: 'sched-1',
        userId: demoUserId,
        taskId: demoTaskId1,
        cronExpression: '0 9 * * 1', // Weekly Mondays at 9am
        isActive: true,
        createdAt: now,
      },
    ],
    policies: [
      {
        id: 'pol-1',
        userId: demoUserId,
        name: 'Require Human Approval for Batch Actions',
        ruleType: 'require_approval',
        ruleConfig: { threshold: 50 },
        isActive: true,
        createdAt: now,
      },
    ],
    proofLedger: [
      {
        id: 'pledge-1',
        taskId: demoTaskId1,
        userId: demoUserId,
        action: 'Verification: verified',
        proofHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        timestamp: now,
      },
    ],
  };

  fs.writeFileSync(storePath, JSON.stringify(seededData, null, 2), 'utf-8');
  console.log(`[Seed] Successfully seeded LocalStore at: ${storePath}`);
}

seedLocalStore().catch((err) => {
  console.error('[Seed Error]', err);
});
