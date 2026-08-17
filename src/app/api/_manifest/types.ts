/**
 * The manifest and outcomes record shapes for `pnpm freeze` (T8.1) and
 * `pnpm resolve` (T8.3). ADR-0007: a prospective, hashed, frozen forecast set
 * replaces a retrospective backtest, so these two files together are the
 * project's entire evidence artifact — the frozen forecast is never edited
 * once hashed, and outcomes are appended into a separate file so that
 * "provably never mutates a frozen forecast" is a filesystem fact, not a
 * convention.
 */
import type { Forecast, GateReason, Price, TokenId, Verdict } from '@/domain';

/** One frozen forecast, written once by `pnpm freeze` and never edited. */
export interface ManifestEntry {
  readonly marketId: string;
  readonly question: string;
  readonly tokenId: TokenId;
  readonly outcomeLabel: string;
  /**
   * `(bestBid + bestAsk) / 2` from the order book at freeze time. Recorded
   * for later comparison only — the blind prompt input type has no price
   * field and this value never reaches it (CLAUDE.md rule 6).
   */
  readonly marketPriceAtFreeze: Price;
  /** The full elicitation: blind/anchored/blended probabilities, dispersion, samples, promptVersion, modelId. */
  readonly forecast: Forecast;
  /** Samples requested of the pipeline. May exceed `forecast.samples.length` if some samples failed. */
  readonly k: number;
  readonly gateVerdict: Verdict;
  readonly gateReasons: readonly GateReason[];
  /** ISO 8601, when this entry was frozen. */
  readonly frozenAt: string;
}

/** Whether the specific outcome (token) this manifest entry forecasted on itself occurred. */
export type ResolvedOutcome = 'YES' | 'NO' | 'ANNULLED';

/**
 * Appended by `pnpm resolve`, one line per newly-resolved market. Never
 * merged into `ManifestEntry` — a separate, append-only file is what makes
 * "never mutates a frozen forecast" a structural guarantee rather than a
 * promise about code discipline.
 */
export interface OutcomeEntry {
  readonly marketId: string;
  readonly tokenId: TokenId;
  readonly outcome: ResolvedOutcome;
  /**
   * ISO 8601, when `pnpm resolve` observed this market as resolved. Not
   * necessarily the moment Polymarket itself finalized resolution — UMA
   * disputes can lag the market's `endDate` — recorded for provenance, not
   * claimed precision.
   */
  readonly resolvedAt: string;
}
