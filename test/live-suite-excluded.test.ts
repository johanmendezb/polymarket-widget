/**
 * The live suite must never run in CI. This asserts the exclusion structurally,
 * from the configs themselves, so that renaming a file or forgetting a
 * convention cannot quietly put the network back into `pnpm test`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import baseConfig from '../vitest.config';
import liveConfig from '../vitest.live.config';

const packageJson: unknown = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
);

function scripts(): Record<string, string> {
  if (typeof packageJson !== 'object' || packageJson === null || !('scripts' in packageJson)) {
    throw new Error('package.json has no scripts block');
  }
  const { scripts: block } = packageJson as { scripts: unknown };
  if (typeof block !== 'object' || block === null) throw new Error('scripts is not an object');
  return block as Record<string, string>;
}

describe('the live contract suite is excluded from the CI test run', () => {
  it('excludes the whole test/live directory from the default config', () => {
    expect(baseConfig.test?.exclude).toContain('test/live/**');
  });

  it('keeps the live config pointed at test/live and nothing else', () => {
    expect(liveConfig.test?.include).toEqual(['test/live/**/*.live.test.ts']);
  });

  it('runs the live suite only through its own config', () => {
    expect(scripts().test).toBe('vitest run');
    expect(scripts()['test:live']).toBe('vitest run --config vitest.live.config.ts');
  });
});
