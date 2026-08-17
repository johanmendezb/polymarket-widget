import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolved from the working directory, deliberately NOT from this module's own
 * location.
 *
 * Under `output: 'standalone'` this file is compiled into a chunk somewhere
 * beneath `.next/server/`, so a path relative to `import.meta.url` points at a
 * directory that does not exist in the deployed tree. The server always runs
 * with the repository root as its working directory (see `scripts/start.mjs`),
 * and `prompts/runtime` is a committed, first-class deliverable that sits
 * there, so cwd is the stable anchor. `scripts/start.mjs` additionally copies
 * the directory next to `server.js`, and `next.config.ts` traces it, so the
 * standalone bundle is self-contained either way.
 */
const RUNTIME_PROMPTS_DIR = path.join(process.cwd(), 'prompts', 'runtime');

export interface LoadedPromptFile {
  /** The filename with its extension stripped, e.g. `blind-v1.md` -> `blind-v1`. */
  readonly version: string;
  readonly text: string;
}

/**
 * Reads a runtime prompt straight from `prompts/runtime/`. Never duplicate
 * this text as a string literal elsewhere: the file the reviewer reads and
 * the string the model receives must stay the same bytes. See ADR-0018.
 *
 * `version` derives from the filename, so a prompt change is a rename
 * (`blind-v1.md` -> `blind-v2.md`), never an in-place edit.
 */
export function loadPromptFile(filename: string): LoadedPromptFile {
  const text = readFileSync(path.join(RUNTIME_PROMPTS_DIR, filename), 'utf8');
  const version = filename.replace(/\.md$/, '');
  return { version, text };
}

/** Reads a non-prompt runtime file (the tool schema) from the same directory. */
export function loadRuntimeTextFile(filename: string): string {
  return readFileSync(path.join(RUNTIME_PROMPTS_DIR, filename), 'utf8');
}
