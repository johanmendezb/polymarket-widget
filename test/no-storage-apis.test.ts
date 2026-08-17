import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(repoRoot, 'src');

const FORBIDDEN = /localStorage|sessionStorage|document\.cookie/;

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * A sandboxed iframe has no `localStorage`, `sessionStorage` or cookies. Not
 * "avoid" — unavailable. See ADR-0014.
 */
describe('storage APIs', () => {
  it('are never referenced anywhere in src', () => {
    const offenders = listFiles(srcRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .flatMap((file) => {
        const content = readFileSync(file, 'utf8');
        return FORBIDDEN.test(content) ? [path.relative(repoRoot, file)] : [];
      });

    expect(offenders).toEqual([]);
  });
});
