/**
 * The tamper-evidence claim T8.2's acceptance criteria require: the manifest hash shown in the
 * UI must be checkable against the actual file, not just printed. `sha256Hex` is T8.1's own hash
 * function (`../_manifest/hash.ts`), so this is exactly the check `pnpm resolve` (T8.3) already
 * performs before touching anything — reused here for display rather than for a refusal.
 */
import { sha256Hex } from '../_manifest/hash';
import type { ManifestHashCheck } from './types';

/** `manifestText` is the raw bytes of `MANIFEST.jsonl`; `hashFileText` is the raw bytes of `MANIFEST.sha256`, or `''` if absent. */
export function checkManifestHash(manifestText: string, hashFileText: string): ManifestHashCheck {
  const sha256 = sha256Hex(manifestText);
  const trimmed = hashFileText.trim();
  const fileHash = trimmed.length === 0 ? null : trimmed;
  return { sha256, fileHash, matchesFile: fileHash !== null && fileHash === sha256 };
}
