/**
 * Integrity of the recorded fixtures. Offline: it reads `test/fixtures/` and
 * nothing else.
 *
 * The point is that a fixture never loses its provenance. Every file is listed
 * in MANIFEST.json with the URL and the date it came off the wire, and the two
 * books are still the liquid/thin pair the later epics are written against.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const FIXTURE_DIR = fileURLToPath(new URL('./fixtures/', import.meta.url));

function read(file: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), 'utf8'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('expected a JSON object');
  return value;
}

interface Level {
  readonly price: string;
  readonly size: string;
}

function side(book: Record<string, unknown>, key: 'asks' | 'bids'): Level[] {
  const raw = book[key];
  if (!Array.isArray(raw)) throw new Error(`fixture book has no ${key}`);
  return raw.map((entry) => {
    const level = asRecord(entry);
    return { price: String(level.price), size: String(level.size) };
  });
}

const manifest = asRecord(read('MANIFEST.json'));
const entries = Array.isArray(manifest.fixtures) ? manifest.fixtures.map(asRecord) : [];

describe('the fixture manifest', () => {
  it('lists every recorded file, so a reader can date any of them', () => {
    const onDisk = readdirSync(FIXTURE_DIR)
      .filter((name) => name.endsWith('.json') && name !== 'MANIFEST.json')
      .sort();
    const listed = entries.map((entry) => String(entry.file)).sort();
    expect(listed).toEqual(onDisk);
  });

  it('dates each fixture with a real timestamp and a real URL', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(Number.isNaN(Date.parse(String(entry.recordedAt)))).toBe(false);
      expect(String(entry.url)).toMatch(/^https:\/\/(gamma-api|clob)\.polymarket\.com\//);
      expect(entry.httpStatus).toBe(200);
    }
  });

  it('records what every fixture file parses as', () => {
    for (const entry of entries) expect(read(String(entry.file))).toBeDefined();
  });
});

describe('the recorded books', () => {
  const liquid = asRecord(read('clob-book-liquid.json'));
  const thin = asRecord(read('clob-book-thin.json'));

  const nearTouchUsd = (book: Record<string, unknown>): number => {
    const asks = side(book, 'asks');
    const best = Number(asks.at(-1)?.price);
    return asks
      .filter((level) => Number(level.price) <= best + 0.02)
      .reduce((total, level) => total + Number(level.price) * Number(level.size), 0);
  };

  it('preserve the upstream ordering: asks descending, bids ascending', () => {
    for (const book of [liquid, thin]) {
      const asks = side(book, 'asks').map((level) => Number(level.price));
      const bids = side(book, 'bids').map((level) => Number(level.price));
      expect(asks).toEqual([...asks].sort((a, b) => b - a));
      expect(bids).toEqual([...bids].sort((a, b) => a - b));
      // The best level is the LAST element of each side, and the book is not
      // crossed once both are read from that end.
      expect(Number(asks.at(-1))).toBeGreaterThanOrEqual(Number(bids.at(-1)));
    }
  });

  it('are actually a liquid/thin pair, so E2 can test a partial fill', () => {
    expect(nearTouchUsd(thin)).toBeLessThan(nearTouchUsd(liquid) / 100);
    // Thin means shallow, not empty: E2 needs levels to walk before it runs out.
    expect(side(thin, 'asks').length).toBeGreaterThan(1);
    expect(side(thin, 'bids').length).toBeGreaterThan(0);
  });

  it('carry token ids as strings beyond Number.MAX_SAFE_INTEGER', () => {
    for (const book of [liquid, thin]) {
      const tokenId = String(book.asset_id);
      expect(tokenId).toMatch(/^\d+$/);
      expect(BigInt(tokenId)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
    }
  });
});
