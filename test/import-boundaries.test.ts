import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Lints a snippet as if it lived at `relativePath`, without writing it to
 * disk. `import/no-restricted-paths` keys off the file's path, so the virtual
 * path is the whole point of the test.
 */
async function lintAs(relativePath: string, code: string) {
  const eslint = new ESLint({ cwd: repoRoot });
  const [result] = await eslint.lintText(code, {
    filePath: path.join(repoRoot, relativePath),
  });
  return result?.messages ?? [];
}

const boundaryErrors = (messages: Linter.LintMessage[]) =>
  messages.filter((m) => m.ruleId === 'import/no-restricted-paths');

describe('the import boundary rule', () => {
  it('rejects an import of @/polymarket inside src/domain', async () => {
    const messages = await lintAs(
      'src/domain/__boundary_probe.ts',
      "import { x } from '@/polymarket';\nexport const y = x;\n",
    );

    const violations = boundaryErrors(messages);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain('src/domain must import nothing internal');
  });

  it('rejects an import of @/ai inside src/simulation', async () => {
    const messages = await lintAs(
      'src/simulation/__boundary_probe.ts',
      "import { x } from '@/ai';\nexport const y = x;\n",
    );

    expect(boundaryErrors(messages)).toHaveLength(1);
  });

  it('rejects an import of @/polymarket inside src/ui', async () => {
    const messages = await lintAs(
      'src/ui/__boundary_probe.ts',
      "import { x } from '@/polymarket';\nexport const y = x;\n",
    );

    expect(boundaryErrors(messages)).toHaveLength(1);
  });

  it('allows src/polymarket to import src/domain', async () => {
    const messages = await lintAs(
      'src/polymarket/__boundary_probe.ts',
      "import * as domain from '@/domain';\nexport const y = domain;\n",
    );

    expect(boundaryErrors(messages)).toHaveLength(0);
  });

  it('allows src/app/api to import anything', async () => {
    const messages = await lintAs(
      'src/app/api/__boundary_probe/route.ts',
      "import * as pm from '@/polymarket';\nimport * as sim from '@/simulation';\nexport const y = [pm, sim];\n",
    );

    expect(boundaryErrors(messages)).toHaveLength(0);
  });
});
