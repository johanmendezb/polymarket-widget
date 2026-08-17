import { createHash } from 'node:crypto';

/** SHA-256 of `content`, hex-encoded. The tamper-evidence primitive ADR-0007 depends on. */
export function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
