import {
  asPrice,
  asProbability,
  asShares,
  asUsdc,
  type FillEstimate,
  type Recommendation,
} from '@/domain';

/**
 * A hand-built, domain-valid `Recommendation`. Lets the widget shell be
 * built and demonstrated against a typed value without depending on E3 (the
 * read path) or E5 (the AI layer) existing yet — see T4.1's contract.
 */

const TOKEN_ID = '71234567890123456789012345678901234567890123456789012345678901234567890123';

const fill: FillEstimate = {
  requested: { kind: 'usdc', value: asUsdc(25) },
  legs: [{ price: asPrice(0.62), shares: asShares(40) }],
  sharesFilled: asShares(40),
  averagePrice: asPrice(0.62),
  topOfBookPrice: asPrice(0.62),
  priceImpact: asPrice(0),
  grossCost: asUsdc(24.8),
  fee: asUsdc(0.37696),
  totalCost: asUsdc(25.17696),
  payoutIfWin: asUsdc(40),
  netProfitIfWin: asUsdc(14.82304),
  partial: false,
  maxFillableShares: asShares(40),
  bookFetchedAt: 1755300000000,
};

export const sampleRecommendation: Recommendation = {
  verdict: 'CONSIDER',
  reasons: [],
  estimatedEdge: 0.023,
  suggestedFractionOfBankroll: 0.02,
  forecast: {
    tokenId: TOKEN_ID,
    outcomeLabel: 'Yes',
    blindProbability: asProbability(0.58),
    dispersion: 0.06,
    samples: [0.55, 0.57, 0.58, 0.6, 0.62].map(asProbability),
    anchoredProbability: asProbability(0.61),
    blendedProbability: asProbability(0.596),
    blendWeight: 0.35,
    marketProbability: asProbability(0.62),
    confidence: 'medium',
    evidence: [
      {
        claim: 'Polling averages have held steady within two points for three weeks.',
        sourceUrl: 'https://example.org/polling-tracker',
        sourceTitle: 'Example Polling Tracker',
        publishedAt: '2026-08-10T00:00:00.000Z',
        supports: 'yes',
      },
      {
        claim: 'A procedural filing could delay the outcome past this market’s close date.',
        sourceUrl: 'https://example.org/filing-notice',
        sourceTitle: 'Example Filing Notice',
        publishedAt: null,
        supports: 'context',
      },
    ],
    risks: ['Resolution depends on an official announcement that may be delayed.'],
    modelId: 'claude-opus-5',
    promptVersion: 'blind-v1',
    createdAt: '2026-08-16T12:00:00.000Z',
  },
  fill,
};
