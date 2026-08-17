import { describe, expect, it } from 'vitest';

import {
  asFeeRate,
  asPrice,
  asProbability,
  asShares,
  asUsdc,
  priceValue,
  usdcValue,
  type BookLevel,
  type FeeConfig,
  type FillEstimate,
  type OrderBook,
} from '@/domain';
import { computeCostWaterfall, computeEdge } from '@/simulation';

const POLITICS_FEE: FeeConfig = {
  enabled: true,
  takerRate: asFeeRate(0.04),
  makerRate: asFeeRate(0),
  displayLabel: 'Politics · 4% taker rate',
  source: 'market-object',
  estimated: false,
};

function level(price: number, size: number): BookLevel {
  return { price: asPrice(price), size: asShares(size) };
}

function book(bids: readonly BookLevel[], asks: readonly BookLevel[]): OrderBook {
  return {
    tokenId: '123',
    bids,
    asks,
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    negRisk: false,
    lastTradePrice: null,
    fetchedAt: 1_700_000_000_000,
    upstreamTimestamp: '2026-08-16T00:00:00Z',
  };
}

/**
 * A fill whose averagePrice is 0.624, matching the ORDER_EXECUTION.md §3 worked example.
 * The rest of the fields are internally consistent but not exercised by this test.
 */
function fillAt(averagePrice: number): FillEstimate {
  return {
    requested: { kind: 'shares', value: asShares(40) },
    legs: [{ price: asPrice(averagePrice), shares: asShares(40) }],
    sharesFilled: asShares(40),
    averagePrice: asPrice(averagePrice),
    topOfBookPrice: asPrice(averagePrice),
    priceImpact: asPrice(0),
    grossCost: asUsdc(40 * averagePrice),
    fee: asUsdc(0),
    totalCost: asUsdc(40 * averagePrice),
    payoutIfWin: asUsdc(40),
    netProfitIfWin: asUsdc(40 - 40 * averagePrice),
    partial: false,
    maxFillableShares: asShares(40),
    bookFetchedAt: 1_700_000_000_000,
  };
}

describe('computeCostWaterfall: the worked example from ORDER_EXECUTION.md §3', () => {
  // bid 0.600, ask 0.620 -> midpoint 0.610. Average fill price 0.624 (price impact at size).
  const theBook = book([level(0.6, 100)], [level(0.62, 100)]);
  const fill = fillAt(0.624);

  it('reproduces every named step exactly', () => {
    const waterfall = computeCostWaterfall(theBook, fill, POLITICS_FEE);

    expect(priceValue(waterfall.marketMidpoint)).toBeCloseTo(0.61, 10);
    expect(priceValue(waterfall.bestAsk)).toBeCloseTo(0.62, 10);
    expect(priceValue(waterfall.averageFillPrice)).toBeCloseTo(0.624, 10);
    // 1 share * 0.04 * 0.624 * 0.376 = 0.00938496, rounds to 0.00938 at 5dp.
    expect(usdcValue(waterfall.feePerShare)).toBeCloseTo(0.00938, 10);
    // 0.624 + 0.00938 = 0.63338
    expect(usdcValue(waterfall.effectiveCostPerShare)).toBeCloseTo(0.63338, 10);
  });

  it('computeEdge reproduces the surviving edge exactly: 0.680 blended minus 0.63338 effective cost', () => {
    const waterfall = computeCostWaterfall(theBook, fill, POLITICS_FEE);
    const edge = computeEdge(asProbability(0.68), waterfall);
    expect(edge).toBeCloseTo(0.04662, 10);
  });
});

describe('computeEdge: negative edge is returned as a negative number, never clamped to zero', () => {
  it('when the blended estimate is below the effective cost per share', () => {
    const theBook = book([level(0.6, 100)], [level(0.62, 100)]);
    const fill = fillAt(0.624);
    const waterfall = computeCostWaterfall(theBook, fill, POLITICS_FEE);

    // effectiveCostPerShare is 0.63338; an estimate of 0.5 must yield a real negative number.
    const edge = computeEdge(asProbability(0.5), waterfall);
    expect(edge).toBeLessThan(0);
    expect(edge).toBeCloseTo(0.5 - 0.63338, 10);
  });
});

describe('computeCostWaterfall: never throws on an empty book', () => {
  it('an empty book on both sides falls back to zero prices rather than throwing', () => {
    const empty = book([], []);
    const fill = fillAt(0);

    expect(() => computeCostWaterfall(empty, fill, POLITICS_FEE)).not.toThrow();
    const waterfall = computeCostWaterfall(empty, fill, POLITICS_FEE);
    expect(priceValue(waterfall.bestAsk)).toBe(0);
    expect(priceValue(waterfall.marketMidpoint)).toBe(0);
  });

  it('an empty bid side alone falls back to using the ask as the midpoint', () => {
    const askOnly = book([], [level(0.62, 100)]);
    const fill = fillAt(0.624);

    expect(() => computeCostWaterfall(askOnly, fill, POLITICS_FEE)).not.toThrow();
    const waterfall = computeCostWaterfall(askOnly, fill, POLITICS_FEE);
    expect(priceValue(waterfall.marketMidpoint)).toBeCloseTo(0.62, 10);
  });
});
