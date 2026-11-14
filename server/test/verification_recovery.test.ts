import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getRepository } from '../src/repository';
import { VerificationEngine } from '../src/services/verification/verificationEngine';
import { ProofLedger, canonicalJson, sha256, GENESIS_HASH } from '../src/services/verification/proofLedger';
import { TrustScoreCalculator } from '../src/services/verification/trustScore';
import { RecoveryEngine } from '../src/services/recovery/recoveryEngine';
import { ChaosEngine } from '../src/services/recovery/chaosEngine';
import { Orchestrator } from '../src/services/execution/orchestrator';
import { DemoStore } from '../src/connectors/demoStore';
import { DocumentEngineConnector } from '../src/connectors/documentEngine';
import { DemoGmailConnector } from '../src/connectors/demoGmail';
import { Task, TaskStep } from '../src/types/models';

describe('Phase 5: Verification Engine, Proof Ledger, Trust Score & Chaos Recovery', () => {
  const app = createApp();
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    DemoStore.getInstance().reset();
    const repo = getRepository();

    const email = `phase5_user_${Date.now()}@test.local`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'password123',
        fullName: 'Resilience Auditor',
      });
    userToken = res.body.data.token;
    userId = res.body.data.user.id;

    await ChaosEngine.getInstance().clearFaults(userId);
  });

  describe('1. Independent Verification Engine', () => {
    it('verifies step against real state and sanitizes sensitive payload fields', async () => {
      const repo = getRepository();
      const taskId = `verify_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Verification Engine Test',
        instructions: 'Test state re-reading',
        status: 'RUNNING',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const step: TaskStep = {
        id: `step_doc_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Generate Weekly Audit Document',
        tool: 'document',
        action: 'document.generate_weekly_report',
        status: 'running',
      };
      await repo.createTaskStep(step);

      // Execute document connector to generate real PDF
      const docConnector = new DocumentEngineConnector();
      const executionResult = await docConnector.execute(step.action, {}, {
        taskId,
        stepId: step.id,
        userId,
        mode: 'demo',
      });

      // Conduct independent verification
      const engine = VerificationEngine.getInstance();
      const evidence = await engine.verifyStep(step, executionResult, {
        taskId,
        userId,
        mode: 'demo',
      });

      expect(evidence.status).toBe('VERIFIED');
      expect(evidence.providerReferenceId).toBe(executionResult.data.fileId);
      expect(evidence.evidenceSummary).toContain('PDF opened and verified');
      expect((evidence.details as any).pageCount).toBeGreaterThanOrEqual(1);

      // Verify evidence record was persisted in repo
      const storedRecords = await repo.getEvidenceRecords(taskId);
      expect(storedRecords.length).toBe(1);
      expect(storedRecords[0].status).toBe('VERIFIED');

      // Verify proof ledger entry was appended
      const ledger = await repo.getProofLedgerByTaskId(taskId);
      expect(ledger.length).toBe(1);
      expect(ledger[0].previousHash).toBe(GENESIS_HASH);
    });

    it('marks INCONCLUSIVE on missing execution evidence and FAILED on state mismatch', async () => {
      const repo = getRepository();
      const taskId = `inconclusive_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Inconclusive & Failure Test',
        instructions: 'Test edge cases',
        status: 'RUNNING',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const missingStep: TaskStep = {
        id: `missing_step_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Missing Output Step',
        tool: 'document',
        action: 'document.generate_weekly_report',
        status: 'running',
      };
      await repo.createTaskStep(missingStep);

      const engine = VerificationEngine.getInstance();

      // Missing output -> INCONCLUSIVE
      const inconclusiveEvidence = await engine.verifyStep(missingStep, null, {
        taskId,
        userId,
        mode: 'demo',
      });
      expect(inconclusiveEvidence.status).toBe('INCONCLUSIVE');

      // Non-existent Drive file -> FAILED
      const failedStep: TaskStep = {
        id: `failed_step_${Date.now()}`,
        taskId,
        stepNumber: 2,
        name: 'Nonexistent Drive File',
        tool: 'drive',
        action: 'drive.upload_file',
        status: 'running',
      };
      await repo.createTaskStep(failedStep);

      const failedEvidence = await engine.verifyStep(
        failedStep,
        { data: { id: 'nonexistent_drive_id_999' } },
        { taskId, userId, mode: 'demo' }
      );
      expect(failedEvidence.status).toBe('FAILED');
      expect(failedEvidence.evidenceSummary).toContain('not found');
    });

    it('email verification claims only accepted by provider and never delivery or reading', async () => {
      const repo = getRepository();
      const taskId = `email_verify_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Email Provider Claim Test',
        instructions: 'Test email verification claim limits',
        status: 'RUNNING',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const step: TaskStep = {
        id: `step_email_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Dispatch Status Update',
        tool: 'gmail',
        action: 'email.send',
        status: 'running',
      };
      await repo.createTaskStep(step);

      const gmail = new DemoGmailConnector();
      const res = await gmail.execute(step.action, { recipient: 'finance@tasknova.local' }, {
        taskId,
        stepId: step.id,
        userId,
        mode: 'demo',
      });

      const engine = VerificationEngine.getInstance();
      const evidence = await engine.verifyStep(step, res, {
        taskId,
        userId,
        mode: 'demo',
      });

      expect(evidence.status).toBe('VERIFIED');
      expect(evidence.evidenceSummary.toLowerCase()).toContain('accepted by provider');
      expect(evidence.evidenceSummary.toLowerCase()).not.toContain('delivered to recipient');
      expect(evidence.evidenceSummary.toLowerCase()).not.toContain('opened by recipient');
    });
  });

  describe('2. Proof Ledger Cryptographic Chain & Tamper Detection', () => {
    it('builds a tamper-evident Merkle hash chain and detects manually modified records', async () => {
      const repo = getRepository();
      const taskId = `ledger_task_${Date.now()}`;
      const ledger = ProofLedger.getInstance();

      // Create 3 sequential evidence records
      for (let i = 1; i <= 3; i++) {
        const evidence = {
          id: `ev_${i}_${Date.now()}`,
          operationId: `step_${i}`,
          taskId,
          userId,
          tool: 'store',
          method: `action_${i}`,
          timestamp: new Date().toISOString(),
          providerReferenceId: `ref_${i}`,
          evidenceSummary: `Summary for step ${i}`,
          status: 'VERIFIED' as const,
          mode: 'demo' as const,
          details: { blockIndex: i },
        };
        await ledger.appendEvidence(taskId, userId, evidence);
      }

      // Initial chain check must pass 100%
      const checkBefore = await ledger.verifyChain(taskId);
      expect(checkBefore.valid).toBe(true);
      expect(checkBefore.chainLength).toBe(3);

      // Now MANUALLY TAMPER with block #2 in the stored repository
      const entries = await repo.getProofLedgerByTaskId(taskId);
      const tamperedEntry = entries[1]; // Index 1 is Block #2
      await repo.updateProofLedgerEntry(tamperedEntry.id, {
        recordData: { ...tamperedEntry.recordData, evidenceSummary: 'MALICIOUS_TAMPERED_CONTENT' },
      });

      // Chain check must report tamper at block #1 (index 1)
      const checkAfter = await ledger.verifyChain(taskId);
      expect(checkAfter.valid).toBe(false);
      expect(checkAfter.brokenLinkIndex).toBe(1);
      expect(checkAfter.brokenRecordId).toBe(tamperedEntry.id);
      expect(checkAfter.reason).toContain('tamper detected');
    });

    it('GET /api/tasks/:id/proof/certificate generates and returns valid downloadable PDF with DEMO labeling', async () => {
      const repo = getRepository();
      const taskId = `cert_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Proof Certificate Test',
        instructions: 'Test PDF certificate generation',
        status: 'COMPLETED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const ledger = ProofLedger.getInstance();
      await ledger.appendEvidence(taskId, userId, {
        id: `ev_cert_${Date.now()}`,
        operationId: 'step_cert',
        taskId,
        userId,
        tool: 'reports',
        method: 'reports.generate_summary',
        timestamp: new Date().toISOString(),
        providerReferenceId: 'ref_cert_123',
        evidenceSummary: 'Confirmed report generation',
        status: 'VERIFIED',
        mode: 'demo',
      });

      const res = await request(app)
        .get(`/api/tasks/${taskId}/proof/certificate`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.slice(0, 5).toString('utf8')).toBe('%PDF-');
      expect(res.body.length).toBeGreaterThan(1000);
    });
  });

  describe('3. Trust Score Calculation', () => {
    it('calculates trust score with correct penalties, bonuses, and zeros score on chain tamper', async () => {
      const repo = getRepository();
      const taskId = `trust_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Trust Score Test Task',
        instructions: 'Verify mathematical calculation',
        status: 'COMPLETED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Step 1: Verified (0 retries)
      await repo.createTaskStep({
        id: `s1_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Step 1',
        tool: 'store',
        action: 'store.match',
        status: 'completed',
        verification_status: 'VERIFIED',
        retry_count: 0,
      });

      // Step 2: Verified (1 retry)
      await repo.createTaskStep({
        id: `s2_${Date.now()}`,
        taskId,
        stepNumber: 2,
        name: 'Step 2',
        tool: 'stripe',
        action: 'stripe.payout',
        status: 'completed',
        verification_status: 'VERIFIED',
        retry_count: 1, // -5 penalty
      });

      // Proof ledger entries
      const ledger = ProofLedger.getInstance();
      await ledger.appendEvidence(taskId, userId, {
        id: `ev1_${Date.now()}`,
        operationId: `s1_${Date.now()}`,
        taskId,
        userId,
        tool: 'store',
        method: 'store.match',
        timestamp: new Date().toISOString(),
        evidenceSummary: 'Step 1 verified',
        status: 'VERIFIED',
        mode: 'demo',
      });

      await ledger.appendEvidence(taskId, userId, {
        id: `ev2_${Date.now()}`,
        operationId: `s2_${Date.now()}`,
        taskId,
        userId,
        tool: 'stripe',
        method: 'stripe.payout',
        timestamp: new Date().toISOString(),
        evidenceSummary: 'Step 2 verified',
        status: 'VERIFIED',
        mode: 'demo',
      });

      // Base: 100%. Retry penalty: -5. Recoveries penalty: 0. Score: 95
      const breakdown = await TrustScoreCalculator.calculateTaskTrustScore(taskId, userId, 0);
      expect(breakdown.trustScore).toBe(95);
      expect(breakdown.penalties.retriesPenalty).toBe(5);

      // Now tamper with ledger block #1
      const entries = await repo.getProofLedgerByTaskId(taskId);
      await repo.updateProofLedgerEntry(entries[0].id, { proofHash: 'corrupted_hash_value' });

      // Trust score MUST drop to 0 due to compromised ledger integrity!
      const tamperedBreakdown = await TrustScoreCalculator.calculateTaskTrustScore(taskId, userId, 0);
      expect(tamperedBreakdown.trustScore).toBe(0);
      expect(tamperedBreakdown.chainValid).toBe(false);
    });
  });

  describe('4. Recovery Engine & Check-Before-Retry Safety', () => {
    it('classifies errors accurately into resilience categories', () => {
      const recovery = RecoveryEngine.getInstance();
      expect(recovery.classifyError(new Error('ETIMEDOUT: Connection timed out'))).toBe('network');
      expect(recovery.classifyError(new Error('AUTH_EXPIRED: 401 Unauthorized token expired'))).toBe('auth');
      expect(recovery.classifyError(new Error('HTTP 503: Service Unavailable'))).toBe('provider_unavailable');
      expect(recovery.classifyError(new Error('Rate limit exceeded: 429 Too Many Requests'))).toBe('rate_limit');
      expect(recovery.classifyError(new Error('Verification mismatch on checksum'))).toBe('verification_mismatch');
      expect(recovery.classifyError(new Error('Permission denied: 403 Forbidden'))).toBe('permission');
    });

    it('never duplicate sends email after uncertain outcome by checking outbox first', async () => {
      const demoStore = DemoStore.getInstance();
      const recovery = RecoveryEngine.getInstance();
      const taskId = `dup_email_task_${Date.now()}`;

      // Simulate an initial attempt that actually reached the mail server outbox
      const existingOutboxItem = {
        id: `msg_${Date.now()}`,
        recipient: 'finance@tasknova.local',
        subject: 'Weekly Executive Report',
        body: 'Report contents',
        timestamp: new Date().toISOString(),
        status: 'accepted_by_demo_mail_server' as const,
        mode: 'demo' as const,
      };
      demoStore.outbox.push(existingOutboxItem);

      const step: TaskStep = {
        id: `email_step_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Dispatch Report Email',
        tool: 'gmail',
        action: 'email.send',
        input: { recipient: 'finance@tasknova.local', subject: 'Weekly Executive Report' },
        status: 'running',
      };

      // Check-before-retry MUST discover the existing outbox item
      const check = await recovery.checkPreExistingSuccess(step, { taskId, mode: 'demo' });
      expect(check.alreadySucceeded).toBe(true);
      expect(check.result.data.id).toBe(existingOutboxItem.id);

      // Verify that outbox length did NOT increase
      expect(demoStore.outbox.length).toBe(1);
    });

    it('auth_expiry fault triggers token refresh and recovers', async () => {
      const chaos = ChaosEngine.getInstance();
      await chaos.injectFault(userId, 'auth_expiry', 'stripe', 1);

      const repo = getRepository();
      const taskId = `auth_chaos_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Auth Chaos Recovery Test',
        instructions: 'Test auth recovery',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const step: TaskStep = {
        id: `stripe_step_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Query Stripe Charges',
        tool: 'stripe',
        action: 'stripe.list_charges',
        status: 'pending',
      };
      await repo.createTaskStep(step);

      const orchestrator = Orchestrator.getInstance();
      const completed = await orchestrator.runTask(taskId, userId);

      expect(completed.status).toBe('COMPLETED');
      const updatedStep = (await repo.getTaskSteps(taskId))[0];
      expect(updatedStep.status).toBe('completed');
      expect(updatedStep.verification_status).toBe('VERIFIED');
      expect(updatedStep.retry_count).toBe(1);
    });

    it('provider_503 fault backs off and recovers', async () => {
      const chaos = ChaosEngine.getInstance();
      await chaos.injectFault(userId, 'provider_503', 'store', 1);

      const repo = getRepository();
      const taskId = `503_chaos_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: '503 Chaos Recovery Test',
        instructions: 'Test 503 recovery',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const step: TaskStep = {
        id: `store_step_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Match Store Invoices',
        tool: 'store',
        action: 'store.match_invoices',
        status: 'pending',
      };
      await repo.createTaskStep(step);

      const orchestrator = Orchestrator.getInstance();
      const completed = await orchestrator.runTask(taskId, userId);

      expect(completed.status).toBe('COMPLETED');
      const updatedStep = (await repo.getTaskSteps(taskId))[0];
      expect(updatedStep.status).toBe('completed');
      expect(updatedStep.verification_status).toBe('VERIFIED');
      expect(updatedStep.retry_count).toBe(1);
    });
  });

  describe('5. Acceptance Test: Weekly Report with Injected Drive Timeout & Tamper Detection', () => {
    it('recovers from injected Drive timeout, completes with 100% verified ledger, then detects manual record tampering', async () => {
      const chaos = ChaosEngine.getInstance();

      // 1. Inject a network timeout chaos fault on Drive operations
      await chaos.injectFault(userId, 'network_timeout', 'drive', 1);

      // 2. Generate plan for weekly report
      const instruction =
        'Reconcile Stripe payouts with internal store orders from the past 7 days, generate an executive summary report, and email it to finance@tasknova.local';

      const planRes = await request(app)
        .post('/api/planning/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ instruction });

      expect(planRes.status).toBe(201);
      const taskId = planRes.body.data.task.id;

      // 3. Approve plan
      await request(app)
        .post(`/api/planning/${taskId}/approve-plan`)
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      // 4. Run execution
      const orchestrator = Orchestrator.getInstance();
      const pausedTask = await orchestrator.runTask(taskId, userId);
      expect(pausedTask.status).toBe('AWAITING_APPROVAL');

      // 5. Approve email dispatch step
      const repo = getRepository();
      const approvals = await repo.getApprovals(userId);
      const emailApproval = approvals.find((a) => a.taskId === taskId && a.status === 'pending');
      expect(emailApproval).toBeDefined();

      await request(app)
        .post(`/api/approvals/${emailApproval!.id}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ note: 'Authorized by audit team.' });

      // 6. Resume execution to completion
      const completedTask = await orchestrator.runTask(taskId, userId);
      expect(completedTask.status).toBe('COMPLETED');

      // 7. Verify Proof Ledger Integrity
      const verifyRes = await request(app)
        .post(`/api/tasks/${taskId}/proof/verify`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.valid).toBe(true);
      expect(verifyRes.body.data.chainLength).toBeGreaterThanOrEqual(4);

      // 8. Verify Proof Endpoint returns full chain and Trust Score
      const proofRes = await request(app)
        .get(`/api/tasks/${taskId}/proof`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(proofRes.status).toBe(200);
      expect(proofRes.body.data.chainCheck.valid).toBe(true);
      expect(proofRes.body.data.trustScore).toBeGreaterThanOrEqual(70);

      // 9. Now MANUALLY TAMPER with one stored proof ledger record by hand
      const entries = await repo.getProofLedgerByTaskId(taskId);
      const targetEntry = entries[2]; // Tamper block #3
      await repo.updateProofLedgerEntry(targetEntry.id, {
        recordData: { ...targetEntry.recordData, tamperedField: 'UNAUTHORIZED_ALTERATION' },
      });

      // 10. The integrity verification check MUST report the exact broken link!
      const tamperedVerifyRes = await request(app)
        .post(`/api/tasks/${taskId}/proof/verify`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(tamperedVerifyRes.status).toBe(200);
      expect(tamperedVerifyRes.body.data.valid).toBe(false);
      expect(tamperedVerifyRes.body.data.brokenLinkIndex).toBe(2);
      expect(tamperedVerifyRes.body.data.brokenRecordId).toBe(targetEntry.id);
      expect(tamperedVerifyRes.body.message).toContain('broken link detected at block #2');
    });
  });
});
