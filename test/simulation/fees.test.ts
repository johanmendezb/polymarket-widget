import { describe, expect, it } from 'vitest';

import { asFeeRate, asPrice, asShares, usdcValue, type FeeConfig } from '@/domain';
import { computeFee } from '@/simulation';

const POLITICS_FEE: FeeConfig = {
  enabled: true,
  takerRate: asFeeRate(0.04),
  makerRate: asFeeRate(0),
  displayLabel: 'Politics · 4% taker rate',
  source: 'market-object',
  estimated: false,
};

const GEOPOLITICS_FEE_FREE: FeeConfig = {
  enabled: false,
  takerRate: asFeeRate(0),
  makerRate: asFeeRate(0),
  displayLabel: 'Geopolitics · no taker fee',
  source: 'market-object',
  estimated: false,
};

describe('computeFee: worked examples from ORDER_EXECUTION.md §2', () => {
  it('40 shares of a politics market at an average fill of 62.4 cents', () => {
    // fee = 40 * 0.04 * 0.624 * 0.376 = 0.3753984, which rounds to 0.37540 at 5dp.
    // ORDER_EXECUTION.md's prose shows an abbreviated "$0.375" in the arithmetic chain; the
    // document's own rule is 5dp rounding, so 0.3754 is the correct stored/tested value and the
    // doc has been corrected in this commit to say so.
    const fee = computeFee(asShares(40), asPrice(0.624), POLITICS_FEE);
    expect(usdcValue(fee)).toBeCloseTo(0.3754, 5);
  });

  it('100 shares of a politics market at the fee maximum, 50 cents', () => {
    // fee = 100 * 0.04 * 0.5 * 0.5 = $1.00 on a $50 stake, exactly, no rounding ambiguity.
    const fee = computeFee(asShares(100), asPrice(0.5), POLITICS_FEE);
    expect(usdcValue(fee)).toBe(1.0);
  });
});

describe('computeFee: the fee rate always comes from FeeConfig', () => {
  it('returns exactly zero when the market is fee-free (feeConfig.enabled === false)', () => {
    const fee = computeFee(asShares(100), asPrice(0.5), GEOPOLITICS_FEE_FREE);
    expect(usdcValue(fee)).toBe(0);
  });

  it('returns exactly zero when takerRate is 0 even if enabled is true', () => {
    const zeroRateButEnabled: FeeConfig = {
      ...POLITICS_FEE,
      takerRate: asFeeRate(0),
    };
    const fee = computeFee(asShares(100), asPrice(0.5), zeroRateButEnabled);
    expect(usdcValue(fee)).toBe(0);
  });

  it('two different feeConfig rates on the same shares/price produce different fees', () => {
    const politicsFee = computeFee(asShares(100), asPrice(0.5), POLITICS_FEE);
    const cryptoFee: FeeConfig = { ...POLITICS_FEE, takerRate: asFeeRate(0.07) };
    const cryptoFeeValue = computeFee(asShares(100), asPrice(0.5), cryptoFee);
    expect(usdcValue(cryptoFeeValue)).toBeGreaterThan(usdcValue(politicsFee));
  });
});

describe('invariants I5 and I6', () => {
  it('I5: fee === shares * takerRate * averagePrice * (1 - averagePrice), rounded to 5dp', () => {
    const shares = 73;
    const price = 0.317;
    const rate = 0.04;
    const expected = Math.round(shares * rate * price * (1 - price) * 100_000) / 100_000;
    const fee = computeFee(asShares(shares), asPrice(price), POLITICS_FEE);
    expect(usdcValue(fee)).toBeCloseTo(expected, 10);
  });

  it('I6: fee is maximised at averagePrice === 0.5', () => {
    const at50 = usdcValue(computeFee(asShares(100), asPrice(0.5), POLITICS_FEE));
    const at40 = usdcValue(computeFee(asShares(100), asPrice(0.4), POLITICS_FEE));
    const at60 = usdcValue(computeFee(asShares(100), asPrice(0.6), POLITICS_FEE));
    expect(at50).toBeGreaterThan(at40);
    expect(at50).toBeGreaterThan(at60);
  });

  it('I6: fee approaches zero at p = 0.01 and p = 0.99', () => {
    const at01 = usdcValue(computeFee(asShares(100), asPrice(0.01), POLITICS_FEE));
    const at99 = usdcValue(computeFee(asShares(100), asPrice(0.99), POLITICS_FEE));
    const at50 = usdcValue(computeFee(asShares(100), asPrice(0.5), POLITICS_FEE));
    expect(at01).toBeLessThan(at50 * 0.1);
    expect(at99).toBeLessThan(at50 * 0.1);
    expect(at01).toBeCloseTo(at99, 10);
  });
});

describe('rounding', () => {
  it('rounds to 5 decimal places', () => {
    // 3 shares * 0.04 * 0.333 * 0.667 = 0.02664... -> rounds to 5dp.
    const fee = computeFee(asShares(3), asPrice(0.333), POLITICS_FEE);
    const raw = 3 * 0.04 * 0.333 * (1 - 0.333);
    const expected = Math.round(raw * 100_000) / 100_000;
    expect(usdcValue(fee)).toBe(expected);
  });

  it('floors a genuinely nonzero fee that rounds to 0 at 5dp to the 0.00001 minimum', () => {
    const tinyRate: FeeConfig = { ...POLITICS_FEE, takerRate: asFeeRate(0.000001) };
    const fee = computeFee(asShares(1), asPrice(0.5), tinyRate);
    expect(usdcValue(fee)).toBe(0.00001);
  });

  it('a fee that computes to exactly zero (zero shares) stays exactly zero, not floored', () => {
    const fee = computeFee(asShares(0), asPrice(0.5), POLITICS_FEE);
    expect(usdcValue(fee)).toBe(0);
  });
});
