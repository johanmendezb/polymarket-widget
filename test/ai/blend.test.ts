import { describe, expect, it } from 'vitest';

import { BLEND_WEIGHT, blendWithMarket } from '@/ai/blend';
import { asProbability, probabilityValue } from '@/domain';

/** Independent re-derivation of the formula, not a call to the function under test. */
function handComputedBlend(blind: number, market: number, weight: number): number {
  const logit = (p: number) => Math.log(p / (1 - p));
  const blended = (1 - weight) * logit(market) + weight * logit(blind);
  return 1 / (1 + Math.exp(-blended));
}

describe('BLEND_WEIGHT', () => {
  it('is the pre-registered 0.35', () => {
    expect(BLEND_WEIGHT).toBe(0.35);
  });
});

describe('blendWithMarket', () => {
  it('at w=0, is exactly the market probability, independent of the blind estimate', () => {
    const blind = asProbability(0.95);
    const market = asProbability(0.4);
    const result = blendWithMarket(blind, market, 0);
    expect(probabilityValue(result)).toBeCloseTo(0.4, 9);
  });

  it('at w=1, is exactly the blind probability, independent of the market', () => {
    const blind = asProbability(0.72);
    const market = asProbability(0.2);
    const result = blendWithMarket(blind, market, 1);
    expect(probabilityValue(result)).toBeCloseTo(0.72, 9);
  });

  it('matches a hand-computed value at the pre-registered weight (blind=0.70, market=0.60)', () => {
    const blind = asProbability(0.7);
    const market = asProbability(0.6);
    const expected = handComputedBlend(0.7, 0.6, BLEND_WEIGHT);

    const result = blendWithMarket(blind, market);

    // Independently: logit(0.6) = 0.4054651, logit(0.7) = 0.8472979.
    // 0.65*0.4054651 + 0.35*0.8472979 = 0.2635523 + 0.2965543 = 0.5601066
    // sigmoid(0.5601066) = 0.6364772
    expect(expected).toBeCloseTo(0.636477, 6);
    expect(probabilityValue(result)).toBeCloseTo(expected, 9);
  });

  it('when blind agrees exactly with the market, the blend reproduces the market price', () => {
    const p = asProbability(0.63);
    const result = blendWithMarket(p, p);
    expect(probabilityValue(result)).toBeCloseTo(0.63, 6);
  });

  it('is monotonic in the blind estimate holding the market fixed', () => {
    const market = asProbability(0.5);
    const low = probabilityValue(blendWithMarket(asProbability(0.3), market));
    const high = probabilityValue(blendWithMarket(asProbability(0.8), market));
    expect(high).toBeGreaterThan(low);
  });

  it('handles boundary probabilities (0.01 and 0.99) without producing NaN or Infinity', () => {
    const result = blendWithMarket(asProbability(0.99), asProbability(0.01));
    expect(Number.isFinite(probabilityValue(result))).toBe(true);
    expect(probabilityValue(result)).toBeGreaterThan(0);
    expect(probabilityValue(result)).toBeLessThan(1);
  });
});
