import { describe, expect, it } from 'vitest';

import { computeLiveCostWaterfall, pickWaterfallEntry, type WaterfallDeps } from '@/app/api/_diagnostics/waterfall';
import { asPrice, asShares, asUsdc, type OrderBook } from '@/domain';

import { fixtureManifestEntry, fixtureMarket } from './fixtures';

const NOW = 1_700_000_000_000;

function fixtureBook(): OrderBook {
  return {
    tokenId: '111',
    asks: [
      { price: asPrice(0.5), size: asShares(100) },
      { price: asPrice(0.55), size: asShares(100) },
    ],
    bids: [{ price: asPrice(0.48), size: asShares(100) }],
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    negRisk: false,
    lastTradePrice: null,
    fetchedAt: NOW,
    upstreamTimestamp: new Date(NOW).toISOString(),
  };
}

describe('pickWaterfallEntry', () => {
  it('returns null for an empty manifest', () => {
    expect(pickWaterfallEntry([])).toBeNull();
  });

  it('prefers a CONSIDER entry over a NO_BET one', () => {
    const noBet = fixtureManifestEntry({ marketId: '1', gateVerdict: 'NO_BET', gateReasons: ['EDGE_BELOW_COST'] });
    const consider = fixtureManifestEntry({ marketId: '2', gateVerdict: 'CONSIDER', gateReasons: [] });
    expect(pickWaterfallEntry([noBet, consider])?.marketId).toBe('2');
  });

  it('falls back to the first entry when nothing passed the gate', () => {
    const noBet = fixtureManifestEntry({ marketId: '1', gateVerdict: 'NO_BET', gateReasons: ['EDGE_BELOW_COST'] });
    expect(pickWaterfallEntry([noBet])?.marketId).toBe('1');
  });
});

describe('computeLiveCostWaterfall', () => {
  it('walks a live book and fee config into a waterfall, and computes the edge from blendedProbability', async () => {
    const entry = fixtureManifestEntry();
    const deps: WaterfallDeps = {
      fetchMarket: async () => ({ data: fixtureMarket() }),
      fetchBook: async () => ({ data: fixtureBook() }),
      now: NOW,
    };

    const result = await computeLiveCostWaterfall(entry, deps);

    expect(result.available).toBe(true);
    if (!result.available) throw new Error('expected available: true');
    expect(result.waterfall.bestAsk).toEqual(asPrice(0.5));
    expect(result.fetchedAt).toBe(new Date(NOW).toISOString());
    expect(typeof result.estimatedEdge).toBe('number');
  });

  it('returns an honest unavailable state on an upstream failure, never a fabricated waterfall', async () => {
    const entry = fixtureManifestEntry();
    const deps: WaterfallDeps = {
      fetchMarket: async () => {
        throw new Error('upstream unavailable');
      },
      fetchBook: async () => ({ data: fixtureBook() }),
      now: NOW,
    };

    const result = await computeLiveCostWaterfall(entry, deps);
    expect(result).toEqual({ available: false, reason: 'upstream unavailable' });
  });
});
