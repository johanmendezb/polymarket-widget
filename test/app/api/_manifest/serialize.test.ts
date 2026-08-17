import { describe, expect, it } from 'vitest';

import { parseJsonl, serializeJsonl } from '@/app/api/_manifest/serialize';

interface Row {
  readonly id: string;
  readonly value: number;
}

describe('serializeJsonl / parseJsonl', () => {
  it('round-trips a list of rows', () => {
    const rows: Row[] = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ];
    const jsonl = serializeJsonl(rows);
    expect(parseJsonl<Row>(jsonl)).toEqual(rows);
  });

  it('serializes an empty list to an empty string — an empty manifest reports as empty', () => {
    expect(serializeJsonl([])).toBe('');
    expect(parseJsonl<Row>('')).toEqual([]);
  });

  it('writes one JSON object per line, newline-terminated', () => {
    const jsonl = serializeJsonl<Row>([{ id: 'a', value: 1 }]);
    expect(jsonl).toBe('{"id":"a","value":1}\n');
  });

  it('ignores blank trailing lines when parsing', () => {
    expect(parseJsonl<Row>('{"id":"a","value":1}\n\n')).toEqual([{ id: 'a', value: 1 }]);
  });
});
