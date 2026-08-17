import {
  asPrice,
  asShares,
  asUsdc,
  priceValue,
  probabilityValue,
  usdcValue,
  type FeeConfig,
  type FillEstimate,
  type OrderBook,
  type Price,
  type Probability,
  type Usdc,
} from '@/domain';

import { computeFee } from './fees';

const ZERO_PRICE = asPrice(0);
const ONE_SHARE = asShares(1);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The cost waterfall from `docs/03-domain/ORDER_EXECUTION.md` §3, one named field per step, so
 * the UI renders the chain rather than recomputing it. `surviving edge` is the one step not
 * carried here: it needs the AI's estimated probability, which this function never receives, so
 * it is produced separately by `computeEdge`.
 */
export interface CostWaterfall {
  /** What the market believes: `(bestBid + bestAsk) / 2`. */
  readonly marketMidpoint: Price;
  /** What you can actually buy at right now. */
  readonly bestAsk: Price;
  /** What your own size does to your own fill; `fill.averagePrice`, never the midpoint (ADR-0008). */
  readonly averageFillPrice: Price;
  /** `computeFee` for a single share at `averageFillPrice` - the rate, not the total fee for the fill. */
  readonly feePerShare: Usdc;
  /** `averageFillPrice + feePerShare`. The number that actually decides whether an edge exists. */
  readonly effectiveCostPerShare: Usdc;
}

/**
 * Builds the cost waterfall for one fill. Never throws: an empty book side falls back to a zero
 * price (both sides empty) or to the surviving side (one side empty), rather than producing NaN.
 */
export function computeCostWaterfall(
  book: OrderBook,
  fill: FillEstimate,
  feeConfig: FeeConfig,
): CostWaterfall {
  const bestAsk = book.asks[0]?.price ?? ZERO_PRICE;
  const bestBid = book.bids[0]?.price ?? bestAsk;
  const marketMidpoint = asPrice(clamp01((priceValue(bestBid) + priceValue(bestAsk)) / 2));

  const feePerShare = computeFee(ONE_SHARE, fill.averagePrice, feeConfig);
  const effectiveCostPerShare = asUsdc(priceValue(fill.averagePrice) + usdcValue(feePerShare));

  return {
    marketMidpoint,
    bestAsk,
    averageFillPrice: fill.averagePrice,
    feePerShare,
    effectiveCostPerShare,
  };
}

/**
 * `estimatedProbability - effectiveCostPerShare`. A negative result is a real answer - "no
 * survives" the costs - and is returned as-is, never clamped to zero (ORDER_EXECUTION.md §3).
 */
export function computeEdge(estimatedProbability: Probability, waterfall: CostWaterfall): number {
  return probabilityValue(estimatedProbability) - usdcValue(waterfall.effectiveCostPerShare);
}
