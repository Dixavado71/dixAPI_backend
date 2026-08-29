import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { routes } from '../route-inventory.js';
import { getSampleBody } from '../helpers/payload-generator.js';
import { adminToken, managerToken, operatorToken, masterToken, resellerToken } from '../helpers/auth-setup.js';
import { generateRouteCoverageReport } from '../reporters/route-coverage.js';

const collected = [];

function tokenForRole(role) {
  if (role === 'admin') return adminToken();
  if (role === 'manager') return managerToken();
  if (role === 'operator') return operatorToken();
  if (role === 'master') return masterToken();
  if (role === 'reseller') return resellerToken();
  return null;
}

function replaceParams(path) {
  return path
    .replaceAll(':id', '00000000-0000-0000-0000-000000000001')
    .replaceAll(':instanceName', 'test_inst')
    .replaceAll(':chatId', '5511999999999@s.whatsapp.net')
    .replaceAll(':groupId', '120363000000000000@g.us')
    .replaceAll(':lgId', '00000000-0000-0000-0000-000000000002')
    .replaceAll(':statusId', 'status-1')
    .replaceAll(':customerId', '00000000-0000-0000-0000-000000000001');
}

function inferRole(path, method) {
  if (path.startsWith('/api/v1/admin/reseller')) return 'reseller';
  if (path.startsWith('/api/v1/admin')) return 'master';
  if (path.includes('/payments/events')) return 'admin';
  if (path.includes('/whatsapp/numbers')) {
    const write = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method) && !path.includes('/chats/') && !path.includes('/send') && !path.includes('/read') && !path.includes('/typing');
    return write ? 'admin' : 'operator';
  }
  return 'admin';
}

describe.each(routes)('Route $method $path', ({ path, methods }) => {
  for (const method of methods) {
    it(`${method} ${path} responde sem 5xx`, async () => {
      const resolved = replaceParams(path);
      const role = inferRole(path, method);
      const token = tokenForRole(role);
      const body = getSampleBody(path, method);

      const req = request(app)[method.toLowerCase()](resolved);
      if (token) req.set('Authorization', `Bearer ${token}`);
      if (body !== undefined) req.send(body);
      else if (['POST', 'PUT', 'PATCH'].includes(method)) req.send({});

      const t0 = Date.now();
      const res = await req;
      const duration = Date.now() - t0;
      // 5xx (exceto 503 = banco indisponível em teste sem DB) indicam bug
      if (res.status >= 500 && res.status !== 503) {
        throw new Error(`${method} ${path} -> ${res.status} (${JSON.stringify(res.body?.error?.message ?? '').slice(0, 100)})`);
      }
      expect(res.status).not.toBe(501);
      collected.push({ method, path, status: res.status, ok: true, duration });
    });
  }
});

afterAll(() => {
  generateRouteCoverageReport(collected);
});