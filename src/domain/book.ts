import type { Price, Shares, Usdc } from './brand';
import type { TokenId } from './token';

/** One resting level: a price, and the size available at it. */
export interface BookLevel {
  readonly price: Price;
  readonly size: Shares;
}

/**
 * A normalized order book for one outcome token.
 *
 * ## The normalization contract
 *
 * **Upstream orders BOTH sides worst-price-first.** A live `GET /book` returns
 * asks descending and bids ascending, so on the wire the best level of each
 * side is the LAST element. Verified 2026-08-16 against eight live markets. An
 * earlier revision of the domain model claimed both sides arrive descending;
 * that was right about asks and wrong about bids.
 *
 * `mapOrderBook()` therefore reverses **both** arrays, and inside this domain:
 *
 * - `asks[0]` is the best (lowest) ask — asks run ASCENDING.
 * - `bids[0]` is the best (highest) bid — bids run DESCENDING.
 *
 * Reading `asks` unreversed prices every buy at 99 cents instead of 45, which
 * is loud. Reading `bids` unreversed is the dangerous one, because it is quiet:
 * `bids[0]` holds the *worst* bid, the spread reads as enormous, the
 * wide-spread display rule and the abstention gate fire on healthy markets, and
 * the crossed-book invariant I1 still passes because 0.008 >= 0.001. Nothing
 * throws; the widget just abstains from everything and looks thoughtful. If the
 * gate rejects far more markets than expected, check this first.
 *
 * An empty `asks` array is a valid book, not an error. It means the outcome
 * cannot currently be bought.
 */
export interface OrderBook {
  readonly tokenId: TokenId;
  /** Sorted DESCENDING by price after normalization. `bids[0]` is the best bid. */
  readonly bids: readonly BookLevel[];
  /** Sorted ASCENDING by price after normalization. `asks[0]` is the best ask. */
  readonly asks: readonly BookLevel[];
  /** Per market, read from upstream. Never assumed. */
  readonly tickSize: Price;
  /** Per market, read from upstream. Never assumed. */
  readonly minOrderSize: Usdc;
  readonly negRisk: boolean;
  readonly lastTradePrice: Price | null;
  /** Epoch ms, ours not theirs. */
  readonly fetchedAt: number;
  /** Theirs, carried verbatim as a string. */
  readonly upstreamTimestamp: string;
}
