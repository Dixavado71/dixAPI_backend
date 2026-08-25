import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('API Health', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /api/v1/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(res.body.error.category).toBe('routing');
    expect(res.body.error.requestId).toBeTruthy();
    expect(res.body.error.method).toBe('GET');
    expect(res.body.error.path).toBe('/api/v1/nonexistent');
  });
});

describe('Auth endpoints', () => {
  it('POST /api/v1/auth/login rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.category).toBe('request_validation');
    expect(res.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'password' }),
    ]));
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('POST /api/v1/auth/login rejects invalid body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ invalid: true });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/refresh rejects missing token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('Products endpoints (auth required)', () => {
  it('GET /api/v1/products returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.category).toBe('authentication');
    expect(res.body.error.requestId).toBeTruthy();
    expect(res.body.error.message).toBeTruthy();
  });
});

describe('Catalog public endpoints', () => {
  it('GET /api/v1/catalog/categories returns list', async () => {
    const res = await request(app).get('/api/v1/catalog/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/catalog/services returns list', async () => {
    const res = await request(app).get('/api/v1/catalog/services');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
