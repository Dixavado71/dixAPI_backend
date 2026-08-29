import { execSync } from 'node:child_process';

const BASE = process.env.SMOKE_URL || 'https://dixapi-backend-production.up.railway.app';

const results = [];

async function check(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  \u2705 ${name} (${Date.now() - t0}ms)`);
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - t0 });
    console.log(`  \u274c ${name} (${Date.now() - t0}ms) -> ${err.message}`);
  }
}

async function jsonReq(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status >= 500) throw new Error(`HTTP ${res.status} em ${path}`);
  return { status: res.status, data };
}

console.log(`=== Smoke test pos-deploy ===\n  Base: ${BASE}\n`);

await check('health', async () => {
  const { status, data } = await jsonReq('/health');
  if (status !== 200 || !data.success) throw new Error(`health -> ${status}`);
});

await check('login', async () => {
  const { status } = await jsonReq('/api/v1/auth/login', {
    method: 'POST',
    body: { email: process.env.SMOKE_EMAIL || 'admin@demo.local', password: process.env.SMOKE_PASSWORD || 'Admin@12345' },
  });
  if (![200, 401].includes(status)) throw new Error(`login -> ${status}`);
});

const failed = results.filter((r) => !r.ok);
console.log(`\n=== Resumo: ${results.length - failed.length}/${results.length} OK ===`);
process.exit(failed.length ? 1 : 0);