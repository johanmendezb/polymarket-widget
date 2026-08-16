import type { Price, Usdc } from './brand';
import type { FeeConfig } from './fees';
import type { TokenId } from './token';

/**
 * One tradeable outcome. `outcomes[i]` pairs with the upstream `clobTokenIds[i]`
 * and `outcomePrices[i]`; a mapper that finds the arrays differing in length
 * must fail loudly rather than read past the end.
 */
export interface MarketOutcome {
  /** "Yes", "No", or a candidate name. */
  readonly label: string;
  /** A decimal string of up to 77 digits. Never a number. */
  readonly tokenId: TokenId;
  /** From Gamma `outcomePrices`. Indicative only — good enough to render, not to fill. */
  readonly indicativePrice: Price | null;
}

/**
 * A market as this application understands it.
 *
 * Fields documented as *indicative* come from the Gamma market object. They are
 * fine for a list view and are **not** good enough to price a fill: anything
 * the user is about to act on comes from a fresh `GET /book`. The type system
 * cannot enforce that, so the naming and these comments carry it. See ADR-0008.
 */
export interface Market {
  /** Gamma numeric id, carried as a string. */
  readonly id: string;
  readonly slug: string;
  readonly conditionId: string;
  readonly question: string;
  readonly description: string;
  readonly resolutionSource: string | null;
  /** Belongs in the primary flow, not a footer. Users who distrust resolution ignore everything else. */
  readonly resolutionCriteria: string | null;
  /** Index-aligned with the upstream arrays. */
  readonly outcomes: readonly MarketOutcome[];
  /**
   * A mutually exclusive group where only one market resolves YES. We label it
   * and use groups for the coherence diagnostic; we do not implement NO-to-YES
   * conversion.
   */
  readonly negRisk: boolean;
  /** `false` means no fill can be priced, independent of `active`. Terminal: disable the ticket. */
  readonly acceptingOrders: boolean;
  readonly closed: boolean;
  readonly active: boolean;
  /** ISO 8601. */
  readonly endDate: string | null;
  /** Per market. Read it, never assume it. */
  readonly tickSize: Price;
  /** Per market. Read it, never assume it. */
  readonly minOrderSize: Usdc;
  readonly fees: FeeConfig;
  readonly liquidityUsd: number | null;
  readonly volume24hUsd: number | null;
  /** Indicative, from Gamma. */
  readonly bestBid: Price | null;
  /** Indicative, from Gamma. */
  readonly bestAsk: Price | null;
  /** Indicative, from Gamma. */
  readonly spread: Price | null;
  readonly lastTradePrice: Price | null;
  readonly eventId: string | null;
  readonly eventTitle: string | null;
  readonly category: string | null;
}
