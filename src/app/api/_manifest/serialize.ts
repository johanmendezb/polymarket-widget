/**
 * JSONL (de)serialization shared by `MANIFEST.jsonl` and `OUTCOMES.jsonl`.
 * An empty row set serializes to an empty string, deliberately — an empty
 * manifest reports as empty rather than as a stray blank line.
 */
export function serializeJsonl<T>(rows: readonly T[]): string {
  if (rows.length === 0) return '';
  return `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
}

export function parseJsonl<T>(text: string): readonly T[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
}
