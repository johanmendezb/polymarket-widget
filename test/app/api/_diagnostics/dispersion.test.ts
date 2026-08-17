import { describe, expect, it } from 'vitest';

import { computeSampleDispersion } from '@/app/api/_diagnostics/dispersion';

import { fixtureManifestEntry } from './fixtures';

describe('computeSampleDispersion', () => {
  it('bins forecast.dispersion across the manifest and the high-dispersion threshold is a bin edge', () => {
    const entries = [
      fixtureManifestEntry({ forecast: { ...fixtureManifestEntry().forecast, dispersion: 0.02 } }),
      fixtureManifestEntry({ forecast: { ...fixtureManifestEntry().forecast, dispersion: 0.2 } }),
    ];
    const result = computeSampleDispersion(entries);
    expect(result.n).toBe(2);
    expect(result.bins.find((bin) => bin.label === '0.00-0.05')?.count).toBe(1);
    expect(result.bins.find((bin) => bin.label === '0.30+')?.count).toBe(0);
    expect(result.mean).toBeCloseTo(0.11);
  });

  it('is honestly empty for an empty manifest', () => {
    expect(computeSampleDispersion([])).toEqual({ n: 0, bins: expect.any(Array), mean: null });
  });
});
