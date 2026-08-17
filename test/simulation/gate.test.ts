import { describe, expect, it } from 'vitest';

import { asPrice } from '@/domain';
import { evaluateGate, type GateInput } from '@/simulation';

const NOW = 1_700_000_000_000; // fixed instant, so horizon math is deterministic
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A market that trips none of the 11 rules. Every isolation test below changes exactly the
 * field(s) that rule needs and nothing else, so a passing isolation test proves that rule - and
 * only that rule - fired.
 */
function healthyBaseline(): GateInput {
  return {
    acceptingOrders: true,
    category: 'Politics',
    marketMidpoint: asPrice(0.5),
    bestBid: asPrice(0.49),
    bestAsk: asPrice(0.51),
    estimatedEdge: 0.05,
    fill: { averagePrice: asPrice(0.5), partial: false },
    endDate: new Date(NOW + 5 * DAY_MS).toISOString(),
    now: NOW,
    evidenceCount: 8,
    dispersion: 0.05,
    resolutionAmbiguity: 'low',
  };
}

describe('evaluateGate: a market that trips nothing', () => {
  it('returns CONSIDER with an empty reasons array', () => {
    const result = evaluateGate(healthyBaseline());
    expect(result.verdict).toBe('CONSIDER');
    expect(result.reasons).toEqual([]);
  });
});

describe('evaluateGate: each rule fires in isolation', () => {
  it('rule 1 EDGE_BELOW_COST: edge <= 0 (spread pinned to 0 so rule 2 stays silent)', () => {
    const result = evaluateGate({
      ...healthyBaseline(),
      estimatedEdge: 0,
      bestBid: asPrice(0.5),
      bestAsk: asPrice(0.5),
    });
    expect(result.reasons).toEqual(['EDGE_BELOW_COST']);
    expect(result.verdict).toBe('NO_BET');
  });

  it('rule 2 SPREAD_TOO_WIDE: spread exceeds the claimed edge, while edge itself stays positive', () => {
    const result = evaluateGate({
      ...healthyBaseline(),
      estimatedEdge: 0.05,
      bestBid: asPrice(0.4),
      bestAsk: asPrice(0.6),
    });
    expect(result.reasons).toEqual(['SPREAD_TOO_WIDE']);
  });

  it('rule 3 INSUFFICIENT_DEPTH: the book cannot fill the requested size', () => {
    const result = evaluateGate({
      ...healthyBaseline(),
      fill: { averagePrice: asPrice(0.5), partial: true },
    });
    expect(result.reasons).toEqual(['INSUFFICIENT_DEPTH']);
  });

  it('rule 4 EXTREME_PRICE_BAND: the fill price is below 0.10', () => {
    const result = evaluateGate({
      ...healthyBaseline(),
      fill: { averagePrice: asPrice(0.05), partial: false },
    });
    expect(result.reasons).toEqual(['EXTREME_PRICE_BAND']);
  });

  it('rule 4 EXTREME_PRICE_BAND: the fill price is above 0.90', () => {
    const result = evaluateGate({
      ...healthyBaseline(),
      fill: { averagePrice: asPrice(0.95), partial: false },
    });
    expect(result.reasons).toEqual(['EXTREME_PRICE_BAND']);
  });

  it('rule 5 HORIZON_TOO_LONG: resolution is more than ~1 month out', () => {
    const result = evaluateGate({
      ...healthyBaseline(),
      endDate: new Date(NOW + 60 * DAY_MS).toISOString(),
    });
    expect(result.reasons).toEqual(['HORIZON_TOO_LONG']);
  });

  it('rule 5 does not fire when endDate is null (horizon unknown, not assumed long)', () => {
    const result = evaluateGate({ ...healthyBaseline(), endDate: null });
    expect(result.reasons).toEqual([]);
  });

  it('rule 6 MARKET_TOO_CERTAIN: market midpoint outside [0.30, 0.70]', () => {
    const result = evaluateGate({ ...healthyBaseline(), marketMidpoint: asPrice(0.75) });
    expect(result.reasons).toEqual(['MARKET_TOO_CERTAIN']);
  });

  it('rule 7 THIN_EVIDENCE: fewer than 5 relevant dated sources', () => {
    const result = evaluateGate({ ...healthyBaseline(), evidenceCount: 2 });
    expect(result.reasons).toEqual(['THIN_EVIDENCE']);
  });

  it('rule 8 HIGH_MODEL_DISPERSION: sample IQR exceeds the threshold', () => {
    const result = evaluateGate({ ...healthyBaseline(), dispersion: 0.3 });
    expect(result.reasons).toEqual(['HIGH_MODEL_DISPERSION']);
  });

  it('rule 9 AMBIGUOUS_RESOLUTION: resolution ambiguity is high', () => {
    const result = evaluateGate({ ...healthyBaseline(), resolutionAmbiguity: 'high' });
    expect(result.reasons).toEqual(['AMBIGUOUS_RESOLUTION']);
  });

  it('rule 9 AMBIGUOUS_RESOLUTION: resolution ambiguity is medium', () => {
    const result = evaluateGate({ ...healthyBaseline(), resolutionAmbiguity: 'medium' });
    expect(result.reasons).toEqual(['AMBIGUOUS_RESOLUTION']);
  });

  it('rule 10 NEAR_EXPIRY_SPORTS: a sports market inside its final minutes', () => {
    const result = evaluateGate({
      ...healthyBaseline(),
      category: 'Sports',
      endDate: new Date(NOW + 5 * 60 * 1000).toISOString(),
    });
    expect(result.reasons).toEqual(['NEAR_EXPIRY_SPORTS']);
  });

  it('rule 10 does not fire for a non-sports market in its final minutes', () => {
    const result = evaluateGate({
      ...healthyBaseline(),
      category: 'Politics',
      endDate: new Date(NOW + 5 * 60 * 1000).toISOString(),
    });
    expect(result.reasons).toEqual([]);
  });

  it('rule 11 MARKET_NOT_ACCEPTING_ORDERS: acceptingOrders is false', () => {
    const result = evaluateGate({ ...healthyBaseline(), acceptingOrders: false });
    expect(result.reasons).toEqual(['MARKET_NOT_ACCEPTING_ORDERS']);
  });
});

describe('evaluateGate: a market that trips three rules returns all three', () => {
  it('names every reason that fires, not just the first', () => {
    const result = evaluateGate({
      ...healthyBaseline(),
      evidenceCount: 1,
      resolutionAmbiguity: 'high',
      acceptingOrders: false,
    });
    expect(result.verdict).toBe('NO_BET');
    expect(result.reasons).toHaveLength(3);
    expect(new Set(result.reasons)).toEqual(
      new Set(['THIN_EVIDENCE', 'AMBIGUOUS_RESOLUTION', 'MARKET_NOT_ACCEPTING_ORDERS']),
    );
  });
});
