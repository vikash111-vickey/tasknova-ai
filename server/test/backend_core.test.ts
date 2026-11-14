import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../src/app';
import { LocalStore } from '../src/repository/localStore';

describe('Phase 2: Backend Core, Auth & User Isolation', () => {
  const app = createApp();
  let userAToken: string;
  let userBToken: string;
  let userATaskId: string;

  beforeEach(async () => {
    // Register User A
    const userAEmail = `user_a_${Date.now()}@test.local`;
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        email: userAEmail,
        password: 'password123',
        fullName: 'User A',
      });
    userAToken = resA.body.data.token;

    // Register User B
    const userBEmail = `user_b_${Date.now()}@test.local`;
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        email: userBEmail,
        password: 'password123',
        fullName: 'User B',
      });
    userBToken = resB.body.data.token;

    // User A creates a task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'User A Confidential Operation',
        instructions: 'Only User A should access this task.',
      });
    userATaskId = taskRes.body.data.id;
  });

  describe('1. Authentication & Session', () => {
    it('login with correct credentials returns token and envelope', async () => {
      const email = `testlogin_${Date.now()}@test.local`;
      await request(app).post('/api/auth/register').send({
        email,
        password: 'securePassword123',
        fullName: 'Login Tester',
      });

      const res = await request(app).post('/api/auth/login').send({
        email,
        password: 'securePassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          token: expect.any(String),
          user: {
            email,
            fullName: 'Login Tester',
          },
        },
      });
    });

    it('login with wrong credentials returns 401 error envelope', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@test.local',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.data).toBeNull();
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('GET /api/auth/me returns current user when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.fullName).toBe('User A');
    });

    it('GET /api/auth/me returns 401 when token is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.data).toBeNull();
    });
  });

  describe('2. User Isolation & Security', () => {
    it('User A can access their own task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(userATaskId);
      expect(res.body.data.title).toBe('User A Confidential Operation');
    });

    it('User B CANNOT access User A task (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Task not found');
    });

    it('User B CANNOT cancel User A task', async () => {
      const res = await request(app)
        .post(`/api/tasks/${userATaskId}/cancel`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('User B task list does not include User A task', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const taskIds = res.body.data.map((t: { id: string }) => t.id);
      expect(taskIds).not.toContain(userATaskId);
    });
  });

  describe('3. Envelope Consistency & Zod Validation', () => {
    it('POST /api/tasks with missing title returns 400 with formatted message', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ instructions: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.data).toBeNull();
      expect(res.body.message).toContain('title');
    });

    it('GET /api/notifications returns array in data envelope', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('4. Persistence Across Server Restart', () => {
    it('data saved in LocalStore persists in fresh instance', async () => {
      const testFilePath = path.resolve(__dirname, `../../data/test_store_${Date.now()}.json`);
      const store1 = new LocalStore(testFilePath);

      const taskId = `task-persist-${Date.now()}`;
      await store1.createTask({
        id: taskId,
        userId: 'u1',
        title: 'Persistent Task',
        instructions: 'Should survive reload',
        status: 'pending',
        mode: 'demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Simulate server restart by creating a new store instance pointing to same file
      const store2 = new LocalStore(testFilePath);
      const loaded = await store2.getTaskById(taskId);

      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe('Persistent Task');

      // Cleanup
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });

  describe('5. SSE Replay & Ordering', () => {
    it('replays events in chronological order since lastEventId', async () => {
      const testFilePath = path.resolve(__dirname, `../../data/test_sse_${Date.now()}.json`);
      const store = new LocalStore(testFilePath);

      const taskId = 'task-sse-1';
      const event1 = await store.createExecutionEvent({
        id: 'evt-1',
        taskId,
        userId: 'user-1',
        type: 'step_start',
        message: 'Step 1 started',
        timestamp: '2026-01-01T10:00:00Z',
      });

      const event2 = await store.createExecutionEvent({
        id: 'evt-2',
        taskId,
        userId: 'user-1',
        type: 'log',
        message: 'Executing computation',
        timestamp: '2026-01-01T10:00:05Z',
      });

      const event3 = await store.createExecutionEvent({
        id: 'evt-3',
        taskId,
        userId: 'user-1',
        type: 'step_finish',
        message: 'Step 1 complete',
        timestamp: '2026-01-01T10:00:10Z',
      });

      // Query events since evt-1
      const replayed = await store.getExecutionEvents(taskId, event1.id);
      expect(replayed.length).toBe(2);
      expect(replayed[0].id).toBe(event2.id);
      expect(replayed[1].id).toBe(event3.id);

      // Cleanup
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });
});
