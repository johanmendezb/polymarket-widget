import { describe, expect, it } from 'vitest';

import { computeBlindVsAnchoredDelta } from '@/app/api/_diagnostics/delta';
import { asProbability } from '@/domain';

import { fixtureManifestEntry } from './fixtures';

describe('computeBlindVsAnchoredDelta', () => {
  it('excludes entries with no anchored diagnostic and reports n honestly', () => {
    const base = fixtureManifestEntry();
    const entries = [
      fixtureManifestEntry({ forecast: { ...base.forecast, anchoredProbability: null } }),
      fixtureManifestEntry({ forecast: { ...base.forecast, anchoredProbability: null } }),
    ];
    const result = computeBlindVsAnchoredDelta(entries);
    expect(result).toEqual({ n: 0, bins: expect.any(Array), mean: null });
  });

  it('computes |anchored - blind| only over entries that ran the anchored diagnostic', () => {
    const base = fixtureManifestEntry();
    const entries = [
      fixtureManifestEntry({
        forecast: { ...base.forecast, blindProbability: asProbability(0.6), anchoredProbability: asProbability(0.61) },
      }),
      fixtureManifestEntry({ forecast: { ...base.forecast, anchoredProbability: null } }),
    ];
    const result = computeBlindVsAnchoredDelta(entries);
    expect(result.n).toBe(1);
    expect(result.mean).toBeCloseTo(0.01);
  });
});
