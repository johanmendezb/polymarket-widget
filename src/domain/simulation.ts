import type { Price, Shares, Usdc } from './brand';
import type { TokenId } from './token';

/** v1 buys an outcome and nothing else. Selling is post-challenge. */
export type Side = 'BUY';

/** One slice of a fill: shares taken at one book level's price. */
export interface FillLeg {
  readonly price: Price;
  readonly shares: Shares;
}

/** What the user asked for, in whichever unit they typed it. */
export type FillRequest =
  | { readonly kind: 'shares'; readonly value: Shares }
  | { readonly kind: 'usdc'; readonly value: Usdc };

/**
 * The result of walking the book for a BUY.
 *
 * **`priceImpact`, not slippage.** Price impact is the gap between top of book
 * and the volume-weighted fill, caused by the size of your own order. Slippage
 * is drift between quote time and settlement time; a simulation has no
 * settlement, so there is no slippage here and no slippage-tolerance control
 * anywhere in the product.
 */
export interface FillEstimate {
  readonly requested: FillRequest;
  readonly legs: readonly FillLeg[];
  readonly sharesFilled: Shares;
  /** Volume-weighted average price across the legs. Never the midpoint. */
  readonly averagePrice: Price;
  /** `asks[0].price` at the time of the walk. */
  readonly topOfBookPrice: Price;
  /** `averagePrice - topOfBookPrice`. Zero when the whole order fills at top of book. */
  readonly priceImpact: Price;
  /** `sharesFilled * averagePrice`. */
  readonly grossCost: Usdc;
  readonly fee: Usdc;
  /** `grossCost + fee`. */
  readonly totalCost: Usdc;
  /** `sharesFilled * 1.00`. */
  readonly payoutIfWin: Usdc;
  /** `payoutIfWin - totalCost`. Negative is a real answer, never clamped. */
  readonly netProfitIfWin: Usdc;
  /** True when the book could not absorb the full request. */
  readonly partial: boolean;
  readonly maxFillableShares: Shares;
  /** Epoch ms of the book this walk consumed. */
  readonly bookFetchedAt: number;
}

/** A position that exists only in this application. No order is ever placed. */
export interface SimulatedPosition {
  readonly id: string;
  readonly marketId: string;
  readonly marketQuestion: string;
  readonly outcomeLabel: string;
  readonly tokenId: TokenId;
  readonly shares: Shares;
  readonly entryAveragePrice: Price;
  readonly feePaid: Usdc;
  readonly totalCost: Usdc;
  readonly payoutIfWin: Usdc;
  /** Epoch ms. */
  readonly createdAt: number;
  /** Always true. It exists so the type says "simulated" at every use site. */
  readonly simulated: true;
}
