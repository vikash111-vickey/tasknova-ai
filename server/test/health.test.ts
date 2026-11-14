import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Server API Endpoints', () => {
  const app = createApp();

  it('GET /api/health should return 200 with the standard JSON envelope', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('message');
    expect(res.body.data).toMatchObject({
      status: 'ok',
      mode: expect.stringMatching(/demo|live/),
      ai: expect.stringMatching(/gemini|template/),
    });
  });

  it('GET /api/nonexistent should return 404 with structured error envelope', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('data', null);
    expect(res.body.message).toBe('Endpoint not found');
  });
});
