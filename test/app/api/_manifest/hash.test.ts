import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { sha256Hex } from '@/app/api/_manifest/hash';

describe('sha256Hex', () => {
  it('matches node:crypto computed independently, hand-verifiable', () => {
    const content = 'the quick brown fox';
    const expected = createHash('sha256').update(content, 'utf8').digest('hex');
    expect(sha256Hex(content)).toBe(expected);
  });

  it('is deterministic: the same content always hashes the same', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
  });

  it('changes on any byte difference', () => {
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'));
  });

  it('hashes the empty string to the well-known SHA-256 empty-input digest', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});
