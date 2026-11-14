import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import { createApp } from '../src/app';
import { getRepository } from '../src/repository';
import { Orchestrator } from '../src/services/execution/orchestrator';
import { ApprovalEngine } from '../src/services/execution/approvalEngine';
import { TaskStateMachine, IllegalStateTransitionError } from '../src/services/execution/stateMachine';
import { DemoStore } from '../src/connectors/demoStore';
import { Task, TaskStep } from '../src/types/models';

describe('Phase 4: Execution Engine & Resilience Testing', () => {
  const app = createApp();
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    DemoStore.getInstance().reset();

    const email = `exec_user_${Date.now()}@test.local`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'password123',
        fullName: 'Execution Operator',
      });
    userToken = res.body.data.token;
    userId = res.body.data.user.id;
  });

  describe('1. Task State Machine Transitions', () => {
    it('enforces legal transitions and rejects illegal transitions with IllegalStateTransitionError', async () => {
      const repo = getRepository();
      const task: Task = {
        id: `sm_task_${Date.now()}`,
        userId,
        title: 'State Machine Test Task',
        instructions: 'Test state machine transitions',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repo.createTask(task);

      const sm = TaskStateMachine.getInstance();

      // CREATED -> PLANNING (Legal)
      const t1 = await sm.transition(task.id, 'PLANNING', { userId });
      expect(t1.status).toBe('PLANNING');

      // PLANNING -> QUEUED (Legal)
      const t2 = await sm.transition(task.id, 'QUEUED', { userId });
      expect(t2.status).toBe('QUEUED');

      // QUEUED -> RUNNING (Legal)
      const t3 = await sm.transition(task.id, 'RUNNING', { userId });
      expect(t3.status).toBe('RUNNING');

      // RUNNING -> CREATED (Illegal! Throws IllegalStateTransitionError)
      await expect(sm.transition(task.id, 'CREATED', { userId })).rejects.toThrow(
        IllegalStateTransitionError
      );

      // Verify execution events logged for every legal transition
      const events = await repo.getExecutionEvents(task.id);
      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events.every((e) => e.type === 'status_change')).toBe(true);
    });
  });

  describe('2. Sequential & Parallel DAG Execution', () => {
    it('executes independent steps concurrently (cap 3) and dependent steps in order', async () => {
      const repo = getRepository();
      const taskId = `dag_task_${Date.now()}`;
      const task: Task = {
        id: taskId,
        userId,
        title: 'DAG Concurrency Test',
        instructions: 'Test parallel and sequential steps',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repo.createTask(task);

      // 3 independent steps
      const step1: TaskStep = {
        id: `step_p1_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Step Parallel 1',
        tool: 'store',
        action: 'store.match_invoices',
        status: 'pending',
        dependencies: [],
      };
      const step2: TaskStep = {
        id: `step_p2_${Date.now()}`,
        taskId,
        stepNumber: 2,
        name: 'Step Parallel 2',
        tool: 'stripe',
        action: 'stripe.get_payouts',
        status: 'pending',
        dependencies: [],
      };
      const step3: TaskStep = {
        id: `step_p3_${Date.now()}`,
        taskId,
        stepNumber: 3,
        name: 'Step Parallel 3',
        tool: 'calendar',
        action: 'calendar.check_availability',
        status: 'pending',
        dependencies: [],
      };

      // 1 dependent step depending on 1, 2, and 3
      const step4: TaskStep = {
        id: `step_dep4_${Date.now()}`,
        taskId,
        stepNumber: 4,
        name: 'Step Dependent 4',
        tool: 'reports',
        action: 'reports.generate_summary',
        status: 'pending',
        dependencies: [step1.id, step2.id, step3.id],
      };

      await repo.createTaskStep(step1);
      await repo.createTaskStep(step2);
      await repo.createTaskStep(step3);
      await repo.createTaskStep(step4);

      const orchestrator = Orchestrator.getInstance();
      const finalTask = await orchestrator.runTask(taskId, userId);

      expect(finalTask.status).toBe('COMPLETED');

      // Verify all steps are completed and verified
      const updatedSteps = await repo.getTaskSteps(taskId);
      expect(updatedSteps.every((s) => s.status === 'completed')).toBe(true);
      expect(updatedSteps.every((s) => s.verification_status === 'VERIFIED')).toBe(true);
    });

    it('dependent step does not start until prerequisites have verification_status VERIFIED', async () => {
      const repo = getRepository();
      const taskId = `dep_verify_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Prerequisite Verification Test',
        instructions: 'Test dependency enforcement',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const parentStep: TaskStep = {
        id: `parent_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Parent Data Step',
        tool: 'store',
        action: 'store.match_invoices',
        status: 'pending',
      };

      const childStep: TaskStep = {
        id: `child_${Date.now()}`,
        taskId,
        stepNumber: 2,
        name: 'Child Report Step',
        tool: 'reports',
        action: 'reports.generate_summary',
        status: 'pending',
        dependencies: [parentStep.id],
      };

      await repo.createTaskStep(parentStep);
      await repo.createTaskStep(childStep);

      const orchestrator = Orchestrator.getInstance();
      await orchestrator.runTask(taskId, userId);

      const steps = await repo.getTaskSteps(taskId);
      const child = steps.find((s) => s.id === childStep.id);
      expect(child?.status).toBe('completed');
      expect(child?.verification_status).toBe('VERIFIED');
    });
  });

  describe('3. Human-in-the-Loop Approval Engine & Bound Invalidation', () => {
    it('halts execution at approval-required step, transitions to AWAITING_APPROVAL, and creates bound approval record', async () => {
      const repo = getRepository();
      const taskId = `approval_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Approval Blocking Test',
        instructions: 'Test approval pause',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const prepStep: TaskStep = {
        id: `prep_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Prepare Content',
        tool: 'reports',
        action: 'reports.generate_summary',
        status: 'pending',
      };

      const emailStep: TaskStep = {
        id: `email_${Date.now()}`,
        taskId,
        stepNumber: 2,
        name: 'Send Customer Email',
        tool: 'email',
        action: 'email.send',
        input: { recipient: 'finance@tasknova.local', subject: 'Financial Summary' },
        requires_approval: true,
        status: 'pending',
        dependencies: [prepStep.id],
      };

      await repo.createTaskStep(prepStep);
      await repo.createTaskStep(emailStep);

      const orchestrator = Orchestrator.getInstance();
      const pausedTask = await orchestrator.runTask(taskId, userId);

      // Must be blocked in AWAITING_APPROVAL
      expect(pausedTask.status).toBe('AWAITING_APPROVAL');

      // Email step must NOT have executed yet
      const steps = await repo.getTaskSteps(taskId);
      const postEmail = steps.find((s) => s.id === emailStep.id);
      expect(postEmail?.status).toBe('pending');

      // Check approval record created
      const approvals = await repo.getApprovals(userId);
      const taskApproval = approvals.find((a) => a.taskId === taskId);
      expect(taskApproval).toBeDefined();
      expect(taskApproval?.status).toBe('pending');
      expect(taskApproval?.payloadHash).toBeDefined();
    });

    it('editing payload invalidates old approval and requires fresh authorization', async () => {
      const approvalEngine = ApprovalEngine.getInstance();
      const taskId = `edit_task_${Date.now()}`;
      const stepId = `step_edit_${Date.now()}`;

      const repo = getRepository();
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Edit Approval Test Task',
        instructions: 'Test bound approval edit invalidation',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const initialPayload = {
        recipient: 'finance@tasknova.local',
        subject: 'Weekly Report',
      };

      const approval = await approvalEngine.createApprovalRequest({
        taskId,
        stepId,
        action: 'email.send',
        payload: initialPayload,
        userId,
      });

      // 1. Operator approves initial payload
      const approved = await approvalEngine.approve(approval.id, userId);
      expect(approved.status).toBe('approved');

      // 2. Someone tries to modify the recipient (adversarial or edit)
      const editedPayload = {
        recipient: 'attacker@external.evil',
        subject: 'Weekly Report Exfiltrated',
      };

      const edited = await approvalEngine.editPayload(approval.id, userId, editedPayload);

      // Old approval must be invalidated! Status must be reset to pending!
      expect(edited.status).toBe('pending');
      expect(edited.payloadHash).not.toBe(approval.payloadHash);

      // Check step is NOT approved with edited payload
      const check = await approvalEngine.isStepApproved(taskId, stepId, 'email.send', editedPayload, userId);
      expect(check.approved).toBe(false);
      expect(check.error).toContain('awaiting operator authorization');
    });

    it('expired approvals cannot execute', async () => {
      const repo = getRepository();
      const approvalEngine = ApprovalEngine.getInstance();
      const taskId = `expire_task_${Date.now()}`;
      const stepId = `step_expire_${Date.now()}`;

      await repo.createTask({
        id: taskId,
        userId,
        title: 'Expire Test Task',
        instructions: 'Test expired approval rejection',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create approval that expired in the past
      const approval = await approvalEngine.createApprovalRequest({
        taskId,
        stepId,
        action: 'email.send',
        payload: { to: 'test@example.com' },
        userId,
        expiryMinutes: -1, // already expired!
      });

      await expect(approvalEngine.approve(approval.id, userId)).rejects.toThrow(
        /expired/i
      );
    });
  });

  describe('4. Reliability: Idempotency, Cancellation & Duplicate Runs', () => {
    it('duplicate run request returns the existing execution without starting a second one', async () => {
      const repo = getRepository();
      const taskId = `dup_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Duplicate Run Lock Test',
        instructions: 'Test execution lock',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const step: TaskStep = {
        id: `slow_step_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Inspection Step',
        tool: 'store',
        action: 'store.match_invoices',
        status: 'pending',
      };
      await repo.createTaskStep(step);

      const orchestrator = Orchestrator.getInstance();

      // Launch run 1
      const run1 = orchestrator.runTask(taskId, userId);
      expect(orchestrator.isTaskRunning(taskId)).toBe(true);

      // Launch run 2 immediately
      const run2 = orchestrator.runTask(taskId, userId);

      // Must be exact same promise reference
      expect(run1).toBe(run2);

      const [res1, res2] = await Promise.all([run1, run2]);
      expect(res1.status).toBe('COMPLETED');
      expect(res2.status).toBe('COMPLETED');
    });

    it('cancellation stops pending steps and preserves completed work', async () => {
      const repo = getRepository();
      const taskId = `cancel_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Cancellation Test',
        instructions: 'Test stopping pipeline',
        status: 'CREATED',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const completedStep: TaskStep = {
        id: `comp_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Completed First Step',
        tool: 'store',
        action: 'store.match_invoices',
        status: 'completed',
        verification_status: 'VERIFIED',
        output: { result: 'preserved' },
      };

      const pendingStep: TaskStep = {
        id: `pend_${Date.now()}`,
        taskId,
        stepNumber: 2,
        name: 'Pending Second Step',
        tool: 'email',
        action: 'email.send',
        status: 'pending',
      };

      await repo.createTaskStep(completedStep);
      await repo.createTaskStep(pendingStep);

      const orchestrator = Orchestrator.getInstance();
      const cancelledTask = await orchestrator.cancelTask(taskId, userId, 'Operator clicked cancel');

      expect(cancelledTask.status).toBe('CANCELLED');

      const steps = await repo.getTaskSteps(taskId);
      const s1 = steps.find((s) => s.id === completedStep.id);
      const s2 = steps.find((s) => s.id === pendingStep.id);

      // Completed step preserved!
      expect(s1?.status).toBe('completed');
      expect(s1?.output).toEqual({ result: 'preserved' });

      // Pending step cancelled/skipped!
      expect(s2?.status).toBe('skipped');
    });

    it('resumes interrupted tasks safely', async () => {
      const repo = getRepository();
      const taskId = `resume_task_${Date.now()}`;
      await repo.createTask({
        id: taskId,
        userId,
        title: 'Resume Interrupted Task',
        instructions: 'Test resume after simulated restart',
        status: 'RUNNING', // was in the middle of running
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Step 1 was already finished before restart
      const step1: TaskStep = {
        id: `res_step1_${Date.now()}`,
        taskId,
        stepNumber: 1,
        name: 'Already Completed Step',
        tool: 'store',
        action: 'store.match_invoices',
        status: 'completed',
        verification_status: 'VERIFIED',
        output: { cached: true },
      };

      // Step 2 was pending when crash happened
      const step2: TaskStep = {
        id: `res_step2_${Date.now()}`,
        taskId,
        stepNumber: 2,
        name: 'Unfinished Step',
        tool: 'reports',
        action: 'reports.generate_summary',
        status: 'pending',
        dependencies: [step1.id],
      };

      await repo.createTaskStep(step1);
      await repo.createTaskStep(step2);

      const orchestrator = Orchestrator.getInstance();
      const resumed = await orchestrator.runTask(taskId, userId);

      expect(resumed.status).toBe('COMPLETED');

      const steps = await repo.getTaskSteps(taskId);
      expect(steps.every((s) => s.status === 'completed')).toBe(true);
    });
  });

  describe('5. Acceptance Test: Full End-to-End Weekly Report Execution', () => {
    it('generates plan, pauses for email approval, produces real PDF, demo Drive upload and demo outbox record with full audit event trail', async () => {
      const instruction =
        'Reconcile Stripe payouts with internal store orders from the past 7 days, generate an executive summary report, and email it to finance@tasknova.local';

      // 1. Generate plan via Phase 3 Planning API
      const planRes = await request(app)
        .post('/api/planning/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ instruction });

      expect(planRes.status).toBe(201);
      const taskId = planRes.body.data.task.id;
      expect(taskId).toBeDefined();

      // 2. Approve overall plan to transition to pending
      await request(app)
        .post(`/api/planning/${taskId}/approve-plan`)
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      // 3. Trigger execution run via /api/executions/:id/run
      const orchestrator = Orchestrator.getInstance();
      const pausedTask = await orchestrator.runTask(taskId, userId);

      // Workflow reaches email step and pauses at AWAITING_APPROVAL!
      expect(pausedTask.status).toBe('AWAITING_APPROVAL');

      // Check real PDF was generated in the reports step
      const repo = getRepository();
      const files = await repo.getGeneratedFilesByTaskId(taskId);
      expect(files.length).toBeGreaterThanOrEqual(1);
      const pdfFile = files.find((f) => f.mimeType === 'application/pdf');
      expect(pdfFile).toBeDefined();
      expect(pdfFile?.fileSize).toBeGreaterThan(500);
      expect(fs.existsSync(pdfFile!.storagePath)).toBe(true);

      // Verify file download endpoint works
      const dlRes = await request(app)
        .get(`/api/files/${pdfFile!.id}/download`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(dlRes.status).toBe(200);
      expect(dlRes.headers['content-type']).toContain('application/pdf');

      // 4. Approve the pending email step
      const approvals = await repo.getApprovals(userId);
      const emailApproval = approvals.find((a) => a.taskId === taskId && a.status === 'pending');
      expect(emailApproval).toBeDefined();

      // Approve via API
      const approveActionRes = await request(app)
        .post(`/api/approvals/${emailApproval!.id}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ note: 'Executive report verified, approved for dispatch.' });
      expect(approveActionRes.status).toBe(200);

      // 5. Resume execution to completion
      const completedTask = await orchestrator.runTask(taskId, userId);
      expect(completedTask.status).toBe('COMPLETED');

      // 6. Verify Demo Outbox contains the accepted message
      const demoStore = DemoStore.getInstance();
      expect(demoStore.outbox.length).toBeGreaterThanOrEqual(1);
      const sentEmail = demoStore.outbox.find((o) => o.recipient === 'finance@tasknova.local');
      expect(sentEmail).toBeDefined();
      expect(sentEmail?.status).toBe('accepted_by_demo_mail_server');
      expect(sentEmail?.mode).toBe('demo');

      // 7. Verify all execution events persisted in chronological order
      const events = await repo.getExecutionEvents(taskId);
      expect(events.length).toBeGreaterThanOrEqual(5);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('status_change');
      expect(eventTypes).toContain('step_start');
      expect(eventTypes).toContain('step_finish');
      expect(eventTypes).toContain('verification');
    });
  });
});
