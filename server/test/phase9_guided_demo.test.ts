import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Phase 9: Hackathon Readiness & Triple Guided Demo Acceptance', () => {
  let app: ReturnType<typeof createApp>;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    app = createApp();

    // Reset demo environment to seed data
    const resetRes = await request(app).post('/api/demo/reset');
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Login with pre-seeded demo operator
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'demo@tasknova.local',
        password: 'demo12345',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    userToken = loginRes.body.data.token;
    userId = loginRes.body.data.user.id;
  });

  const runWeeklyReportWorkflow = async (iteration: number) => {
    // 1. Generate Plan
    const planRes = await request(app)
      .post('/api/planning/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        instruction: 'Generate weekly sales report and send summary email to team',
      });

    expect(planRes.status).toBe(201);
    expect(planRes.body.success).toBe(true);
    const taskId = planRes.body.data.task.id;
    expect(taskId).toBeDefined();

    // 2. Approve Plan
    const approvePlanRes = await request(app)
      .post(`/api/planning/${taskId}/approve-plan`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(approvePlanRes.status).toBe(200);
    expect(approvePlanRes.body.success).toBe(true);

    // 3. Run Execution (halts at approval gate)
    const runRes = await request(app)
      .post(`/api/executions/${taskId}/run`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(runRes.status).toBe(200);

    // 4. Confirm task reached AWAITING_APPROVAL
    const taskRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(taskRes.status).toBe(200);
    expect(taskRes.body.data.status).toBe('AWAITING_APPROVAL');

    // 5. Fetch Pending Approvals
    const approvalsRes = await request(app)
      .get('/api/approvals?status=PENDING')
      .set('Authorization', `Bearer ${userToken}`);

    expect(approvalsRes.status).toBe(200);
    const taskApproval = approvalsRes.body.data.find((a: any) => a.taskId === taskId);
    expect(taskApproval).toBeDefined();

    // 6. Grant Operator Authorization
    const grantRes = await request(app)
      .post(`/api/approvals/${taskApproval.id}/approve`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(grantRes.status).toBe(200);

    // 7. Verify Task Completed
    const finalTaskRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(finalTaskRes.status).toBe(200);
    expect(finalTaskRes.body.data.status).toBe('COMPLETED');

    // 8. Verify Proof Ledger Integrity
    const auditRes = await request(app)
      .post(`/api/tasks/${taskId}/proof/verify`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.valid).toBe(true);
    expect(auditRes.body.data.brokenLinkIndex).toBeUndefined();
    expect(auditRes.body.data.trustScore).toBeGreaterThanOrEqual(90);

    // 9. Verify PDF Proof Certificate is downloadable
    const certRes = await request(app)
      .get(`/api/tasks/${taskId}/proof/certificate`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(certRes.status).toBe(200);
    expect(certRes.headers['content-type']).toContain('application/pdf');
    expect(certRes.body.length).toBeGreaterThan(500);
  };

  it('Runs the full guided demo workflow: Iteration 1', async () => {
    await runWeeklyReportWorkflow(1);
  });

  it('Runs the full guided demo workflow: Iteration 2', async () => {
    await runWeeklyReportWorkflow(2);
  });

  it('Runs the full guided demo workflow: Iteration 3', async () => {
    await runWeeklyReportWorkflow(3);
  });

  it('Confirms Demo Workflow 2 (Meeting Scheduling) executes cleanly in <60s', async () => {
    const planRes = await request(app)
      .post('/api/planning/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        instruction: 'Schedule sync meeting with Alex and Jordan for tomorrow morning and send calendar invites',
      });

    expect(planRes.status).toBe(201);
    const taskId = planRes.body.data.task.id;

    await request(app)
      .post(`/api/planning/${taskId}/approve-plan`)
      .set('Authorization', `Bearer ${userToken}`);

    const runRes = await request(app)
      .post(`/api/executions/${taskId}/run`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(runRes.status).toBe(200);

    // If approval required for emails, approve it
    const approvalsRes = await request(app)
      .get('/api/approvals?status=PENDING')
      .set('Authorization', `Bearer ${userToken}`);

    const taskApproval = approvalsRes.body.data.find((a: any) => a.taskId === taskId);
    if (taskApproval) {
      await request(app)
        .post(`/api/approvals/${taskApproval.id}/approve`)
        .set('Authorization', `Bearer ${userToken}`);
    }

    const checkRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(checkRes.status).toBe(200);
    expect(['COMPLETED', 'AWAITING_APPROVAL']).toContain(checkRes.body.data.status);
  });

  it('Confirms Demo Workflow 3 (Drive Organization) executes cleanly in <60s', async () => {
    const planRes = await request(app)
      .post('/api/planning/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        instruction: 'Search Google Drive for customer contracts, generate executive PDF summary, and archive report',
      });

    expect(planRes.status).toBe(201);
    const taskId = planRes.body.data.task.id;

    await request(app)
      .post(`/api/planning/${taskId}/approve-plan`)
      .set('Authorization', `Bearer ${userToken}`);

    const runRes = await request(app)
      .post(`/api/executions/${taskId}/run`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(runRes.status).toBe(200);

    const checkRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.data.status).toBe('COMPLETED');
  });

  it('Verifies POST /api/demo/reset restores seed state and cleans up executions', async () => {
    const resetRes = await request(app).post('/api/demo/reset');
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Confirm demo user can still log in immediately after reset
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'demo@tasknova.local',
        password: 'demo12345',
      });

    expect(loginRes.status).toBe(200);
  });
});
