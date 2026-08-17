import { describe, expect, it } from 'vitest';

import { asPrice, asProbability, asUsdc, usdcValue } from '@/domain';
import { KELLY_HARD_CAP_FRACTION, kellyFraction, suggestedSize } from '@/simulation';

describe('kellyFraction: the worked illustration from ORDER_EXECUTION.md §4', () => {
  const p = asProbability(0.95);
  const q = asPrice(0.9);

  it('full Kelly is 0.5', () => {
    // f* = (p - q) / (1 - q) = (0.95 - 0.90) / (1 - 0.90) = 0.05 / 0.10 = 0.5
    expect(kellyFraction(p, q, 'full')).toBeCloseTo(0.5, 10);
  });

  it('quarter Kelly (the default) is 0.125', () => {
    expect(kellyFraction(p, q, 'quarter')).toBeCloseTo(0.125, 10);
    expect(kellyFraction(p, q)).toBeCloseTo(0.125, 10);
  });

  it('half Kelly is 0.25', () => {
    expect(kellyFraction(p, q, 'half')).toBeCloseTo(0.25, 10);
  });
});

describe('suggestedSize: the hard 2% cap applies regardless of mode', () => {
  const p = asProbability(0.95);
  const q = asPrice(0.9);
  const bankroll = asUsdc(1000);

  it('full Kelly (0.5) is capped to 2% of bankroll', () => {
    const size = suggestedSize(p, q, bankroll, 'full');
    expect(size).not.toBeNull();
    expect(usdcValue(size!)).toBeCloseTo(1000 * KELLY_HARD_CAP_FRACTION, 10);
    expect(usdcValue(size!)).toBeCloseTo(20, 10);
  });

  it('quarter Kelly (0.125) is also capped to 2% of bankroll', () => {
    const size = suggestedSize(p, q, bankroll, 'quarter');
    expect(usdcValue(size!)).toBeCloseTo(20, 10);
  });

  it('a fraction already under the cap is not capped further', () => {
    // p=0.51, q=0.50: f* = (0.51-0.50)/(1-0.50) = 0.02. Quarter Kelly = 0.005, well under 2%.
    const smallEdge = suggestedSize(asProbability(0.51), asPrice(0.5), bankroll, 'quarter');
    expect(usdcValue(smallEdge!)).toBeCloseTo(1000 * 0.005, 10);
  });
});

describe('kellyFraction: returns null when f* <= 0', () => {
  it('when the estimated probability equals the price (zero edge)', () => {
    expect(kellyFraction(asProbability(0.5), asPrice(0.5), 'full')).toBeNull();
  });

  it('when the estimated probability is below the price (negative edge)', () => {
    expect(kellyFraction(asProbability(0.4), asPrice(0.5), 'full')).toBeNull();
  });

  it('suggestedSize also returns null in that case, suppressing sizing entirely', () => {
    const size = suggestedSize(asProbability(0.4), asPrice(0.5), asUsdc(1000), 'quarter');
    expect(size).toBeNull();
  });
});

describe('kellyFraction: a price of exactly 1.00 has no meaningful edge and never throws', () => {
  it('returns null rather than dividing by zero', () => {
    expect(() => kellyFraction(asProbability(0.99), asPrice(1), 'full')).not.toThrow();
    expect(kellyFraction(asProbability(0.99), asPrice(1), 'full')).toBeNull();
  });
});
