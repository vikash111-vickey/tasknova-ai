import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Phase 7: Backend Modules, Integrations & Security Acceptance', () => {
  let app: ReturnType<typeof createApp>;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    app = createApp();

    // Register a dedicated test user for Phase 7
    const email = `phase7_test_${Date.now()}@tasknova.local`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'password123',
        fullName: 'Phase 7 Verification Operator',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    userToken = regRes.body.data.token;
    userId = regRes.body.data.user.id;
  });

  describe('1. Module 2: Scheduled Tasks & Engine', () => {
    let createdScheduleId: string;

    it('GET /api/schedules returns empty or seeded list for user', async () => {
      const res = await request(app)
        .get('/api/schedules')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/schedules creates a valid scheduled job with node-cron expression', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Daily Invoice Audit',
          instruction: 'Reconcile Stripe charges with local store and notify finance channel.',
          cronExpression: '0 9 * * *',
          recurrence: 'daily',
          timezone: 'America/New_York',
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Daily Invoice Audit');
      expect(res.body.data.isActive).toBe(true);
      createdScheduleId = res.body.data.id;
    });

    it('PUT /api/schedules/:id toggles schedule active state', async () => {
      const res = await request(app)
        .put(`/api/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
    });

    it('POST /api/schedules/:id/run triggers immediate execution of the schedule', async () => {
      const res = await request(app)
        .post(`/api/schedules/${createdScheduleId}/run`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task).toBeDefined();
      expect(res.body.data.task.userId).toBe(userId);
    });

    it('DELETE /api/schedules/:id deletes the schedule', async () => {
      const res = await request(app)
        .delete(`/api/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  describe('2. Module 8: Policies & Security Center', () => {
    let createdPolicyId: string;

    it('GET /api/policies returns baseline security policies when user has none', async () => {
      const res = await request(app)
        .get('/api/policies')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      const emailPolicy = res.body.data.find((p: any) => p.ruleType === 'external_communication');
      expect(emailPolicy).toBeDefined();
    });

    it('POST /api/policies creates a custom security policy', async () => {
      const res = await request(app)
        .post('/api/policies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Restrict High Volume Dispatch',
          ruleType: 'require_approval',
          ruleConfig: { maxDailyEmails: 50 },
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Restrict High Volume Dispatch');
      createdPolicyId = res.body.data.id;
    });

    it('PUT /api/policies/:id updates policy rules', async () => {
      const res = await request(app)
        .put(`/api/policies/${createdPolicyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
    });

    it('DELETE /api/policies/:id deletes policy', async () => {
      const res = await request(app)
        .delete(`/api/policies/${createdPolicyId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Module 3: Integrations & Live OAuth Security', () => {
    it('GET /api/integrations/status returns 6 core integrations with honest DEMO mode', async () => {
      const res = await request(app)
        .get('/api/integrations/status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(6);

      const gmail = res.body.data.find((i: any) => i.id === 'gmail');
      expect(gmail).toBeDefined();
      expect(gmail.supportedInDemo).toBe(true);

      const docs = res.body.data.find((i: any) => i.id === 'document');
      expect(docs).toBeDefined();
      expect(docs.mode).toBe('live'); // Document engine runs zero-key live PDF generator
    });

    it('POST /api/integrations/gmail/oauth reports honestly when live credentials missing', async () => {
      const res = await request(app)
        .post('/api/integrations/gmail/oauth')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ redirectUri: 'http://localhost:5173/integrations' });

      // In zero-config mode, Google Client ID is not in env, so it honestly reports requirement
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Live connection requires credentials');
    });

    it('GET /api/integrations/demo-store/summary returns live metrics from isolated DemoStore', async () => {
      const res = await request(app)
        .get('/api/integrations/demo-store/summary')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.outboxEmailsCount).toBe('number');
      expect(typeof res.body.data.driveFilesCount).toBe('number');
    });
  });

  describe('4. Module 4: Analytics Dashboard Calculations', () => {
    it('GET /api/analytics computes success rate, documented time saved (22 min/task), and trends', async () => {
      const res = await request(app)
        .get('/api/analytics?range=30d')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(typeof data.totalTasks).toBe('number');
      expect(typeof data.successRate).toBe('number');
      expect(typeof data.timeSavedMinutes).toBe('number');
      expect(Array.isArray(data.executionTrends)).toBe(true);
      expect(Array.isArray(data.durationDistribution)).toBe(true);
      expect(Array.isArray(data.statusBreakdown)).toBe(true);
    });
  });

  describe('5. Module 5: Reports & Generated Files', () => {
    it('GET /api/files returns list of generated files', async () => {
      const res = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/reports returns reports and files combined', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.reports)).toBe(true);
      expect(Array.isArray(res.body.data.files)).toBe(true);
    });
  });

  describe('6. Module 6: Activity Logs & Events Filtering', () => {
    it('GET /api/events with category filter returns matching events', async () => {
      const res = await request(app)
        .get('/api/events?category=all&limit=20')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.events)).toBe(true);
      expect(typeof res.body.data.total).toBe('number');
    });
  });

  describe('7. Module 7: Notification Center Management', () => {
    it('PATCH /api/notifications/read-all marks all notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allRead).toBe(true);
    });
  });

  describe('8. Module 8: Data Management & Export', () => {
    it('GET /api/users/export downloads full JSON payload of user tasks, steps, proofs, etc.', async () => {
      const res = await request(app)
        .get('/api/users/export')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.body.exportedAt).toBeDefined();
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.passwordHash).toBeUndefined(); // Never expose password hash
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(Array.isArray(res.body.schedules)).toBe(true);
      expect(Array.isArray(res.body.policies)).toBe(true);
    });
  });
});
