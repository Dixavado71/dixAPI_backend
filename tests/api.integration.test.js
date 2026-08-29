import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const prismaMock = vi.hoisted(() => {
  const modelNames = [
    'catalogCategory', 'serviceCatalog', 'companyCategory', 'companyService',
    'product', 'customer', 'user', 'userCompany', 'order', 'conversation', 'message',
    'notification', 'whatsAppNumber', 'whatsappNumber', 'company', 'plan', 'companySubscription',
    'orderItem', 'refreshToken', 'delivery', 'paymentRecord', 'transaction',
  ];
  const prisma = { $transaction: vi.fn(), $connect: vi.fn(), $disconnect: vi.fn(), $queryRaw: vi.fn().mockResolvedValue([]) };
  for (const name of modelNames) {
    prisma[name] = {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      groupBy: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { total: 0 } }),
      upsert: vi.fn().mockResolvedValue({}),
    };
  }
  return { default: prisma };
});

vi.mock('../src/infrastructure/database/prismaClient.js', () => prismaMock);

import app from '../src/app.js';

const mockUser = {
  id: 'user-1',
  name: 'Admin',
  email: 'admin@demo.com',
  password_hash: 'hash',
  role: 'admin',
  is_active: true,
  last_login_at: null,
  avatar_url: null,
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  UserCompany: [
    {
      id: 'uc-1', company_id: 'company-1', user_id: 'user-1', role: 'admin', status: 'active', is_primary: true, removed_at: null,
      company: { id: 'company-1', name: 'Loja Demo', trade_name: 'Demo LTDA', logo_url: null, status: 'active' },
    },
  ],
};

let validToken = '';

beforeAll(() => {
  validToken = jwt.sign(
    { id: 'user-1', email: 'admin@demo.com', companyId: 'company-1', role: 'admin' },
    process.env.JWT_ACCESS_SECRET || 'test-access-secret-min-32-characters-long!!',
    { expiresIn: '15m', issuer: 'dixapi', audience: 'dixapi-api' },
  );
  prismaMock.default.user.findUnique.mockResolvedValue(mockUser);
  prismaMock.default.user.findMany.mockResolvedValue([mockUser]);
});

describe('API Health', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('Public catalog endpoints (mocked DB)', () => {
  it('GET /api/v1/catalog/categories returns list', async () => {
    const res = await request(app).get('/api/v1/catalog/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Auth validation', () => {
  it('POST /api/v1/auth/login rejects missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Authenticated routes (mocked DB + JWT)', () => {
  it('GET /api/v1/products returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/products returns 200 with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/auth/me returns user with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('user-1');
  });

  it('GET /api/v1/dashboard/overview returns metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('revenue');
  });
});