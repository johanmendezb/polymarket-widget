import { describe, expect, it } from 'vitest';

import { computeDisagreementDistribution } from '@/app/api/_diagnostics/disagreement';
import { asPrice, asProbability } from '@/domain';

import { fixtureManifestEntry } from './fixtures';

describe('computeDisagreementDistribution', () => {
  it('computes p_blind - mid, mid read from marketPriceAtFreeze', () => {
    const base = fixtureManifestEntry();
    const entries = [
      fixtureManifestEntry({
        marketPriceAtFreeze: asPrice(0.5),
        forecast: { ...base.forecast, blindProbability: asProbability(0.62) },
      }),
    ];
    const result = computeDisagreementDistribution(entries);
    expect(result.n).toBe(1);
    expect(result.mean).toBeCloseTo(0.12);
    expect(result.bins.find((bin) => bin.label === '0.10 to 0.20')?.count).toBe(1);
  });

  it('is honestly empty for an empty manifest', () => {
    expect(computeDisagreementDistribution([])).toEqual({ n: 0, bins: expect.any(Array), mean: null });
  });
});
