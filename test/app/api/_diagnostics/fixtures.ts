import { asFeeRate, asPrice, asProbability, asUsdc, type Market } from '@/domain';
import type { ManifestEntry } from '@/app/api/_manifest/types';

const NOW = 1_700_000_000_000;

export function fixtureManifestEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
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

export function fixtureMarket(overrides: Partial<Market> = {}): Market {
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
    endDate: null,
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    fees: {
      enabled: true,
      takerRate: asFeeRate(0.04),
      makerRate: asFeeRate(0),
      displayLabel: 'Politics · 4% taker rate',
      source: 'market-object',
      estimated: false,
    },
    liquidityUsd: 1000,
    volume24hUsd: 1000,
    bestBid: asPrice(0.49),
    bestAsk: asPrice(0.51),
    spread: asPrice(0.02),
    lastTradePrice: asPrice(0.5),
    eventId: null,
    eventTitle: null,
    category: 'Politics',
    ...overrides,
  };
}
