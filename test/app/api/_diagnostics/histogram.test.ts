import { describe, expect, it } from 'vitest';

import { bucketize } from '@/app/api/_diagnostics/histogram';

describe('bucketize', () => {
  it('returns zero-count bins and a null mean for an empty input', () => {
    const result = bucketize([], [0, 1], ['0-1']);
    expect(result).toEqual({ n: 0, bins: [{ label: '0-1', count: 0 }], mean: null });
  });

  it('sorts values into the correct bin, interior edges belonging to the higher bin', () => {
    const result = bucketize([0, 0.4, 0.5, 0.99], [0, 0.5, 1], ['low', 'high']);
    expect(result.bins).toEqual([
      { label: 'low', count: 2 }, // 0, 0.4
      { label: 'high', count: 2 }, // 0.5, 0.99
    ]);
    expect(result.n).toBe(4);
  });

  it('computes the mean of the raw values, not the bin midpoints', () => {
    const result = bucketize([1, 2, 3], [0, 10], ['all']);
    expect(result.mean).toBeCloseTo(2);
  });

  it('places out-of-range values in the last bin when edges are open-ended with Infinity', () => {
    const result = bucketize([-5, 5], [-Infinity, 0, Infinity], ['neg', 'pos']);
    expect(result.bins).toEqual([
      { label: 'neg', count: 1 },
      { label: 'pos', count: 1 },
    ]);
  });

  it('throws when edges and labels are mismatched', () => {
    expect(() => bucketize([1], [0, 1, 2], ['only-one'])).toThrow();
  });
});
