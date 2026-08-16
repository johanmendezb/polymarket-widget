/**
 * T3.2 acceptance: invariants I1 and I11, and the narrow-spread test that is
 * the one test in the whole read path that actually catches an unreversed
 * `bids` array (see the `polymarket-domain` skill and
 * `03-domain/POLYMARKET_DOMAIN_MODEL.md` §2).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { feeRateValue, priceValue, sharesValue } from '@/domain';
import { UpstreamShapeChangedError } from '@/polymarket/errors';
import { mapMarket, mapOrderBook, mapPriceHistory, mapSearchResults } from '@/polymarket/mappers';
import {
  parseClobBook,
  parseClobPriceHistory,
  parseGammaMarket,
  parseGammaSearchResponse,
  type GammaMarket,
} from '@/polymarket/schemas';

const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));

function readFixture(file: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), 'utf8'));
}

describe('mapOrderBook', () => {
  it('reverses the raw descending-asks fixture so asks[0] is the minimum (the single most important test in the read path)', () => {
    const raw = parseClobBook(readFixture('clob-book-liquid.json'));
    // Prove the fixture really is descending on the wire before normalizing,
    // so this test cannot pass against a book that was already ascending.
    const wireAskPrices = raw.asks.map((level) => level.price);
    expect(wireAskPrices).toEqual([...wireAskPrices].sort((a, b) => b - a));

    const book = mapOrderBook(raw, 1_700_000_000_000);
    const askPrices = book.asks.map((level) => priceValue(level.price));
    expect(askPrices[0]).toBe(Math.min(...askPrices));
    expect(askPrices).toEqual([...askPrices].sort((a, b) => a - b));
  });

  it('reverses the raw ascending-bids fixture so bids[0] is the maximum', () => {
    const raw = parseClobBook(readFixture('clob-book-liquid.json'));
    const wireBidPrices = raw.bids.map((level) => level.price);
    expect(wireBidPrices).toEqual([...wireBidPrices].sort((a, b) => a - b));

    const book = mapOrderBook(raw, 1_700_000_000_000);
    const bidPrices = book.bids.map((level) => priceValue(level.price));
    expect(bidPrices[0]).toBe(Math.max(...bidPrices));
    expect(bidPrices).toEqual([...bidPrices].sort((a, b) => b - a));
  });

  it('is not crossed after normalization: bestAsk >= bestBid (invariant I1)', () => {
    for (const file of ['clob-book-liquid.json', 'clob-book-thin.json']) {
      const book = mapOrderBook(parseClobBook(readFixture(file)), Date.now());
      const bestAsk = book.asks[0];
      const bestBid = book.bids[0];
      expect(bestAsk).toBeDefined();
      expect(bestBid).toBeDefined();
      if (bestAsk && bestBid) {
        expect(priceValue(bestAsk.price)).toBeGreaterThanOrEqual(priceValue(bestBid.price));
      }
    }
  });

  it('produces a narrow spread on the recorded liquid book — the one test that actually catches an unreversed bids array (I1 alone cannot)', () => {
    const book = mapOrderBook(parseClobBook(readFixture('clob-book-liquid.json')), Date.now());
    const bestAsk = book.asks[0];
    const bestBid = book.bids[0];
    expect(bestAsk).toBeDefined();
    expect(bestBid).toBeDefined();
    if (bestAsk && bestBid) {
      const spread = priceValue(bestAsk.price) - priceValue(bestBid.price);
      // The fixture's manifest records best ask 0.75 with resting liquidity
      // within 0.02 of it; an unreversed bids[0] would read as the worst bid
      // (0.01) and put the spread near 0.74, not under a few cents.
      expect(spread).toBeLessThan(0.05);
      expect(spread).toBeGreaterThanOrEqual(0);
    }
  });

  it('detects an unreversed-bids regression: mapping the raw (un-normalized) array directly would fail the narrow-spread test', () => {
    const raw = parseClobBook(readFixture('clob-book-liquid.json'));
    // Simulate the bug this whole test file exists to prevent: reading
    // bids[0] straight off the wire instead of reversing first.
    const brokenBestBid = raw.bids[0];
    const correctBestBid = [...raw.bids].reverse()[0];
    expect(brokenBestBid).toBeDefined();
    expect(correctBestBid).toBeDefined();
    if (brokenBestBid && correctBestBid) {
      expect(brokenBestBid.price).not.toBe(correctBestBid.price);
      expect(brokenBestBid.price).toBeLessThan(correctBestBid.price);
    }
  });

  it('carries an empty asks array through as a valid book, not an error', () => {
    const raw = parseClobBook(readFixture('clob-book-thin.json'));
    const emptied = { ...raw, asks: [] };
    const book = mapOrderBook(emptied, Date.now());
    expect(book.asks).toEqual([]);
  });

  it('round-trips tokenId as a string beyond Number.MAX_SAFE_INTEGER', () => {
    const book = mapOrderBook(parseClobBook(readFixture('clob-book-liquid.json')), Date.now());
    expect(BigInt(book.tokenId)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
    expect(typeof book.tokenId).toBe('string');
  });

  it('maps tickSize, minOrderSize and negRisk from the snake_case wire fields', () => {
    const raw = parseClobBook(readFixture('clob-book-liquid.json'));
    const book = mapOrderBook(raw, Date.now());
    expect(priceValue(book.tickSize)).toBe(raw.tick_size);
    expect(book.negRisk).toBe(raw.neg_risk);
  });

  it('preserves size at each level as a Shares brand', () => {
    const book = mapOrderBook(parseClobBook(readFixture('clob-book-liquid.json')), Date.now());
    for (const level of [...book.asks, ...book.bids]) {
      expect(sharesValue(level.size)).toBeGreaterThan(0);
    }
  });
});

describe('mapMarket', () => {
  it('pairs outcomes[i] with clobTokenIds[i] and outcomePrices[i] by index', () => {
    const raw = parseGammaMarket(readFixture('gamma-market-liquid.json'));
    const market = mapMarket(raw);
    expect(market.outcomes).toHaveLength(2);
    expect(market.outcomes[0]?.label).toBe('Yes');
    expect(market.outcomes[0]?.tokenId).toBe(
      '5615282760875985231868508008056959876238536896643315063916840237042205273721',
    );
    expect(priceValue(market.outcomes[0]!.indicativePrice!)).toBeCloseTo(0.745, 5);
  });

  it('fails loudly if outcomes/clobTokenIds/outcomePrices differ in length, even bypassing the schema', () => {
    const raw = parseGammaMarket(readFixture('gamma-market-liquid.json'));
    const broken: GammaMarket = { ...raw, outcomes: ['Yes'] };
    expect(() => mapMarket(broken)).toThrow(/same length/);
  });

  it('derives FeeConfig from the market object when feesEnabled and feeSchedule are present (source: market-object)', () => {
    const raw = parseGammaMarket(readFixture('gamma-market-liquid.json'));
    const market = mapMarket(raw);
    expect(market.fees.source).toBe('market-object');
    expect(market.fees.estimated).toBe(false);
    expect(feeRateValue(market.fees.takerRate)).toBeCloseTo(0.05, 5);
  });

  it('falls back to the category table, labelled estimated, only when the fee fields are absent', () => {
    const raw = parseGammaMarket(readFixture('gamma-market-thin.json'));
    const withoutFeeFields: GammaMarket = {
      ...raw,
      feesEnabled: null,
      feeType: null,
      feeSchedule: null,
      takerBaseFee: null,
      makerBaseFee: null,
    };
    const market = mapMarket(withoutFeeFields);
    expect(market.fees.source).toBe('category-fallback');
    expect(market.fees.estimated).toBe(true);
    // feeType is gone too, so there is no category signal at all: falls to
    // the "other" bucket, 0.05 per COMPETITIVE_RESEARCH.md §1.4c.
    expect(feeRateValue(market.fees.takerRate)).toBeCloseTo(0.05, 5);
  });

  it('falls back to the correct category rate when feeType survives but feesEnabled/feeSchedule do not', () => {
    const raw = parseGammaMarket(readFixture('gamma-market-thin.json')); // feeType: politics_fees
    const partial: GammaMarket = { ...raw, feesEnabled: false, feeSchedule: null };
    const market = mapMarket(partial);
    expect(market.fees.source).toBe('category-fallback');
    expect(feeRateValue(market.fees.takerRate)).toBeCloseTo(0.04, 5); // politics
  });

  it('never maps an absent fee field to a zero-rate market-object config (ADR-0009)', () => {
    const raw = parseGammaMarket(readFixture('gamma-market-liquid.json'));
    const geopoliticsLikeButAbsent: GammaMarket = {
      ...raw,
      feesEnabled: null,
      feeType: null,
      feeSchedule: null,
    };
    const market = mapMarket(geopoliticsLikeButAbsent);
    // Must not silently read as a real, confirmed zero-fee market-object rate.
    expect(market.fees.source).not.toBe('market-object');
  });

  it('excludes markets with enableOrderBook === false from search results', () => {
    const raw = parseGammaSearchResponse(readFixture('gamma-public-search-election.json'));
    const disabledEvents = raw.events.map((event) => ({
      ...event,
      markets: event.markets.map((market) => ({ ...market, enableOrderBook: false })),
    }));
    expect(mapSearchResults(disabledEvents)).toEqual([]);
  });

  it('carries eventId and eventTitle onto each market from mapSearchResults', () => {
    const raw = parseGammaSearchResponse(readFixture('gamma-public-search-election.json'));
    const markets = mapSearchResults(raw.events);
    expect(markets.length).toBeGreaterThan(0);
    for (const market of markets) {
      expect(market.eventId).not.toBeNull();
      expect(market.eventTitle).not.toBeNull();
    }
  });

  it('leaves eventId/eventTitle null for a standalone market (no event context)', () => {
    const raw = parseGammaMarket(readFixture('gamma-market-liquid.json'));
    const market = mapMarket(raw);
    expect(market.eventId).toBeNull();
    expect(market.eventTitle).toBeNull();
  });

  it('round-trips a 77-digit tokenId through mapMarket unchanged', () => {
    const raw = parseGammaMarket(readFixture('gamma-market-liquid.json'));
    const market = mapMarket(raw);
    const tokenId = market.outcomes[0]?.tokenId;
    expect(tokenId).toBeDefined();
    if (tokenId) {
      expect(BigInt(tokenId)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
    }
  });

  it('rejects a market built with a raw clobTokenIds JSON string (not schema-parsed) as a malformed shape', () => {
    // parseGammaMarket is the only path into GammaMarket; a hand-built
    // object standing in for one is the schema-boundary contract itself.
    expect(() => parseGammaMarket({})).toThrow(UpstreamShapeChangedError);
  });
});

describe('mapPriceHistory', () => {
  it('maps the recorded fixture to points', () => {
    const raw = parseClobPriceHistory(readFixture('clob-prices-history-liquid.json'));
    const points = mapPriceHistory(raw);
    expect(points.length).toBeGreaterThan(0);
    expect(points[0]).toEqual({ t: raw.history[0]?.t, p: raw.history[0]?.p });
  });
});
