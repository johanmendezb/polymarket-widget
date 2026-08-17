import { describe, expect, it } from 'vitest';

import { computeComplementaryCoherence, computeMultiOutcomeCoherence } from '@/app/api/_diagnostics/coherence';
import { asProbability } from '@/domain';

import { fixtureManifestEntry } from './fixtures';

describe('computeComplementaryCoherence', () => {
  it('reports n: 0 honestly when every market has only one frozen outcome (today\'s pnpm freeze)', () => {
    const entries = [fixtureManifestEntry({ marketId: '1' }), fixtureManifestEntry({ marketId: '2' })];
    const result = computeComplementaryCoherence(entries);
    expect(result).toEqual({ n: 0, groups: [], meanAbsDelta: null });
  });

  it('pairs two outcomes of the same market and computes |sum - 1|', () => {
    const entries = [
      fixtureManifestEntry({
        marketId: '1',
        tokenId: '111',
        outcomeLabel: 'Yes',
        forecast: { ...fixtureManifestEntry().forecast, blindProbability: asProbability(0.62) },
      }),
      fixtureManifestEntry({
        marketId: '1',
        tokenId: '222',
        outcomeLabel: 'No',
        forecast: { ...fixtureManifestEntry().forecast, blindProbability: asProbability(0.4) },
      }),
    ];
    const result = computeComplementaryCoherence(entries);
    expect(result.n).toBe(1);
    expect(result.groups[0]?.absDelta).toBeCloseTo(0.02); // |0.62 + 0.40 - 1|
    expect(result.meanAbsDelta).toBeCloseTo(0.02);
  });

  it('does not treat a three-way group as complementary', () => {
    const entries = [
      fixtureManifestEntry({ marketId: '1', tokenId: '1' }),
      fixtureManifestEntry({ marketId: '1', tokenId: '2' }),
      fixtureManifestEntry({ marketId: '1', tokenId: '3' }),
    ];
    expect(computeComplementaryCoherence(entries).n).toBe(0);
  });
});

describe('computeMultiOutcomeCoherence', () => {
  it('groups three or more outcomes of the same market and computes |sum - 1|', () => {
    const base = fixtureManifestEntry();
    const entries = [
      fixtureManifestEntry({ marketId: 'E', tokenId: '1', forecast: { ...base.forecast, blindProbability: asProbability(0.3) } }),
      fixtureManifestEntry({ marketId: 'E', tokenId: '2', forecast: { ...base.forecast, blindProbability: asProbability(0.3) } }),
      fixtureManifestEntry({ marketId: 'E', tokenId: '3', forecast: { ...base.forecast, blindProbability: asProbability(0.5) } }),
    ];
    const result = computeMultiOutcomeCoherence(entries);
    expect(result.n).toBe(1);
    expect(result.groups[0]?.outcomeCount).toBe(3);
    expect(result.groups[0]?.absDelta).toBeCloseTo(0.1); // |0.3+0.3+0.5 - 1|
  });

  it('ignores a two-outcome group (that is complementary, not multi-outcome)', () => {
    const entries = [fixtureManifestEntry({ marketId: '1', tokenId: '1' }), fixtureManifestEntry({ marketId: '1', tokenId: '2' })];
    expect(computeMultiOutcomeCoherence(entries).n).toBe(0);
  });
});
