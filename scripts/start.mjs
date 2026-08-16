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
// Bind every interface. Deliberately NOT `process.env.HOSTNAME`: on Render, and
// in containers generally, HOSTNAME is a POSIX variable holding the *machine's
// name*, not an address to bind to. Next's standalone server passes it straight
// to server.listen(), and because most images map that name to 127.0.0.1 in
// /etc/hosts, the server ends up listening on loopback only. The process logs
// "Ready", the deploy reports live, and every request through the proxy returns
// 502. Use BIND_HOST if a narrower bind is ever genuinely wanted.
const hostname = process.env.BIND_HOST ?? '0.0.0.0';

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

const child = spawn(process.execPath, [serverEntry], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port, HOSTNAME: hostname },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
