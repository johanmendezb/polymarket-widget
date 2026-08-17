import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const domainDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/domain',
);

const sourceFiles = readdirSync(domainDir)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => ({ name, code: readFileSync(path.join(domainDir, name), 'utf8') }));

/** `import x from 'spec'`, `export * from 'spec'`, and the type-only forms. */
const SPECIFIER = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+'([^']+)'/g;

const specifiersOf = (code: string) =>
  [...code.matchAll(SPECIFIER)].map((m) => m[1] as string);

describe('src/domain purity', () => {
  it('contains source files at all', () => {
    expect(sourceFiles.length).toBeGreaterThan(1);
  });

  it.each(sourceFiles.map((f) => f.name))(
    '%s imports nothing but its own siblings',
    (name) => {
      const file = sourceFiles.find((f) => f.name === name)!;
      for (const specifier of specifiersOf(file.code)) {
        expect(specifier, `${name} imports ${specifier}`).toMatch(/^\.\//);
      }
    },
  );

  it.each(sourceFiles.map((f) => f.name))('%s names no framework or I/O module', (name) => {
    const file = sourceFiles.find((f) => f.name === name)!;
    const banned = /\b(react|next\/|next-server|node:|fs|fetch\(|zod|process\.)/;
    expect(file.code).not.toMatch(banned);
  });

  it.each(sourceFiles.map((f) => f.name))('%s contains no `any`', (name) => {
    const file = sourceFiles.find((f) => f.name === name)!;
    expect(file.code).not.toMatch(/as any\b|:\s*any\b|<any>|\bany\[\]/);
  });
});
