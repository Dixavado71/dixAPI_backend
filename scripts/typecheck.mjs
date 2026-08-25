import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const ignored = new Set(['node_modules', '.git', '.opencode']);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(target));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(target);
  }
  return files;
}

const files = await collect(root);
let failed = false;
for (const file of files) {
  await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--check', file], { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code !== 0) failed = true;
      resolve();
    });
  });
}
if (failed) process.exitCode = 1;
else console.log(`JavaScript syntax check passed: ${files.length} files`);
