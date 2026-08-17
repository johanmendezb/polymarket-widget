import { describe, expect, it } from 'vitest';

import { checkUnresolvedShortHorizon, selectFreezeUniverse } from '@/app/api/_manifest/universe';
import { asFeeRate, asPrice, asUsdc, type FeeConfig, type Market } from '@/domain';

const NOW = 1_700_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

const feeConfig: FeeConfig = {
  enabled: true,
  takerRate: asFeeRate(0.04),
  makerRate: asFeeRate(0),
  displayLabel: 'Politics · 4% taker rate',
  source: 'market-object',
  estimated: false,
};

function fixtureMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: '1',
    slug: 'test-market',
    conditionId: 'cond1',
    question: 'Will X happen?',
    description: 'A test market.',
    resolutionSource: null,
    resolutionCriteria: 'Resolves YES if X happens.',
    outcomes: [
      { label: 'Yes', tokenId: '111', indicativePrice: asPrice(0.5) },
      { label: 'No', tokenId: '222', indicativePrice: asPrice(0.5) },
    ],
    negRisk: false,
    acceptingOrders: true,
    closed: false,
    active: true,
    endDate: new Date(NOW + 10 * DAY_MS).toISOString(),
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    fees: feeConfig,
    liquidityUsd: null,
    volume24hUsd: null,
    bestBid: null,
    bestAsk: null,
    spread: null,
    lastTradePrice: null,
    eventId: null,
    eventTitle: null,
    category: 'Politics',
    ...overrides,
  };
}

describe('checkUnresolvedShortHorizon', () => {
  it('accepts a market inside the horizon window', () => {
    const check = checkUnresolvedShortHorizon(fixtureMarket(), { now: NOW, maxHorizonDays: 21 });
    expect(check.ok).toBe(true);
  });

  it('refuses a closed (resolved) market, with a message naming why', () => {
    const check = checkUnresolvedShortHorizon(fixtureMarket({ closed: true }), { now: NOW, maxHorizonDays: 21 });
    expect(check.ok).toBe(false);
    if (check.ok) throw new Error('unreachable');
    expect(check.reason).toBe('CLOSED');
    expect(check.message).toMatch(/closed \(resolved\)/i);
    expect(check.message).toMatch(/ADR-0007/);
  });

  it('refuses an inactive market', () => {
    const check = checkUnresolvedShortHorizon(fixtureMarket({ active: false }), { now: NOW, maxHorizonDays: 21 });
    expect(check.ok).toBe(false);
    if (check.ok) throw new Error('unreachable');
    expect(check.reason).toBe('INACTIVE');
  });

  it('refuses a market not accepting orders', () => {
    const check = checkUnresolvedShortHorizon(fixtureMarket({ acceptingOrders: false }), { now: NOW, maxHorizonDays: 21 });
    expect(check.ok).toBe(false);
    if (check.ok) throw new Error('unreachable');
    expect(check.reason).toBe('NOT_ACCEPTING_ORDERS');
  });

  it('refuses a market with no end date', () => {
    const check = checkUnresolvedShortHorizon(fixtureMarket({ endDate: null }), { now: NOW, maxHorizonDays: 21 });
    expect(check.ok).toBe(false);
    if (check.ok) throw new Error('unreachable');
    expect(check.reason).toBe('NO_END_DATE');
  });

  it('refuses a market whose end date has already passed', () => {
    const check = checkUnresolvedShortHorizon(fixtureMarket({ endDate: new Date(NOW - DAY_MS).toISOString() }), {
      now: NOW,
      maxHorizonDays: 21,
    });
    expect(check.ok).toBe(false);
    if (check.ok) throw new Error('unreachable');
    expect(check.reason).toBe('ALREADY_ENDED');
  });

  it('refuses a market ending beyond the horizon window', () => {
    const check = checkUnresolvedShortHorizon(fixtureMarket({ endDate: new Date(NOW + 30 * DAY_MS).toISOString() }), {
      now: NOW,
      maxHorizonDays: 21,
    });
    expect(check.ok).toBe(false);
    if (check.ok) throw new Error('unreachable');
    expect(check.reason).toBe('HORIZON_TOO_LONG');
  });

  it('accepts a market ending exactly at the horizon boundary', () => {
    const check = checkUnresolvedShortHorizon(fixtureMarket({ endDate: new Date(NOW + 21 * DAY_MS).toISOString() }), {
      now: NOW,
      maxHorizonDays: 21,
    });
    expect(check.ok).toBe(true);
  });
});

describe('selectFreezeUniverse', () => {
  it('excludes resolved and out-of-window markets, keeping only eligible ones', () => {
    const eligible = fixtureMarket({ id: '1', endDate: new Date(NOW + 5 * DAY_MS).toISOString() });
    const resolved = fixtureMarket({ id: '2', closed: true });
    const tooFar = fixtureMarket({ id: '3', endDate: new Date(NOW + 60 * DAY_MS).toISOString() });

    const result = selectFreezeUniverse([eligible, resolved, tooFar], { now: NOW, maxHorizonDays: 21 });

    expect(result.map((m) => m.id)).toEqual(['1']);
  });

  it('dedupes by market id, keeping the first occurrence', () => {
    const a = fixtureMarket({ id: '1', question: 'first' });
    const aDuplicate = fixtureMarket({ id: '1', question: 'second' });

    const result = selectFreezeUniverse([a, aDuplicate], { now: NOW, maxHorizonDays: 21 });

    expect(result).toHaveLength(1);
    expect(result[0]?.question).toBe('first');
  });

  it('sorts deterministically by soonest end date, then by market id', () => {
    const later = fixtureMarket({ id: 'b', endDate: new Date(NOW + 10 * DAY_MS).toISOString() });
    const soonerA = fixtureMarket({ id: 'a', endDate: new Date(NOW + 5 * DAY_MS).toISOString() });
    const soonerB = fixtureMarket({ id: 'z', endDate: new Date(NOW + 5 * DAY_MS).toISOString() });

    const result = selectFreezeUniverse([later, soonerB, soonerA], { now: NOW, maxHorizonDays: 21 });

    expect(result.map((m) => m.id)).toEqual(['a', 'z', 'b']);
  });

  it('is not truncated to any particular count — the caller decides how many to take', () => {
    const markets = Array.from({ length: 5 }, (_, i) =>
      fixtureMarket({ id: String(i), endDate: new Date(NOW + (i + 1) * DAY_MS).toISOString() }),
    );

    const result = selectFreezeUniverse(markets, { now: NOW, maxHorizonDays: 21 });

    expect(result).toHaveLength(5);
  });
});
