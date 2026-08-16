/**
 * The four branded primitives, plus the taker fee rate.
 *
 * They exist for exactly one reason: to make it impossible to multiply a
 * probability by a price, or to hand a share count to something expecting
 * dollars, and still have the code compile.
 *
 * A brand written as `number & { __brand: 'Price' }` does not do that job. It
 * is still a `number`, so `probability * price` type-checks and quietly
 * produces a meaningless figure. These brands are therefore *opaque*: they are
 * not assignable to `number` and no arithmetic or comparison operator accepts
 * them. To do arithmetic you must unwrap both operands by name, which makes
 * every crossing of the semantic boundary visible in the diff:
 *
 * ```ts
 * const cost = priceValue(level.price) * sharesValue(level.size); // deliberate
 * const wrong = level.price * level.size;                          // compile error
 * ```
 *
 * The runtime representation is a plain `number`, so these values serialize
 * and print exactly as numbers do.
 *
 * One deliberate exception: TypeScript permits the relational operators between
 * two values of the *same* brand, so `level.price < book.tickSize` compiles and
 * — the runtime being a number — answers correctly. Comparing a `Price` to a
 * `Probability` still does not compile. Sorting and thresholding stay readable;
 * only the arithmetic that could silently mix units is blocked.
 */

declare const BRAND: unique symbol;

/** The opaque carrier. Not exported: nothing outside this file should widen it. */
type Branded<Tag extends string> = { readonly [BRAND]: Tag };

/** Probability in [0,1]. What the model believes. Never a percentage. */
export type Probability = Branded<'Probability'>;

/** Price per share in USDC, in [0,1]. Numerically equal to a probability, semantically not. */
export type Price = Branded<'Price'>;

/** A count of outcome shares. Each winning share pays exactly 1 USDC. */
export type Shares = Branded<'Shares'>;

/** A USDC amount. May be negative: a loss is a real amount. */
export type Usdc = Branded<'Usdc'>;

/** A fee rate in [0,1], e.g. 0.04 for politics. Read per market, never hardcoded. */
export type FeeRate = Branded<'FeeRate'>;

const isUnitInterval = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= 1;

const isNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;

const rangeError = (name: string, expectation: string, value: number): RangeError =>
  new RangeError(`${name} must be ${expectation}; received ${String(value)}`);

// --- Probability -----------------------------------------------------------

/** @throws RangeError when `value` is not a finite number in [0,1]. */
export function asProbability(value: number): Probability {
  if (!isUnitInterval(value)) throw rangeError('Probability', 'a finite number in [0,1]', value);
  return value as unknown as Probability;
}

/** The non-throwing form, for boundary code that would rather branch. */
export function tryAsProbability(value: number): Probability | null {
  return isUnitInterval(value) ? (value as unknown as Probability) : null;
}

/** Unwraps to the raw number. Every use site is a deliberate crossing. */
export function probabilityValue(value: Probability): number {
  return value as unknown as number;
}

// --- Price -----------------------------------------------------------------

/** @throws RangeError when `value` is not a finite number in [0,1]. */
export function asPrice(value: number): Price {
  if (!isUnitInterval(value)) throw rangeError('Price', 'a finite number in [0,1]', value);
  return value as unknown as Price;
}

/** The non-throwing form, for boundary code that would rather branch. */
export function tryAsPrice(value: number): Price | null {
  return isUnitInterval(value) ? (value as unknown as Price) : null;
}

/** Unwraps to the raw number. Every use site is a deliberate crossing. */
export function priceValue(value: Price): number {
  return value as unknown as number;
}

// --- Shares ----------------------------------------------------------------

/** @throws RangeError when `value` is not a finite, non-negative number. */
export function asShares(value: number): Shares {
  if (!isNonNegative(value)) throw rangeError('Shares', 'a finite number >= 0', value);
  return value as unknown as Shares;
}

/** The non-throwing form, for boundary code that would rather branch. */
export function tryAsShares(value: number): Shares | null {
  return isNonNegative(value) ? (value as unknown as Shares) : null;
}

/** Unwraps to the raw number. Every use site is a deliberate crossing. */
export function sharesValue(value: Shares): number {
  return value as unknown as number;
}

// --- Usdc ------------------------------------------------------------------

/**
 * Accepts negative amounts on purpose: `netProfitIfWin` is routinely negative
 * and clamping it at zero would hide the answer the user came for.
 *
 * @throws RangeError when `value` is not finite.
 */
export function asUsdc(value: number): Usdc {
  if (!Number.isFinite(value)) throw rangeError('Usdc', 'a finite number', value);
  return value as unknown as Usdc;
}

/** The non-throwing form, for boundary code that would rather branch. */
export function tryAsUsdc(value: number): Usdc | null {
  return Number.isFinite(value) ? (value as unknown as Usdc) : null;
}

/** Unwraps to the raw number. Every use site is a deliberate crossing. */
export function usdcValue(value: Usdc): number {
  return value as unknown as number;
}

// --- FeeRate ---------------------------------------------------------------

/**
 * A rate of exactly 0 is legitimate — geopolitics markets are genuinely free.
 * An *absent* upstream fee field is not, and must never arrive here as 0. See
 * `FeeConfig` and ADR-0009.
 *
 * @throws RangeError when `value` is not a finite number in [0,1].
 */
export function asFeeRate(value: number): FeeRate {
  if (!isUnitInterval(value)) throw rangeError('FeeRate', 'a finite number in [0,1]', value);
  return value as unknown as FeeRate;
}

/** The non-throwing form, for boundary code that would rather branch. */
export function tryAsFeeRate(value: number): FeeRate | null {
  return isUnitInterval(value) ? (value as unknown as FeeRate) : null;
}

/** Unwraps to the raw number. Every use site is a deliberate crossing. */
export function feeRateValue(value: FeeRate): number {
  return value as unknown as number;
}

// --- The one sanctioned crossing -------------------------------------------

/**
 * A market price *is* the crowd's probability, and the edge calculation has to
 * compare the two. These two functions are the only sanctioned way to cross,
 * so the crossing is greppable rather than reinvented in four modules.
 */
export function priceToProbability(value: Price): Probability {
  return value as unknown as Probability;
}

/** @see priceToProbability */
export function probabilityToPrice(value: Probability): Price {
  return value as unknown as Price;
}
