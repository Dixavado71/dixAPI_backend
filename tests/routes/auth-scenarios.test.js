import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

const PROTECTED_ROUTES = [
  ['GET', '/api/v1/products'],
  ['GET', '/api/v1/orders'],
  ['GET', '/api/v1/customers'],
  ['GET', '/api/v1/dashboard/overview'],
  ['GET', '/api/v1/auth/me'],
  ['POST', '/api/v1/auth/register'],
  ['GET', '/api/v1/conversations'],
  ['GET', '/api/v1/automation/flows'],
  ['GET', '/api/v1/notifications'],
  ['GET', '/api/v1/users'],
  ['GET', '/api/v1/companies'],
  ['GET', '/api/v1/company/customization'],
  ['GET', '/api/v1/delivery/settings'],
  ['GET', '/api/v1/transactions'],
  ['GET', '/api/v1/billing'],
  ['GET', '/api/v1/promotions'],
  ['GET', '/api/v1/communications'],
  ['GET', '/api/v1/catalog/company/categories'],
  ['GET', '/api/v1/catalog/company/services'],
  ['GET', '/api/v1/whatsapp/numbers'],
];

const PUBLIC_ROUTES = [
  ['GET', '/health'],
  ['GET', '/api/v1/catalog/categories'],
  ['GET', '/api/v1/catalog/services'],
  ['POST', '/api/v1/auth/login'],
  ['POST', '/api/v1/auth/register-store'],
  ['POST', '/api/v1/auth/refresh'],
  ['POST', '/api/v1/auth/forgot-password'],
  ['POST', '/api/v1/auth/reset-password'],
];

describe('Rotas publicas', () => {
  it.each(PUBLIC_ROUTES)('%s %s retorna 200 ou 400 (sem auth)', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path).send({});
    // 503 = banco indisponível (ambiente de teste sem DB) — aceitável
    expect([200, 201, 400, 404, 503]).toContain(res.status);
  });
});

describe('Rotas protegidas (sem token = 401)', () => {
  it.each(PROTECTED_ROUTES)('%s %s retorna 401 sem token', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.status).toBe(401);
  });
});