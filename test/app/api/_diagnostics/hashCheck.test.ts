import { describe, expect, it } from 'vitest';

import { checkManifestHash } from '@/app/api/_diagnostics/hashCheck';
import { sha256Hex } from '@/app/api/_manifest/hash';

describe('checkManifestHash', () => {
  it('matches when the hash file holds sha256(manifestText) — the acceptance criterion this asserts', () => {
    const manifestText = '{"marketId":"1"}\n';
    const result = checkManifestHash(manifestText, `${sha256Hex(manifestText)}\n`);
    expect(result.matchesFile).toBe(true);
    expect(result.sha256).toBe(sha256Hex(manifestText));
  });

  it('does not match a stale or tampered hash file', () => {
    const result = checkManifestHash('{"marketId":"1"}\n', 'deadbeef\n');
    expect(result.matchesFile).toBe(false);
  });

  it('reports fileHash: null and matchesFile: false when the hash file is absent', () => {
    const result = checkManifestHash('{"marketId":"1"}\n', '');
    expect(result.fileHash).toBeNull();
    expect(result.matchesFile).toBe(false);
  });
});
