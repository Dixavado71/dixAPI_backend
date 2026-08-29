import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const results = [];
const start = Date.now();

function run(name, cmd, cwd = root) {
  const t0 = Date.now();
  try {
    execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });
    results.push({ name, ok: true, duration: Date.now() - t0 });
    console.log(`  \u2705 ${name} (${Date.now() - t0}ms)`);
  } catch (err) {
    results.push({ name, ok: false, duration: Date.now() - t0 });
    console.log(`  \u274c ${name} (${Date.now() - t0}ms)`);
    const out = String(err.stdout ?? '') + String(err.stderr ?? '');
    console.log(out.split('\n').slice(0, 15).join('\n'));
  }
}

console.log('=== Verificação consolidada diix backend ===\n');

run('Prisma schema', 'npx prisma validate');
run('Typecheck (sintaxe JS)', 'node scripts/typecheck.mjs');
run('Swagger (regenerar)', 'npm run swagger');
run('Testes unitários', 'npx vitest run');

const failed = results.filter((r) => !r.ok);
console.log(`\n=== Resumo: ${results.length - failed.length}/${results.length} OK em ${((Date.now() - start) / 1000).toFixed(1)}s ===`);
if (failed.length > 0) {
  console.log('Falharam: ' + failed.map((f) => f.name).join(', '));
  process.exit(1);
}
process.exit(0);