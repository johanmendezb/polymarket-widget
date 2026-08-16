import {
  asPrice,
  asShares,
  asUsdc,
  feeRateValue,
  priceValue,
  sharesValue,
  usdcValue,
  type FeeConfig,
  type FillEstimate,
  type FillLeg,
  type FillRequest,
  type OrderBook,
  type Price,
  type Shares,
  type Usdc,
} from '@/domain';

/**
 * `walkBook` / `walkBookByBudget` implement `docs/03-domain/ORDER_EXECUTION.md` §1 exactly.
 *
 * **Contract: `book.asks` must already be sorted ASCENDING by price.** Normalizing the raw
 * upstream (worst-price-first) response is `mapOrderBook`'s job, in `src/polymarket` (E3). This
 * module trusts its input and does not re-sort it - see the "normalization is the caller's
 * responsibility" test in `test/simulation/book-walk.test.ts`, which feeds a raw descending
 * fixture on purpose to prove the boundary.
 */

const ZERO_PRICE = asPrice(0);

/** Floating-point noise can push a value a hair outside [0,1]; clamp before re-branding. */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roundTo5dp(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}

/**
 * The taker fee formula, `docs/03-domain/ORDER_EXECUTION.md` §2. `feeRate` is read from
 * `feeConfig`, never hardcoded (ADR-0009). This is a private duplicate of what will become the
 * standalone `computeFee` export in T2.3; book-walk.ts is refactored to call that export instead
 * once it lands, so the formula exists in exactly one place.
 */
function computeFeeForFill(shares: Shares, averagePrice: Price, feeConfig: FeeConfig): Usdc {
  if (!feeConfig.enabled || feeRateValue(feeConfig.takerRate) === 0) return asUsdc(0);

  const p = priceValue(averagePrice);
  const raw = sharesValue(shares) * feeRateValue(feeConfig.takerRate) * p * (1 - p);
  const rounded = roundTo5dp(raw);
  if (rounded > 0) return asUsdc(rounded);
  return raw > 0 ? asUsdc(0.00001) : asUsdc(0);
}

interface WalkResult {
  readonly legs: readonly FillLeg[];
  readonly sharesFilled: Shares;
  readonly averagePrice: Price;
  readonly maxFillableShares: Shares;
  /** Leftover request after walking the whole book: shares for a share request, USDC for a budget request. */
  readonly remaining: number;
}

function totalDepth(asks: OrderBook['asks']): number {
  let sum = 0;
  for (const level of asks) sum += sharesValue(level.size);
  return sum;
}

function walkAsksForShares(asks: OrderBook['asks'], requestedShares: number): WalkResult {
  let remaining = requestedShares;
  const legs: FillLeg[] = [];
  let costSum = 0;
  let sharesSum = 0;

  for (const level of asks) {
    if (remaining <= 0) break;
    const levelShares = sharesValue(level.size);
    const take = Math.min(remaining, levelShares);
    if (take > 0) {
      legs.push({ price: level.price, shares: asShares(take) });
      costSum += priceValue(level.price) * take;
      sharesSum += take;
    }
    remaining -= take;
  }

  const averagePrice = sharesSum > 0 ? asPrice(clamp01(costSum / sharesSum)) : ZERO_PRICE;

  return {
    legs,
    sharesFilled: asShares(sharesSum),
    averagePrice,
    maxFillableShares: asShares(totalDepth(asks)),
    remaining: Math.max(0, remaining),
  };
}

function walkAsksForBudget(asks: OrderBook['asks'], requestedUsdc: number): WalkResult {
  let budget = requestedUsdc;
  const legs: FillLeg[] = [];
  let costSum = 0;
  let sharesSum = 0;

  for (const level of asks) {
    if (budget <= 0) break;
    const levelPrice = priceValue(level.price);
    const levelShares = sharesValue(level.size);
    const levelCost = levelPrice * levelShares;

    if (levelCost <= budget) {
      legs.push({ price: level.price, shares: level.size });
      costSum += levelCost;
      sharesSum += levelShares;
      budget -= levelCost;
    } else {
      // levelPrice is always > 0 here: reaching this branch requires levelCost > budget >= 0
      // (the loop guard above breaks once budget hits 0), and levelCost is levelPrice *
      // levelShares, so a zero price would make levelCost 0 and take the `if` branch instead.
      const take = budget / levelPrice;
      if (take > 0) {
        legs.push({ price: level.price, shares: asShares(take) });
        costSum += take * levelPrice;
        sharesSum += take;
      }
      budget = 0;
      break;
    }
  }

  const averagePrice = sharesSum > 0 ? asPrice(clamp01(costSum / sharesSum)) : ZERO_PRICE;

  return {
    legs,
    sharesFilled: asShares(sharesSum),
    averagePrice,
    maxFillableShares: asShares(totalDepth(asks)),
    remaining: Math.max(0, budget),
  };
}

function finalize(
  book: OrderBook,
  requested: FillRequest,
  walk: WalkResult,
  feeConfig: FeeConfig,
): FillEstimate {
  const topOfBookPrice = book.asks.length > 0 ? (book.asks[0] as { price: Price }).price : ZERO_PRICE;
  const priceImpact = asPrice(clamp01(priceValue(walk.averagePrice) - priceValue(topOfBookPrice)));
  const grossCost = asUsdc(sharesValue(walk.sharesFilled) * priceValue(walk.averagePrice));
  const fee = computeFeeForFill(walk.sharesFilled, walk.averagePrice, feeConfig);
  const totalCost = asUsdc(usdcValue(grossCost) + usdcValue(fee));
  const payoutIfWin = asUsdc(sharesValue(walk.sharesFilled));
  const netProfitIfWin = asUsdc(usdcValue(payoutIfWin) - usdcValue(totalCost));

  return {
    requested,
    legs: walk.legs,
    sharesFilled: walk.sharesFilled,
    averagePrice: walk.averagePrice,
    topOfBookPrice,
    priceImpact,
    grossCost,
    fee,
    totalCost,
    payoutIfWin,
    netProfitIfWin,
    partial: walk.remaining > 1e-9,
    maxFillableShares: walk.maxFillableShares,
    bookFetchedAt: book.fetchedAt,
  };
}

/** Buys `request.shares` shares, walking `book.asks` from best price upward. Never throws. */
export function walkBook(
  book: OrderBook,
  request: { readonly shares: Shares },
  feeConfig: FeeConfig,
): FillEstimate {
  const walk = walkAsksForShares(book.asks, sharesValue(request.shares));
  return finalize(book, { kind: 'shares', value: request.shares }, walk, feeConfig);
}

/**
 * Buys as many shares as `request.usdc` affords, walking `book.asks` from best price upward.
 * Never throws. Per ORDER_EXECUTION.md §1: the entered dollar amount is treated as the cost of
 * shares, and the fee is an additional line on top - `totalCost = entered + fee` when the budget
 * is fully spent.
 */
export function walkBookByBudget(
  book: OrderBook,
  request: { readonly usdc: Usdc },
  feeConfig: FeeConfig,
): FillEstimate {
  const walk = walkAsksForBudget(book.asks, usdcValue(request.usdc));
  return finalize(book, { kind: 'usdc', value: request.usdc }, walk, feeConfig);
}
