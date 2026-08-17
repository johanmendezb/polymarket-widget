import { describe, expect, it } from 'vitest';

import {
  ERROR_CODES,
  GATE_REASONS,
  asFeeRate,
  asPrice,
  asProbability,
  asShares,
  asUsdc,
  isErrorCode,
  isGateReason,
  isTokenId,
  priceValue,
  type BookLevel,
  type ErrorCode,
  type FeeConfig,
  type FillEstimate,
  type Market,
  type MarketOutcome,
  type OrderBook,
  type SimulatedPosition,
} from '@/domain';

/** A real-shaped CLOB token id: 77 decimal digits, far past Number.MAX_SAFE_INTEGER. */
const TOKEN_ID =
  '71321045679252212594626385532706912750332728571942532289631379312455583992563';

describe('token ids', () => {
  it('is a 77-digit decimal that a number cannot hold', () => {
    expect(TOKEN_ID).toHaveLength(77);
    expect(isTokenId(TOKEN_ID)).toBe(true);
    expect(Number(TOKEN_ID) > Number.MAX_SAFE_INTEGER).toBe(true);
    expect(String(Number(TOKEN_ID))).not.toBe(TOKEN_ID);
  });

  it('round-trips through the domain types and JSON with no precision loss', () => {
    const book: OrderBook = {
      tokenId: TOKEN_ID,
      bids: [{ price: asPrice(0.44), size: asShares(120) }],
      asks: [{ price: asPrice(0.45), size: asShares(200) }],
      tickSize: asPrice(0.01),
      minOrderSize: asUsdc(5),
      negRisk: false,
      lastTradePrice: asPrice(0.44),
      fetchedAt: 1_755_300_000_000,
      upstreamTimestamp: '1755300000000',
    };

    const position: SimulatedPosition = {
      id: 'pos-1',
      marketId: '516710',
      marketQuestion: 'Will it rain?',
      outcomeLabel: 'Yes',
      tokenId: TOKEN_ID,
      shares: asShares(100),
      entryAveragePrice: asPrice(0.45),
      feePaid: asUsdc(0.99),
      totalCost: asUsdc(45.99),
      payoutIfWin: asUsdc(100),
      createdAt: 1_755_300_000_000,
      simulated: true,
    };

    const revived = JSON.parse(JSON.stringify({ book, position })) as {
      book: { tokenId: string };
      position: { tokenId: string };
    };

    expect(revived.book.tokenId).toBe(TOKEN_ID);
    expect(revived.position.tokenId).toBe(TOKEN_ID);
    expect(revived.position.tokenId).toHaveLength(77);
  });

  it('rejects anything that is not a plain decimal string', () => {
    expect(isTokenId('')).toBe(false);
    expect(isTokenId('0x1f')).toBe(false);
    expect(isTokenId('12.5')).toBe(false);
    expect(isTokenId(' 123')).toBe(false);
    expect(isTokenId(123)).toBe(false);
  });
});

describe('the OrderBook normalization contract', () => {
  // Upstream orders BOTH sides worst-price-first. mapOrderBook (T3.1) reverses
  // both. This test states the contract the domain type documents; the reversal
  // below stands in for that mapper.
  const upstreamAsks = ['0.999', '0.998', '0.500', '0.460'];
  const upstreamBids = ['0.001', '0.100', '0.440', '0.450'];

  const normalize = (prices: string[]): BookLevel[] =>
    [...prices].reverse().map((p) => ({ price: asPrice(Number(p)), size: asShares(10) }));

  const book: OrderBook = {
    tokenId: TOKEN_ID,
    bids: normalize(upstreamBids),
    asks: normalize(upstreamAsks),
    tickSize: asPrice(0.001),
    minOrderSize: asUsdc(5),
    negRisk: false,
    lastTradePrice: null,
    fetchedAt: 1_755_300_000_000,
    upstreamTimestamp: '1755300000000',
  };

  it('puts the lowest ask at asks[0]', () => {
    const asks = book.asks.map((l) => priceValue(l.price));
    expect(asks[0]).toBe(Math.min(...asks));
    expect(asks[0]).toBe(0.46);
  });

  it('puts the highest bid at bids[0]', () => {
    const bids = book.bids.map((l) => priceValue(l.price));
    expect(bids[0]).toBe(Math.max(...bids));
    expect(bids[0]).toBe(0.45);
  });

  it('is not crossed (I1) and the spread reads narrow', () => {
    const bestAsk = priceValue(book.asks[0]!.price);
    const bestBid = priceValue(book.bids[0]!.price);
    expect(bestAsk).toBeGreaterThanOrEqual(bestBid);
    // The quiet failure: an unreversed bids array passes the crossed check and
    // still reports a 0.459 spread, which trips every wide-spread rule.
    expect(bestAsk - bestBid).toBeCloseTo(0.01, 10);
  });
});

describe('FeeConfig', () => {
  it('carries the rate and the provenance together', () => {
    const fromMarket: FeeConfig = {
      enabled: true,
      takerRate: asFeeRate(0.04),
      makerRate: asFeeRate(0),
      displayLabel: 'Politics · 4% taker rate',
      source: 'market-object',
      estimated: false,
    };
    expect(fromMarket.estimated).toBe(false);

    const fallback: FeeConfig = {
      enabled: true,
      takerRate: asFeeRate(0.04),
      makerRate: asFeeRate(0),
      displayLabel: 'Politics · 4% taker rate (estimated)',
      source: 'category-fallback',
      estimated: true,
    };
    expect(fallback.estimated).toBe(true);
  });

  it('refuses to call a category fallback anything but estimated', () => {
    // @ts-expect-error a fallback rate is always estimated; the pairing is not free
    const wrong: FeeConfig = { enabled: true, takerRate: asFeeRate(0.04), makerRate: asFeeRate(0), displayLabel: 'Politics · 4% taker rate', source: 'category-fallback', estimated: false };
    expect(wrong.source).toBe('category-fallback');
  });

  it('refuses to call a read rate estimated', () => {
    // @ts-expect-error a rate read from the market object is not an estimate
    const wrong: FeeConfig = { enabled: true, takerRate: asFeeRate(0.04), makerRate: asFeeRate(0), displayLabel: 'Politics · 4% taker rate', source: 'market-object', estimated: true };
    expect(wrong.source).toBe('market-object');
  });
});

describe('the closed unions', () => {
  it('lists every ErrorCode from API_CONTRACTS.md', () => {
    expect([...ERROR_CODES]).toEqual([
      'UPSTREAM_UNAVAILABLE',
      'UPSTREAM_RATE_LIMITED',
      'UPSTREAM_SHAPE_CHANGED',
      'NOT_FOUND',
      'BAD_REQUEST',
      'AI_TIMEOUT',
      'AI_INVALID_OUTPUT',
      'AI_NO_EVIDENCE',
      'INTERNAL',
    ]);
    expect(isErrorCode('NOT_FOUND')).toBe(true);
    expect(isErrorCode('SOMETHING_ELSE')).toBe(false);
  });

  it('rejects a string that is not a member', () => {
    // @ts-expect-error the union is closed; strings are not error codes
    const code: ErrorCode = 'OOPS';
    expect(isErrorCode(code)).toBe(false);
  });

  it('lists all eleven gate reasons', () => {
    expect(GATE_REASONS).toHaveLength(11);
    expect(isGateReason('SPREAD_TOO_WIDE')).toBe(true);
    expect(isGateReason('VIBES')).toBe(false);
  });
});

describe('the entity types compose', () => {
  it('builds a Market whose prices are all branded', () => {
    const market: Market = {
      id: '516710',
      slug: 'will-it-rain',
      conditionId: '0xabc',
      question: 'Will it rain?',
      description: 'A market.',
      resolutionSource: null,
      resolutionCriteria: 'Resolves YES if it rains.',
      outcomes: [
        { label: 'Yes', tokenId: TOKEN_ID, indicativePrice: asPrice(0.45) },
        { label: 'No', tokenId: '2714', indicativePrice: null },
      ],
      negRisk: false,
      acceptingOrders: true,
      closed: false,
      active: true,
      endDate: '2026-12-31T00:00:00Z',
      tickSize: asPrice(0.01),
      minOrderSize: asUsdc(5),
      fees: {
        enabled: false,
        takerRate: asFeeRate(0),
        makerRate: asFeeRate(0),
        displayLabel: 'No taker fee',
        source: 'market-object',
        estimated: false,
      },
      liquidityUsd: 1200,
      volume24hUsd: 340,
      bestBid: asPrice(0.44),
      bestAsk: asPrice(0.46),
      spread: asPrice(0.02),
      lastTradePrice: asPrice(0.45),
      eventId: '1234',
      eventTitle: 'Weather',
      category: 'Weather',
    };

    expect(market.outcomes[0]?.tokenId).toBe(TOKEN_ID);
    expect(priceValue(market.bestAsk!)).toBe(0.46);
  });

  it('builds a FillEstimate whose requested leg is a closed union', () => {
    const fill: FillEstimate = {
      requested: { kind: 'shares', value: asShares(100) },
      legs: [{ price: asPrice(0.46), shares: asShares(100) }],
      sharesFilled: asShares(100),
      averagePrice: asPrice(0.46),
      topOfBookPrice: asPrice(0.46),
      priceImpact: asPrice(0),
      grossCost: asUsdc(46),
      fee: asUsdc(0.99),
      totalCost: asUsdc(46.99),
      payoutIfWin: asUsdc(100),
      netProfitIfWin: asUsdc(53.01),
      partial: false,
      maxFillableShares: asShares(100),
      bookFetchedAt: 1_755_300_000_000,
    };

    expect(fill.requested.kind).toBe('shares');

    // @ts-expect-error the requested amount is shares or usdc, never anything else
    const bad: FillEstimate['requested'] = { kind: 'dollars', value: asUsdc(50) };
    expect(bad.kind).toBe('dollars');
  });

  it('keeps a probability out of a price field', () => {
    // @ts-expect-error indicativePrice is a Price, and a Probability is not one
    const outcome: MarketOutcome = { label: 'Yes', tokenId: TOKEN_ID, indicativePrice: asProbability(0.45) };
    expect(outcome.label).toBe('Yes');
  });
});
