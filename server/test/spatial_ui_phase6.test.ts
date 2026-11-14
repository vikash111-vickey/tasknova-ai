import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getRepository } from '../src/repository';
import { DemoStore } from '../src/connectors/demoStore';
import { ChaosEngine } from '../src/services/recovery/chaosEngine';

describe('Phase 6: Spatial UI & Backend Integration Acceptance', () => {
  const app = createApp();
  let token: string;
  let userId: string;

  beforeEach(async () => {
    DemoStore.getInstance().reset();
    const email = `spatial_phase6_${Date.now()}@test.local`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'password123',
        fullName: 'Spatial UI Operator',
      });
    token = regRes.body.data.token;
    userId = regRes.body.data.user.id;
    await ChaosEngine.getInstance().clearFaults(userId);
  });

  it(
    'exercises full weekly-report workflow: plan, SSE execution, approval, completion, and proof integrity',
    async () => {
    // 1. Submit Weekly Report Instruction
    const planRes = await request(app)
      .post('/api/planning/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        instruction: 'Generate weekly sales report and send summary email to team',
      });

    expect(planRes.status).toBe(201);
    expect(planRes.body.success).toBe(true);
    const task = planRes.body.data.task;
    const plan = planRes.body.data.plan;
    expect(plan.steps.length).toBeGreaterThanOrEqual(4);

    // 2. Approve the Plan
    const approvePlanRes = await request(app)
      .post(`/api/planning/${task.id}/approve-plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(approvePlanRes.status).toBe(200);

    // 3. Start Execution
    const runRes = await request(app)
      .post(`/api/executions/${task.id}/run`)
      .set('Authorization', `Bearer ${token}`);
    expect(runRes.status).toBe(200);

    // 4. Poll execution until AWAITING_APPROVAL or COMPLETED
    let currentTask = task;
    let attempts = 0;
    while (attempts < 40) {
      await new Promise((r) => setTimeout(r, 300));
      const getTaskRes = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`);
      currentTask = getTaskRes.body.data;
      if (currentTask.status === 'AWAITING_APPROVAL' || currentTask.status === 'COMPLETED') {
        break;
      }
      attempts++;
    }

    // 5. Handle approval for human-in-the-loop steps
    if (currentTask.status === 'AWAITING_APPROVAL') {
      const approvalsRes = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${token}`);
      const pendingApproval = (approvalsRes.body.data || []).find(
        (a: any) => a.taskId === task.id && a.status.toLowerCase() === 'pending'
      );
      if (pendingApproval) {
        const postApproveRes = await request(app)
          .post(`/api/approvals/${pendingApproval.id}/approve`)
          .set('Authorization', `Bearer ${token}`)
          .send({});
        expect(postApproveRes.status).toBe(200);
      }
    }

    // Continue polling to completion (approving subsequent approval gates if any)
    attempts = 0;
    while (attempts < 60) {
      await new Promise((r) => setTimeout(r, 300));
      const getTaskRes = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`);
      currentTask = getTaskRes.body.data;

      if (currentTask.status === 'COMPLETED' || currentTask.status === 'FAILED') {
        break;
      }

      if (currentTask.status === 'AWAITING_APPROVAL') {
        const approvalsRes = await request(app)
          .get('/api/approvals')
          .set('Authorization', `Bearer ${token}`);
        const pending = (approvalsRes.body.data || []).find(
          (a: any) => a.taskId === task.id && a.status.toLowerCase() === 'pending'
        );
        if (pending) {
          await request(app)
            .post(`/api/approvals/${pending.id}/approve`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        }
      }
      attempts++;
    }

    expect(currentTask.status).toBe('COMPLETED');
    expect(currentTask.trustScore).toBe(100);

    // 6. Inspect Execution state returned to Spatial Workspace
    const execRes = await request(app)
      .get(`/api/executions/${task.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(execRes.status).toBe(200);
    expect(execRes.body.data.steps.length).toBeGreaterThanOrEqual(4);
    expect(execRes.body.data.files.length).toBeGreaterThanOrEqual(1);

    // 7. Verify Working PDF Download
    const generatedFile = execRes.body.data.files[0];
    const fileRes = await request(app)
      .get(`/api/files/${generatedFile.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fileRes.status).toBe(200);
    expect(fileRes.body.slice(0, 5).toString('ascii')).toBe('%PDF-');

    // 8. Verify Passing Integrity Check on Cryptographic Proof Ledger
    const verifyProofRes = await request(app)
      .post(`/api/tasks/${task.id}/proof/verify`)
      .set('Authorization', `Bearer ${token}`);
    expect(verifyProofRes.status).toBe(200);
    expect(verifyProofRes.body.data.valid).toBe(true);
    expect(verifyProofRes.body.data.trustScore).toBe(100);

    // 9. Verify Proof Certificate PDF Export
    const certRes = await request(app)
      .get(`/api/tasks/${task.id}/proof/certificate`)
      .set('Authorization', `Bearer ${token}`);
    expect(certRes.status).toBe(200);
    expect(certRes.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
  }, 30000);
});
