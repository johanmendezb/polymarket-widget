import { describe, expect, it } from 'vitest';

import {
  asFeeRate,
  asPrice,
  asProbability,
  asShares,
  asUsdc,
  feeRateValue,
  priceValue,
  probabilityToPrice,
  probabilityValue,
  priceToProbability,
  sharesValue,
  tryAsPrice,
  tryAsProbability,
  tryAsShares,
  tryAsUsdc,
  usdcValue,
  type Price,
  type Probability,
  type Shares,
  type Usdc,
} from '@/domain';

describe('branded constructors', () => {
  it('accepts in-range values and round-trips them exactly', () => {
    expect(probabilityValue(asProbability(0.37))).toBe(0.37);
    expect(priceValue(asPrice(0.045))).toBe(0.045);
    expect(sharesValue(asShares(1234.5))).toBe(1234.5);
    expect(usdcValue(asUsdc(-3.25))).toBe(-3.25);
    expect(feeRateValue(asFeeRate(0.07))).toBe(0.07);
  });

  it('accepts both closed boundaries of [0,1]', () => {
    expect(probabilityValue(asProbability(0))).toBe(0);
    expect(probabilityValue(asProbability(1))).toBe(1);
    expect(priceValue(asPrice(0))).toBe(0);
    expect(priceValue(asPrice(1))).toBe(1);
  });

  it.each([
    ['asProbability', asProbability],
    ['asPrice', asPrice],
    ['asFeeRate', asFeeRate],
  ])('%s rejects a value outside [0,1]', (_name, construct) => {
    expect(() => construct(-0.0001)).toThrow(RangeError);
    expect(() => construct(1.0001)).toThrow(RangeError);
    expect(() => construct(45)).toThrow(RangeError);
  });

  it('asShares rejects a negative count', () => {
    expect(() => asShares(-1)).toThrow(RangeError);
    expect(sharesValue(asShares(0))).toBe(0);
  });

  it('asUsdc allows a negative amount, because a loss is a real amount', () => {
    expect(usdcValue(asUsdc(-12.5))).toBe(-12.5);
  });

  it.each([
    ['asProbability', asProbability],
    ['asPrice', asPrice],
    ['asShares', asShares],
    ['asUsdc', asUsdc],
    ['asFeeRate', asFeeRate],
  ])('%s rejects NaN and the infinities', (_name, construct) => {
    expect(() => construct(Number.NaN)).toThrow(RangeError);
    expect(() => construct(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => construct(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });

  it('the try* variants answer null instead of throwing', () => {
    expect(tryAsProbability(1.5)).toBeNull();
    expect(tryAsPrice(-1)).toBeNull();
    expect(tryAsShares(-1)).toBeNull();
    expect(tryAsUsdc(Number.NaN)).toBeNull();
    expect(probabilityValue(tryAsProbability(0.5)!)).toBe(0.5);
  });
});

describe('the brands themselves', () => {
  it('rejects a bare number where a brand is required', () => {
    // @ts-expect-error a raw number must be unreachable without a constructor
    const notAPrice: Price = 0.42;
    expect(notAPrice).toBe(0.42);

    // @ts-expect-error a raw number must be unreachable without a constructor
    const notShares: Shares = 10;
    expect(notShares).toBe(10);
  });

  it('keeps two different brands mutually unassignable', () => {
    const probability = asProbability(0.5);
    const price = asPrice(0.5);

    // @ts-expect-error Probability and Price are numerically equal and semantically not
    const priceFromProbability: Price = probability;
    // @ts-expect-error Price and Probability are numerically equal and semantically not
    const probabilityFromPrice: Probability = price;

    expect(priceFromProbability).toBe(0.5);
    expect(probabilityFromPrice).toBe(0.5);
  });

  it('keeps Shares and Usdc mutually unassignable', () => {
    const shares = asShares(100);

    // @ts-expect-error a share count is not a dollar amount
    const dollars: Usdc = shares;
    expect(dollars).toBe(100);
  });

  it('refuses bare arithmetic between brands', () => {
    const probability = asProbability(0.5);
    const price = asPrice(0.4);

    // @ts-expect-error multiplying a probability by a price is the bug the brands exist to stop
    const nonsense = probability * price;
    expect(nonsense).toBeCloseTo(0.2);

    // the sanctioned form is explicit on both sides
    expect(probabilityValue(probability) * priceValue(price)).toBeCloseTo(0.2);
  });

  it('orders two values of the same brand, and refuses to order two different ones', () => {
    const cheap = asPrice(0.4);
    const dear = asPrice(0.6);

    // Same brand: TypeScript permits the relational operators, and the runtime
    // representation is a plain number, so the answer is right.
    expect(cheap < dear).toBe(true);

    // @ts-expect-error a price does not sort against a probability
    const crossed = cheap < asProbability(0.5);
    expect(crossed).toBe(true);
  });

  it('refuses subtraction even within one brand, because the result has no brand', () => {
    const cheap = asPrice(0.4);
    const dear = asPrice(0.6);

    // @ts-expect-error the spread is computed on raw numbers and re-branded deliberately
    const spread = dear - cheap;
    expect(spread).toBeCloseTo(0.2);
    expect(priceValue(asPrice(priceValue(dear) - priceValue(cheap)))).toBeCloseTo(0.2);
  });

  it('crosses between Price and Probability only through a named conversion', () => {
    const price = asPrice(0.62);
    const probability: Probability = priceToProbability(price);
    expect(probabilityValue(probability)).toBe(0.62);
    expect(priceValue(probabilityToPrice(probability))).toBe(0.62);
  });
});
