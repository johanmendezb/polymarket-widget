import { asUsdc, priceValue, probabilityValue, usdcValue, type Price, type Probability, type Usdc } from '@/domain';

/** ORDER_EXECUTION.md §4: quarter Kelly is the default; full Kelly is shown but not offered as the default. */
export type KellyMode = 'quarter' | 'half' | 'full';

const MODE_MULTIPLIER: Record<KellyMode, number> = {
  quarter: 0.25,
  half: 0.5,
  full: 1,
};

/**
 * Hard cap: 2% of bankroll regardless of what the formula or the mode says.
 * ORDER_EXECUTION.md §4 - full Kelly at q=0.90, p=0.95 says stake 50% of bankroll, which is
 * wrong here because estimation error in the model's mean is far more damaging than error in
 * the variance, and p is a model output with measurable dispersion. This cap is deliberate,
 * not a placeholder.
 */
export const KELLY_HARD_CAP_FRACTION = 0.02;

/**
 * Kelly fraction for a binary contract bought at price `q` with estimated probability `p`:
 * `f* = (p − q) / (1 − q)`. Returns `null` when the base fraction is not positive - there is no
 * bet to size. `mode` scales the base fraction (quarter Kelly by default); the 2% hard cap is
 * applied separately, by `suggestedSize`, so this function always reports the true (uncapped)
 * fraction for the chosen mode.
 */
export function kellyFraction(p: Probability, q: Price, mode: KellyMode = 'quarter'): number | null {
  const pValue = probabilityValue(p);
  const qValue = priceValue(q);
  const denominator = 1 - qValue;
  if (denominator <= 0) return null;

  const base = (pValue - qValue) / denominator;
  if (base <= 0) return null;

  return base * MODE_MULTIPLIER[mode];
}

/**
 * `kellyFraction`, converted to a dollar amount against `bankroll` and capped at
 * `KELLY_HARD_CAP_FRACTION`. `null` when `kellyFraction` is `null` - sizing is suppressed
 * entirely rather than showing $0, per ORDER_EXECUTION.md §4.
 */
export function suggestedSize(
  p: Probability,
  q: Price,
  bankroll: Usdc,
  mode: KellyMode = 'quarter',
): Usdc | null {
  const fraction = kellyFraction(p, q, mode);
  if (fraction === null) return null;

  const capped = Math.min(fraction, KELLY_HARD_CAP_FRACTION);
  return asUsdc(usdcValue(bankroll) * capped);
}
