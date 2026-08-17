import { describe, expect, it } from 'vitest';

import { aggregateBlindSamples, fromLogOdds, interquartileRange, toLogOdds } from '@/ai';
import { asProbability, probabilityValue } from '@/domain';

describe('toLogOdds / fromLogOdds', () => {
  it('round-trips a mid-range probability', () => {
    const logOdds = toLogOdds(0.7);
    expect(logOdds).toBeCloseTo(0.8472978604, 9);
    expect(probabilityValue(fromLogOdds(logOdds))).toBeCloseTo(0.7, 9);
  });

  it('is antisymmetric around 0.5: logit(p) = -logit(1-p)', () => {
    expect(toLogOdds(0.3)).toBeCloseTo(-toLogOdds(0.7), 9);
  });

  it('clamps exactly 0 and 1 instead of producing +/-Infinity', () => {
    expect(Number.isFinite(toLogOdds(0))).toBe(true);
    expect(Number.isFinite(toLogOdds(1))).toBe(true);
    expect(toLogOdds(0)).toBeLessThan(0);
    expect(toLogOdds(1)).toBeGreaterThan(0);
  });
});

describe('interquartileRange', () => {
  it('is 0 for a single value (k=1 has no spread)', () => {
    expect(interquartileRange([0.847])).toBe(0);
  });

  it('is 0 for an empty set', () => {
    expect(interquartileRange([])).toBe(0);
  });

  it('matches the hand-computed Tukey-hinge IQR for an odd-length set', () => {
    // sorted: [-0.847..., -0.405..., 0, 0.405..., 0.847...]
    // lower half [-0.847, -0.405] -> median -0.626..., upper half [0.405, 0.847] -> median 0.626...
    const logOdds = [0.4054651081, -0.8472978604, 0, 0.8472978604, -0.4054651081];
    expect(interquartileRange(logOdds)).toBeCloseTo(1.2527629685, 9);
  });
});

describe('aggregateBlindSamples', () => {
  it('throws on an empty sample set', () => {
    expect(() => aggregateBlindSamples([])).toThrow();
  });

  it('k=1: blindProbability is the single sample and dispersion is 0', () => {
    const result = aggregateBlindSamples([asProbability(0.7)]);

    expect(probabilityValue(result.blindProbability)).toBeCloseTo(0.7, 9);
    expect(result.dispersion).toBe(0);
    expect(result.samples).toEqual([asProbability(0.7)]);
  });

  it('k=5, symmetric samples: median log-odds is exactly 0 (p=0.5), IQR is the hand-computed spread', () => {
    const samples = [0.3, 0.4, 0.5, 0.6, 0.7].map(asProbability);

    const result = aggregateBlindSamples(samples);

    expect(probabilityValue(result.blindProbability)).toBeCloseTo(0.5, 9);
    expect(result.dispersion).toBeCloseTo(1.2527629685, 9);
  });

  it('k=5 with one outlier: the median is unmoved by the outlier, but dispersion reflects it', () => {
    // Same rank position, more extreme value: the symmetric baseline
    // [0.30, 0.40, 0.50, 0.60, 0.70] has median log-odds 0 (p=0.5). Replacing
    // its top sample with an extreme 0.99 keeps it in the same (max) rank
    // position, so the median sample is untouched and stays exactly p=0.5 -
    // that robustness to a single outlier is why this project uses
    // median-of-log-odds instead of the mean. See AI_SYSTEM.md §3.
    const baseline = [0.3, 0.4, 0.5, 0.6, 0.7].map(asProbability);
    const withOutlier = [0.3, 0.4, 0.5, 0.6, 0.99].map(asProbability);

    const baselineResult = aggregateBlindSamples(baseline);
    const result = aggregateBlindSamples(withOutlier);

    expect(probabilityValue(result.blindProbability)).toBeCloseTo(0.5, 9);
    expect(probabilityValue(result.blindProbability)).toBeCloseTo(
      probabilityValue(baselineResult.blindProbability),
      9,
    );
    // Dispersion, unlike the median, must move: this is exactly what should
    // make gate rule 8 (HIGH_MODEL_DISPERSION) fire on a disagreeing batch.
    expect(result.dispersion).toBeCloseTo(3.1266739634, 9);
    expect(result.dispersion).toBeGreaterThan(baselineResult.dispersion);
  });

  it('boundary samples at 0.01 and 0.99 aggregate without producing Infinity or NaN', () => {
    const result = aggregateBlindSamples([asProbability(0.01), asProbability(0.99)]);

    expect(Number.isFinite(result.dispersion)).toBe(true);
    expect(Number.isFinite(probabilityValue(result.blindProbability))).toBe(true);
    expect(probabilityValue(result.blindProbability)).toBeCloseTo(0.5, 9);
    expect(result.dispersion).toBeCloseTo(9.1902397003, 9);
  });

  it('exact 0 and 1 samples do not blow up the aggregation (the clamp)', () => {
    const result = aggregateBlindSamples([asProbability(0), asProbability(1)]);

    expect(Number.isFinite(result.dispersion)).toBe(true);
    expect(Number.isFinite(probabilityValue(result.blindProbability))).toBe(true);
    expect(probabilityValue(result.blindProbability)).toBeCloseTo(0.5, 6);
  });
});
