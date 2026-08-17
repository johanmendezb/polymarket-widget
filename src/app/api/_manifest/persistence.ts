/**
 * The only filesystem I/O in `_manifest`. Kept separate from `freeze.ts` /
 * `resolve.ts` so those stay testable purely in memory; this file is tested
 * against a real temp directory instead (no network either way).
 */
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { sha256Hex } from './hash';
import { serializeJsonl } from './serialize';
import type { ManifestEntry } from './types';

export const DEFAULT_MANIFEST_PATH = 'evaluation/MANIFEST.jsonl';
export const DEFAULT_HASH_PATH = 'evaluation/MANIFEST.sha256';
export const DEFAULT_OUTCOMES_PATH = 'evaluation/OUTCOMES.jsonl';

export interface WriteManifestResult {
  readonly manifestPath: string;
  readonly hashPath: string;
  readonly sha256: string;
  readonly entryCount: number;
}

/** Writes the frozen manifest and its hash. Re-running with the same entries reproduces the same hash. */
export async function writeManifest(
  entries: readonly ManifestEntry[],
  manifestPath: string = DEFAULT_MANIFEST_PATH,
  hashPath: string = DEFAULT_HASH_PATH,
): Promise<WriteManifestResult> {
  const jsonl = serializeJsonl(entries);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, jsonl, 'utf8');
  const sha256 = sha256Hex(jsonl);
  await mkdir(dirname(hashPath), { recursive: true });
  await writeFile(hashPath, `${sha256}\n`, 'utf8');
  return { manifestPath, hashPath, sha256, entryCount: entries.length };
}

/** Reads a file's exact text, or `''` when it does not exist yet (e.g. `OUTCOMES.jsonl` on a first run). */
export async function readTextOrEmpty(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return '';
    throw error;
  }
}

/**
 * Appends already-serialized JSONL to `OUTCOMES.jsonl`. Never touches
 * `MANIFEST.jsonl` or `MANIFEST.sha256` — this is the structural half of
 * "resolve never mutates a frozen forecast", the other half being that
 * `runResolve` never even reads a manifest path, only manifest text.
 */
export async function appendOutcomes(newOutcomesJsonl: string, outcomesPath: string = DEFAULT_OUTCOMES_PATH): Promise<void> {
  if (newOutcomesJsonl.length === 0) return;
  await mkdir(dirname(outcomesPath), { recursive: true });
  await appendFile(outcomesPath, newOutcomesJsonl, 'utf8');
}
