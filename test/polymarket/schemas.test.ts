/**
 * T3.1 acceptance: every recorded fixture parses, and a fixture with a
 * renamed critical field fails loudly, naming the field.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { UpstreamShapeChangedError } from '@/polymarket/errors';
import {
  ClobPriceHistorySchema,
  GammaMarketSchema,
  GammaSearchResponseSchema,
  parseClobBook,
  parseClobPriceHistory,
  parseGammaMarket,
  parseGammaSearchResponse,
} from '@/polymarket/schemas';

const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));

function readFixture(file: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), 'utf8'));
}

describe('GammaMarketSchema', () => {
  it.each([
    'gamma-market-liquid.json',
    'gamma-market-thin.json',
    'gamma-market-first-search-result.json',
  ])('parses the recorded fixture %s', (file) => {
    const market = parseGammaMarket(readFixture(file));
    expect(market.id).toMatch(/^\d+$/);
    expect(Array.isArray(market.clobTokenIds)).toBe(true);
    expect(market.clobTokenIds.length).toBeGreaterThan(0);
  });

  it('decodes clobTokenIds, outcomes and outcomePrices from their JSON-encoded string form', () => {
    const market = parseGammaMarket(readFixture('gamma-market-liquid.json'));
    expect(market.outcomes).toEqual(['Yes', 'No']);
    expect(market.clobTokenIds).toEqual([
      '5615282760875985231868508008056959876238536896643315063916840237042205273721',
      '97050921740416192996389806693742575608111328819185493163189880975611314813724',
    ]);
    expect(market.outcomePrices).toEqual(['0.745', '0.255']);
  });

  it('carries clobTokenIds as strings beyond Number.MAX_SAFE_INTEGER, unchanged', () => {
    const market = parseGammaMarket(readFixture('gamma-market-liquid.json'));
    for (const tokenId of market.clobTokenIds) {
      expect(BigInt(tokenId)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
      expect(tokenId).toMatch(/^\d+$/);
    }
  });

  it('lets fee fields through as null rather than rejecting the shape (OQ-11: fields are routinely absent)', () => {
    const raw = readFixture('gamma-market-liquid.json') as Record<string, unknown>;
    const result = GammaMarketSchema.safeParse({
      ...raw,
      feesEnabled: null,
      feeType: null,
      feeSchedule: null,
      takerBaseFee: null,
      makerBaseFee: null,
    });
    expect(result.success).toBe(true);
  });

  it('fails loudly, naming the field, when clobTokenIds is not JSON-encoded', () => {
    const raw = readFixture('gamma-market-liquid.json') as Record<string, unknown>;
    expect(() => parseGammaMarket({ ...raw, clobTokenIds: ['not', 'encoded'] })).toThrow(
      UpstreamShapeChangedError,
    );
    try {
      parseGammaMarket({ ...raw, clobTokenIds: ['not', 'encoded'] });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(UpstreamShapeChangedError);
      expect((error as UpstreamShapeChangedError).field).toBe('clobTokenIds');
      expect((error as UpstreamShapeChangedError).code).toBe('UPSTREAM_SHAPE_CHANGED');
    }
  });

  it('fails loudly when a token id is not a bare digit string', () => {
    const raw = readFixture('gamma-market-liquid.json') as Record<string, unknown>;
    expect(() =>
      parseGammaMarket({ ...raw, clobTokenIds: JSON.stringify(['123abc', '456']) }),
    ).toThrow(UpstreamShapeChangedError);
  });

  it('fails loudly when a critical field is renamed', () => {
    const raw = readFixture('gamma-market-liquid.json') as Record<string, unknown>;
    const { question, ...rest } = raw;
    void question;
    const renamed = { ...rest, questionText: 'renamed' };
    expect(() => parseGammaMarket(renamed)).toThrow(UpstreamShapeChangedError);
    try {
      parseGammaMarket(renamed);
      expect.unreachable();
    } catch (error) {
      expect((error as UpstreamShapeChangedError).field).toBe('question');
    }
  });

  it('fails loudly when outcomes and clobTokenIds decode to different lengths', () => {
    const raw = readFixture('gamma-market-liquid.json') as Record<string, unknown>;
    expect(() => parseGammaMarket({ ...raw, outcomes: JSON.stringify(['Yes']) })).toThrow(
      UpstreamShapeChangedError,
    );
  });

  it('is permissive about fields it does not consume', () => {
    const raw = readFixture('gamma-market-liquid.json') as Record<string, unknown>;
    const result = GammaMarketSchema.safeParse({ ...raw, someBrandNewUpstreamField: 'unexpected' });
    expect(result.success).toBe(true);
  });
});

describe('GammaSearchResponseSchema', () => {
  it('parses the recorded search fixture', () => {
    const response = parseGammaSearchResponse(readFixture('gamma-public-search-election.json'));
    expect(response.events.length).toBeGreaterThan(0);
    expect(response.events[0]?.markets.length ?? 0).toBeGreaterThan(0);
  });

  it('fails loudly against a fixture with events renamed', () => {
    const raw = readFixture('gamma-public-search-election.json') as Record<string, unknown>;
    const { events, ...rest } = raw;
    const renamed = { ...rest, results: events };
    const result = GammaSearchResponseSchema.safeParse(renamed);
    expect(result.success).toBe(false);
  });
});

describe('ClobBookSchema', () => {
  it.each(['clob-book-liquid.json', 'clob-book-thin.json'])('parses the recorded fixture %s', (file) => {
    const book = parseClobBook(readFixture(file));
    expect(book.asset_id).toMatch(/^\d+$/);
    expect(book.asks.length).toBeGreaterThan(0);
    expect(book.bids.length).toBeGreaterThan(0);
  });

  it('keeps the wire ordering (asks descending, bids ascending) — normalization is T3.2, not the schema', () => {
    const book = parseClobBook(readFixture('clob-book-liquid.json'));
    const askPrices = book.asks.map((level) => level.price);
    expect(askPrices).toEqual([...askPrices].sort((a, b) => b - a));
  });

  it('coerces numeric-string price and size to numbers', () => {
    const book = parseClobBook(readFixture('clob-book-liquid.json'));
    for (const level of [...book.asks, ...book.bids]) {
      expect(typeof level.price).toBe('number');
      expect(typeof level.size).toBe('number');
    }
    expect(typeof book.tick_size).toBe('number');
    expect(typeof book.min_order_size).toBe('number');
  });

  it('carries asset_id as a string beyond Number.MAX_SAFE_INTEGER', () => {
    const book = parseClobBook(readFixture('clob-book-liquid.json'));
    expect(BigInt(book.asset_id)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
  });

  it('fails loudly, naming the field, when asset_id is renamed', () => {
    const raw = readFixture('clob-book-liquid.json') as Record<string, unknown>;
    const { asset_id, ...rest } = raw;
    void asset_id;
    const renamed = { ...rest, assetId: '123' };
    try {
      parseClobBook(renamed);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(UpstreamShapeChangedError);
      expect((error as UpstreamShapeChangedError).field).toBe('asset_id');
    }
  });

  it('fails loudly when asset_id is not a bare digit string', () => {
    const raw = readFixture('clob-book-liquid.json') as Record<string, unknown>;
    expect(() => parseClobBook({ ...raw, asset_id: '123abc' })).toThrow(UpstreamShapeChangedError);
  });
});

describe('ClobPriceHistorySchema', () => {
  it('parses the recorded fixture', () => {
    const history = parseClobPriceHistory(readFixture('clob-prices-history-liquid.json'));
    expect(history.history.length).toBeGreaterThan(0);
    expect(typeof history.history[0]?.t).toBe('number');
    expect(typeof history.history[0]?.p).toBe('number');
  });

  it('fails loudly when history is renamed', () => {
    const result = ClobPriceHistorySchema.safeParse({ points: [{ t: 1, p: 0.5 }] });
    expect(result.success).toBe(false);
  });
});
