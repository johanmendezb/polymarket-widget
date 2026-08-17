import {
  asUsdc,
  feeRateValue,
  priceValue,
  sharesValue,
  type FeeConfig,
  type Price,
  type Shares,
  type Usdc,
} from '@/domain';

/** Rounds to 5 decimal places, per `docs/03-domain/ORDER_EXECUTION.md` §2. */
export function roundTo5dp(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}

/**
 * The Polymarket taker fee formula, verbatim from `docs/03-domain/ORDER_EXECUTION.md` §2:
 *
 * ```
 * fee = C × feeRate × p × (1 − p)
 * ```
 *
 * `C` is `shares`, `p` is the volume-weighted **average fill price** - never the top of book,
 * because that is the price the shares actually traded at. `feeRate` comes from `feeConfig`,
 * read per market; it is never a constant (ADR-0009). Rounded to 5 decimal places, with a
 * 0.00001 USDC minimum charge when the true (unrounded) fee is nonzero, so a genuinely nonzero
 * fee never displays as free just because it rounds down to 0.00000.
 *
 * Returns exactly zero, with no minimum applied, when the market charges no fee at all
 * (`feeConfig.enabled === false` or `takerRate === 0`) - that zero is a fact about the market,
 * not a rounding artifact.
 */
export function computeFee(shares: Shares, averagePrice: Price, feeConfig: FeeConfig): Usdc {
  if (!feeConfig.enabled || feeRateValue(feeConfig.takerRate) === 0) return asUsdc(0);

  const p = priceValue(averagePrice);
  const raw = sharesValue(shares) * feeRateValue(feeConfig.takerRate) * p * (1 - p);
  const rounded = roundTo5dp(raw);
  if (rounded > 0) return asUsdc(rounded);
  return raw > 0 ? asUsdc(0.00001) : asUsdc(0);
}
