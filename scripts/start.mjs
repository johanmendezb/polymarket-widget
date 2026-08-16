#!/usr/bin/env node
/**
 * Production start for `output: 'standalone'`.
 *
 * Two things this exists to get right, both of which break the Render deploy
 * silently if they are wrong:
 *
 *  1. The port comes from process.env.PORT. Render assigns it and fails the
 *     health check against a process that hardcoded 3000.
 *  2. Next's standalone bundle does not include `.next/static` or `public`.
 *     They have to be copied next to server.js or every asset 404s.
 */
import { cp, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const standaloneDir = path.join(root, '.next', 'standalone');
const serverEntry = path.join(standaloneDir, 'server.js');

const port = process.env.PORT ?? '3000';
const hostname = process.env.HOSTNAME ?? '0.0.0.0';

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

if (!(await exists(serverEntry))) {
  console.error('No standalone build found. Run `pnpm build` first.');
  process.exit(1);
}

await cp(path.join(root, '.next', 'static'), path.join(standaloneDir, '.next', 'static'), {
  recursive: true,
});

if (await exists(path.join(root, 'public'))) {
  await cp(path.join(root, 'public'), path.join(standaloneDir, 'public'), { recursive: true });
}

// The runtime prompts are read from disk at request time (ADR-0018: they are
// deliverables, not string literals). Copy them next to server.js so the
// standalone tree is genuinely self-contained and does not rely on the rest of
// the repository still being on the box.
if (await exists(path.join(root, 'prompts', 'runtime'))) {
  await cp(path.join(root, 'prompts', 'runtime'), path.join(standaloneDir, 'prompts', 'runtime'), {
    recursive: true,
  });
}

const child = spawn(process.execPath, [serverEntry], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port, HOSTNAME: hostname },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
