import { describe, expect, it } from 'vitest';

import {
  asFeeRate,
  asPrice,
  asShares,
  asUsdc,
  priceValue,
  sharesValue,
  usdcValue,
  type BookLevel,
  type FeeConfig,
  type OrderBook,
} from '@/domain';
import { walkBook, walkBookByBudget } from '@/simulation';

const POLITICS_FEE: FeeConfig = {
  enabled: true,
  takerRate: asFeeRate(0.04),
  makerRate: asFeeRate(0),
  displayLabel: 'Politics · 4% taker rate',
  source: 'market-object',
  estimated: false,
};

const NO_FEE: FeeConfig = {
  enabled: false,
  takerRate: asFeeRate(0),
  makerRate: asFeeRate(0),
  displayLabel: 'Geopolitics · no taker fee',
  source: 'market-object',
  estimated: false,
};

function level(price: number, size: number): BookLevel {
  return { price: asPrice(price), size: asShares(size) };
}

function bookWithAsks(asks: readonly BookLevel[]): OrderBook {
  return {
    tokenId: '123',
    bids: [],
    asks,
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    negRisk: false,
    lastTradePrice: null,
    fetchedAt: 1_700_000_000_000,
    upstreamTimestamp: '2026-08-16T00:00:00Z',
  };
}

/** Ascending: asks[0] is genuinely the best (lowest) ask, per the mapOrderBook contract. */
const THREE_LEVEL_BOOK = bookWithAsks([level(0.6, 50), level(0.62, 30), level(0.65, 100)]);

describe('walkBook: fills entirely within the top level', () => {
  it('averagePrice equals topOfBookPrice and priceImpact is zero', () => {
    const fill = walkBook(THREE_LEVEL_BOOK, { shares: asShares(20) }, POLITICS_FEE);

    expect(priceValue(fill.averagePrice)).toBeCloseTo(0.6, 10);
    expect(priceValue(fill.topOfBookPrice)).toBeCloseTo(0.6, 10);
    expect(priceValue(fill.priceImpact)).toBe(0);
    expect(sharesValue(fill.sharesFilled)).toBe(20);
    expect(fill.partial).toBe(false);
    expect(fill.legs).toHaveLength(1);
  });
});

describe('walkBook: fills across three levels', () => {
  it('matches the hand-computed VWAP to 6dp', () => {
    // 50@0.60 + 30@0.62 + 20@0.65 = 30 + 18.6 + 13 = 61.6 / 100 = 0.616
    const fill = walkBook(THREE_LEVEL_BOOK, { shares: asShares(100) }, POLITICS_FEE);

    expect(priceValue(fill.averagePrice)).toBeCloseTo(0.616, 6);
    expect(priceValue(fill.topOfBookPrice)).toBeCloseTo(0.6, 10);
    expect(priceValue(fill.priceImpact)).toBeCloseTo(0.016, 6);
    expect(sharesValue(fill.sharesFilled)).toBe(100);
    expect(fill.partial).toBe(false);
    expect(fill.legs).toHaveLength(3);
    expect(usdcValue(fill.grossCost)).toBeCloseTo(61.6, 6);
  });
});

describe('walkBook: a request exceeding total depth', () => {
  it('returns a partial fill capped at the book depth, and never throws', () => {
    // Total depth of THREE_LEVEL_BOOK is 50 + 30 + 100 = 180.
    expect(() => walkBook(THREE_LEVEL_BOOK, { shares: asShares(500) }, POLITICS_FEE)).not.toThrow();

    const fill = walkBook(THREE_LEVEL_BOOK, { shares: asShares(500) }, POLITICS_FEE);

    expect(fill.partial).toBe(true);
    expect(sharesValue(fill.sharesFilled)).toBe(180);
    expect(sharesValue(fill.maxFillableShares)).toBe(180);
    // VWAP of the whole book: (50*0.60 + 30*0.62 + 100*0.65) / 180 = 113.6 / 180
    expect(priceValue(fill.averagePrice)).toBeCloseTo(113.6 / 180, 6);
  });
});

describe('walkBook: an empty book', () => {
  it('fills zero shares with no NaN and no throw', () => {
    const empty = bookWithAsks([]);

    expect(() => walkBook(empty, { shares: asShares(10) }, POLITICS_FEE)).not.toThrow();

    const fill = walkBook(empty, { shares: asShares(10) }, POLITICS_FEE);

    expect(sharesValue(fill.sharesFilled)).toBe(0);
    expect(fill.partial).toBe(true);
    expect(sharesValue(fill.maxFillableShares)).toBe(0);
    expect(Number.isNaN(priceValue(fill.averagePrice))).toBe(false);
    expect(Number.isNaN(usdcValue(fill.fee))).toBe(false);
    expect(priceValue(fill.averagePrice)).toBe(0);
    expect(priceValue(fill.priceImpact)).toBe(0);
    expect(usdcValue(fill.grossCost)).toBe(0);
    expect(usdcValue(fill.fee)).toBe(0);
  });

  it('a request for zero shares against an empty book is not partial', () => {
    const empty = bookWithAsks([]);
    const fill = walkBook(empty, { shares: asShares(0) }, POLITICS_FEE);

    expect(fill.partial).toBe(false);
    expect(sharesValue(fill.sharesFilled)).toBe(0);
  });
});

describe('walkBookByBudget: a dollar request splitting a level', () => {
  it('computes fractional shares correctly', () => {
    // $30 exactly exhausts level 1 (50 @ 0.60). Remaining $5 buys 5 / 0.62 shares of level 2.
    const fill = walkBookByBudget(THREE_LEVEL_BOOK, { usdc: asUsdc(35) }, POLITICS_FEE);

    const expectedLevel2Shares = 5 / 0.62;
    expect(sharesValue(fill.sharesFilled)).toBeCloseTo(50 + expectedLevel2Shares, 6);
    expect(fill.legs).toHaveLength(2);
    expect(sharesValue(fill.legs[1]!.shares)).toBeCloseTo(expectedLevel2Shares, 6);
    expect(fill.partial).toBe(false);
    expect(usdcValue(fill.grossCost)).toBeCloseTo(35, 6);
  });

  it('a budget exceeding total book value yields a partial fill and never throws', () => {
    expect(() =>
      walkBookByBudget(THREE_LEVEL_BOOK, { usdc: asUsdc(1_000_000) }, POLITICS_FEE),
    ).not.toThrow();

    const fill = walkBookByBudget(THREE_LEVEL_BOOK, { usdc: asUsdc(1_000_000) }, POLITICS_FEE);

    expect(fill.partial).toBe(true);
    expect(sharesValue(fill.sharesFilled)).toBe(180);
  });

  it('an empty book yields zero shares with no NaN and no throw', () => {
    const empty = bookWithAsks([]);
    expect(() => walkBookByBudget(empty, { usdc: asUsdc(10) }, POLITICS_FEE)).not.toThrow();

    const fill = walkBookByBudget(empty, { usdc: asUsdc(10) }, POLITICS_FEE);
    expect(sharesValue(fill.sharesFilled)).toBe(0);
    expect(fill.partial).toBe(true);
    expect(Number.isNaN(priceValue(fill.averagePrice))).toBe(false);
  });

  it('a budget landing exactly on a level boundary stops there without probing further levels', () => {
    // $30 exactly exhausts level 1 (50 @ 0.60), leaving budget at exactly 0 with two levels
    // still unread. This exercises the loop's early-stop guard, not just natural exhaustion.
    const fill = walkBookByBudget(THREE_LEVEL_BOOK, { usdc: asUsdc(30) }, POLITICS_FEE);

    expect(fill.legs).toHaveLength(1);
    expect(sharesValue(fill.sharesFilled)).toBe(50);
    expect(fill.partial).toBe(false);
  });
});

describe('walkBook: normalization is the callers responsibility, not walkBooks', () => {
  it('trusts asks[0] as given; feeding a raw (unnormalized) descending fixture proves the boundary', () => {
    // Real upstream `GET /book` sends asks worst-price-first (descending). mapOrderBook is
    // responsible for reversing this before it ever reaches walkBook. This test proves walkBook
    // does NOT defend against an unreversed array: if it did, this test would fail.
    const rawUpstreamShapedBook = bookWithAsks([level(0.99, 10), level(0.5, 10), level(0.05, 10)]);

    const fill = walkBook(rawUpstreamShapedBook, { shares: asShares(5) }, POLITICS_FEE);

    // Treating the (wrongly ordered) first element as top-of-book prices the buy at 99 cents
    // instead of the true best ask of 5 cents - exactly the loud failure ORDER_EXECUTION.md §1
    // and the polymarket-domain skill warn about. walkBook's contract is to trust its input.
    expect(priceValue(fill.topOfBookPrice)).toBeCloseTo(0.99, 10);
    expect(priceValue(fill.averagePrice)).toBeCloseTo(0.99, 10);
  });
});

describe('fee wiring', () => {
  it('a disabled fee config produces zero fee regardless of price', () => {
    const fill = walkBook(THREE_LEVEL_BOOK, { shares: asShares(100) }, NO_FEE);
    expect(usdcValue(fill.fee)).toBe(0);
    expect(usdcValue(fill.totalCost)).toBeCloseTo(usdcValue(fill.grossCost), 10);
  });

  it('totalCost is grossCost plus fee, and payoutIfWin minus totalCost is netProfitIfWin', () => {
    const fill = walkBook(THREE_LEVEL_BOOK, { shares: asShares(40) }, POLITICS_FEE);
    expect(usdcValue(fill.totalCost)).toBeCloseTo(usdcValue(fill.grossCost) + usdcValue(fill.fee), 10);
    expect(usdcValue(fill.netProfitIfWin)).toBeCloseTo(
      usdcValue(fill.payoutIfWin) - usdcValue(fill.totalCost),
      10,
    );
  });

  it('a genuinely nonzero fee that rounds to 0 at 5dp is floored to 0.00001, never displayed as free', () => {
    // 1 share * rate 0.000001 * 0.5 * 0.5 = 0.00000025, which rounds to 0.00000 at 5dp.
    const tinyRate: FeeConfig = {
      enabled: true,
      takerRate: asFeeRate(0.000001),
      makerRate: asFeeRate(0),
      displayLabel: 'tiny rate',
      source: 'market-object',
      estimated: false,
    };
    const oneShareAt50c = bookWithAsks([level(0.5, 1)]);
    const fill = walkBook(oneShareAt50c, { shares: asShares(1) }, tinyRate);
    expect(usdcValue(fill.fee)).toBe(0.00001);
  });
});

describe('invariants (docs/03-domain/POLYMARKET_DOMAIN_MODEL.md §6)', () => {
  it('I2: sum(legs.shares) === sharesFilled', () => {
    const fill = walkBook(THREE_LEVEL_BOOK, { shares: asShares(100) }, POLITICS_FEE);
    const legSum = fill.legs.reduce((acc, leg) => acc + sharesValue(leg.shares), 0);
    expect(legSum).toBeCloseTo(sharesValue(fill.sharesFilled), 10);
  });

  it('I3: averagePrice === sum(legs.price * legs.shares) / sharesFilled within float tolerance', () => {
    const fill = walkBook(THREE_LEVEL_BOOK, { shares: asShares(100) }, POLITICS_FEE);
    const weighted = fill.legs.reduce(
      (acc, leg) => acc + priceValue(leg.price) * sharesValue(leg.shares),
      0,
    );
    expect(priceValue(fill.averagePrice)).toBeCloseTo(weighted / sharesValue(fill.sharesFilled), 10);
  });

  it('I4: averagePrice >= topOfBookPrice for a BUY, always', () => {
    const fill = walkBook(THREE_LEVEL_BOOK, { shares: asShares(100) }, POLITICS_FEE);
    expect(priceValue(fill.averagePrice)).toBeGreaterThanOrEqual(priceValue(fill.topOfBookPrice));
  });

  it('I8: partial === (sharesFilled < requestedShares)', () => {
    const under = walkBook(THREE_LEVEL_BOOK, { shares: asShares(100) }, POLITICS_FEE);
    expect(under.partial).toBe(sharesValue(under.sharesFilled) < 100);

    const over = walkBook(THREE_LEVEL_BOOK, { shares: asShares(500) }, POLITICS_FEE);
    expect(over.partial).toBe(sharesValue(over.sharesFilled) < 500);
  });

  it('I9: a request larger than total book depth yields partial: true and never throws', () => {
    expect(() => walkBook(THREE_LEVEL_BOOK, { shares: asShares(10_000) }, POLITICS_FEE)).not.toThrow();
    const fill = walkBook(THREE_LEVEL_BOOK, { shares: asShares(10_000) }, POLITICS_FEE);
    expect(fill.partial).toBe(true);
  });

  it('I10: an empty book yields sharesFilled === 0, partial: true, and no division by zero', () => {
    const fill = walkBook(bookWithAsks([]), { shares: asShares(10) }, POLITICS_FEE);
    expect(sharesValue(fill.sharesFilled)).toBe(0);
    expect(fill.partial).toBe(true);
    expect(Number.isFinite(priceValue(fill.averagePrice))).toBe(true);
  });
});

describe('property: averagePrice is never below topOfBookPrice', () => {
  // Deterministic PRNG so the property test is reproducible without a fuzzing dependency.
  function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it('holds for 200 randomly generated books and request sizes, for both shares and budget requests', () => {
    const rand = mulberry32(20260816);
    for (let i = 0; i < 200; i++) {
      const levelCount = 1 + Math.floor(rand() * 5);
      let price = 0.02 + rand() * 0.2;
      const asks: BookLevel[] = [];
      for (let l = 0; l < levelCount; l++) {
        price = Math.min(0.99, price + rand() * 0.1);
        const size = 1 + rand() * 200;
        asks.push(level(Math.round(price * 10_000) / 10_000, size));
      }
      const book = bookWithAsks(asks);
      const requestShares = asShares(rand() * 500);
      const requestUsdc = asUsdc(rand() * 200);

      const byShares = walkBook(book, { shares: requestShares }, POLITICS_FEE);
      const byBudget = walkBookByBudget(book, { usdc: requestUsdc }, POLITICS_FEE);

      for (const fill of [byShares, byBudget]) {
        expect(Number.isFinite(priceValue(fill.averagePrice))).toBe(true);
        expect(Number.isFinite(usdcValue(fill.fee))).toBe(true);
        if (sharesValue(fill.sharesFilled) > 0) {
          expect(priceValue(fill.averagePrice)).toBeGreaterThanOrEqual(
            priceValue(fill.topOfBookPrice) - 1e-9,
          );
        }
      }
    }
  });
});
