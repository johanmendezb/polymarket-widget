/**
 * T8.3 acceptance. No network: `resolutionSource` is a fake and manifest
 * text is built in memory — persistence.test.ts covers the real-fs half
 * (the "provably never mutates" proof).
 */
import { describe, expect, it } from 'vitest';

import { sha256Hex } from '@/app/api/_manifest/hash';
import { inferResolvedOutcome, runResolve, type ResolutionSource } from '@/app/api/_manifest/resolve';
import { serializeJsonl } from '@/app/api/_manifest/serialize';
import type { ManifestEntry, OutcomeEntry } from '@/app/api/_manifest/types';
import { asFeeRate, asPrice, asProbability, asUsdc, type FeeConfig, type Market } from '@/domain';

const NOW = 1_700_000_000_000;

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
    endDate: new Date(NOW).toISOString(),
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

function fixtureManifestEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    marketId: '1',
    question: 'Will X happen?',
    tokenId: '111',
    outcomeLabel: 'Yes',
    marketPriceAtFreeze: asPrice(0.5),
    forecast: {
      tokenId: '111',
      outcomeLabel: 'Yes',
      blindProbability: asProbability(0.6),
      dispersion: 0.02,
      samples: [asProbability(0.6)],
      anchoredProbability: null,
      blendedProbability: asProbability(0.55),
      blendWeight: 0.35,
      marketProbability: asProbability(0.5),
      confidence: 'high',
      evidence: [],
      risks: [],
      modelId: 'claude-opus-5',
      promptVersion: 'blind-v1',
      createdAt: new Date(NOW).toISOString(),
    },
    k: 5,
    gateVerdict: 'CONSIDER',
    gateReasons: [],
    frozenAt: new Date(NOW).toISOString(),
    ...overrides,
  };
}

function fakeResolutionSource(marketsById: Readonly<Record<string, Market>>): ResolutionSource {
  return {
    fetchMarketStatus: (marketId: string) => {
      const market = marketsById[marketId];
      if (!market) throw new Error(`no fixture market for ${marketId}`);
      return Promise.resolve(market);
    },
  };
}

describe('inferResolvedOutcome', () => {
  it('reports unresolved for an open market', () => {
    const status = inferResolvedOutcome(fixtureMarket({ closed: false }), '111');
    expect(status.resolved).toBe(false);
  });

  it('reports YES when the settled price for this token is at/above the win threshold', () => {
    const market = fixtureMarket({
      closed: true,
      outcomes: [
        { label: 'Yes', tokenId: '111', indicativePrice: asPrice(1) },
        { label: 'No', tokenId: '222', indicativePrice: asPrice(0) },
      ],
    });
    const status = inferResolvedOutcome(market, '111');
    expect(status).toEqual({ resolved: true, outcome: 'YES' });
  });

  it('reports NO when the settled price for this token is at/below the loss threshold', () => {
    const market = fixtureMarket({
      closed: true,
      outcomes: [
        { label: 'Yes', tokenId: '111', indicativePrice: asPrice(0) },
        { label: 'No', tokenId: '222', indicativePrice: asPrice(1) },
      ],
    });
    const status = inferResolvedOutcome(market, '111');
    expect(status).toEqual({ resolved: true, outcome: 'NO' });
  });

  it('reports ANNULLED when a closed market settles ambiguously (e.g. 50/50)', () => {
    const market = fixtureMarket({
      closed: true,
      outcomes: [
        { label: 'Yes', tokenId: '111', indicativePrice: asPrice(0.5) },
        { label: 'No', tokenId: '222', indicativePrice: asPrice(0.5) },
      ],
    });
    const status = inferResolvedOutcome(market, '111');
    expect(status).toEqual({ resolved: true, outcome: 'ANNULLED' });
  });

  it('reports unresolved when the token is not among the market outcomes', () => {
    const status = inferResolvedOutcome(fixtureMarket({ closed: true }), '999');
    expect(status.resolved).toBe(false);
  });
});

describe('runResolve', () => {
  it('refuses loudly on a hash mismatch, before reading a single entry', async () => {
    const manifestText = serializeJsonl([fixtureManifestEntry()]);
    const resolutionSource = fakeResolutionSource({});

    const result = await runResolve({
      manifestText,
      hashFileText: 'not-the-real-hash',
      existingOutcomesText: '',
      resolutionSource,
      now: NOW,
    });

    expect(result.kind).toBe('hash_mismatch');
  });

  it('proceeds when the hash matches, appending an outcome for a resolved market', async () => {
    const manifestText = serializeJsonl([fixtureManifestEntry()]);
    const hashFileText = sha256Hex(manifestText);
    const resolutionSource = fakeResolutionSource({
      '1': fixtureMarket({
        closed: true,
        outcomes: [
          { label: 'Yes', tokenId: '111', indicativePrice: asPrice(1) },
          { label: 'No', tokenId: '222', indicativePrice: asPrice(0) },
        ],
      }),
    });

    const result = await runResolve({ manifestText, hashFileText, existingOutcomesText: '', resolutionSource, now: NOW });

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error('unreachable');
    expect(result.report).toEqual({ frozenCount: 1, alreadyResolvedCount: 0, newlyResolvedCount: 1, stillOpenCount: 0 });
    const [outcome] = JSON.parse(`[${result.newOutcomesJsonl.trim()}]`) as OutcomeEntry[];
    expect(outcome).toEqual({ marketId: '1', tokenId: '111', outcome: 'YES', resolvedAt: new Date(NOW).toISOString() });
  });

  it('counts a still-open market without appending anything for it', async () => {
    const manifestText = serializeJsonl([fixtureManifestEntry()]);
    const hashFileText = sha256Hex(manifestText);
    const resolutionSource = fakeResolutionSource({ '1': fixtureMarket({ closed: false }) });

    const result = await runResolve({ manifestText, hashFileText, existingOutcomesText: '', resolutionSource, now: NOW });

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error('unreachable');
    expect(result.report).toEqual({ frozenCount: 1, alreadyResolvedCount: 0, newlyResolvedCount: 0, stillOpenCount: 1 });
    expect(result.newOutcomesJsonl).toBe('');
  });

  it('is idempotent: a market already recorded in OUTCOMES.jsonl is never re-fetched or re-appended', async () => {
    const manifestText = serializeJsonl([fixtureManifestEntry()]);
    const hashFileText = sha256Hex(manifestText);
    const existingOutcomesText = serializeJsonl<OutcomeEntry>([
      { marketId: '1', tokenId: '111', outcome: 'YES', resolvedAt: new Date(NOW - 1000).toISOString() },
    ]);

    let fetchCount = 0;
    const resolutionSource: ResolutionSource = {
      fetchMarketStatus: () => {
        fetchCount += 1;
        return Promise.resolve(fixtureMarket({ closed: true }));
      },
    };

    const result = await runResolve({ manifestText, hashFileText, existingOutcomesText, resolutionSource, now: NOW });

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error('unreachable');
    expect(fetchCount).toBe(0);
    expect(result.report).toEqual({ frozenCount: 1, alreadyResolvedCount: 1, newlyResolvedCount: 0, stillOpenCount: 0 });
    expect(result.newOutcomesJsonl).toBe('');
  });

  it('reports an empty manifest as empty, honestly', async () => {
    const manifestText = '';
    const hashFileText = sha256Hex(manifestText);

    const result = await runResolve({
      manifestText,
      hashFileText,
      existingOutcomesText: '',
      resolutionSource: fakeResolutionSource({}),
      now: NOW,
    });

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error('unreachable');
    expect(result.report).toEqual({ frozenCount: 0, alreadyResolvedCount: 0, newlyResolvedCount: 0, stillOpenCount: 0 });
  });
});
