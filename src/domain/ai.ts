import type { Probability } from './brand';
import type { FillEstimate } from './simulation';
import type { TokenId } from './token';

export type Confidence = 'low' | 'medium' | 'high';

export interface EvidenceItem {
  readonly claim: string;
  readonly sourceUrl: string;
  readonly sourceTitle: string;
  /** ISO 8601. `null` is allowed and must be shown as "undated". */
  readonly publishedAt: string | null;
  readonly supports: 'yes' | 'no' | 'context';
}

/**
 * One elicitation for one outcome.
 *
 * `blindProbability` is produced by a code path that never receives the market
 * price (invariant I12). The blind prompt's input type has no price field, and
 * it must stay that way — anchoring collapse is risk R-01.
 */
export interface Forecast {
  readonly tokenId: TokenId;
  readonly outcomeLabel: string;
  /** Median of k blind samples, elicited WITHOUT the market price in context. */
  readonly blindProbability: Probability;
  /** Interquartile range across the samples. Feeds the gate. */
  readonly dispersion: number;
  readonly samples: readonly Probability[];
  /** An optional second elicitation WITH the price shown. Diagnostic only, never displayed as the estimate. */
  readonly anchoredProbability: Probability | null;
  /** `blindProbability` blended with the market. This is what is displayed as "AI estimate". */
  readonly blendedProbability: Probability;
  /** Fixed and pre-registered. Not tuned on outcomes. */
  readonly blendWeight: number;
  /** The crowd's number, in a different visual register from the model's. */
  readonly marketProbability: Probability;
  readonly confidence: Confidence;
  readonly evidence: readonly EvidenceItem[];
  readonly risks: readonly string[];
  readonly modelId: string;
  /** The file name under `prompts/runtime/`. Prompts are versioned files, not string literals. */
  readonly promptVersion: string;
  /** ISO 8601. */
  readonly createdAt: string;
}

/**
 * Why the gate abstained. Every member maps to a cited threshold in
 * `docs/05-ai/AI_SYSTEM.md` §4; a reason with no citation may not ship.
 */
export const GATE_REASONS = [
  'EDGE_BELOW_COST',
  'SPREAD_TOO_WIDE',
  'INSUFFICIENT_DEPTH',
  'EXTREME_PRICE_BAND',
  'HORIZON_TOO_LONG',
  'MARKET_TOO_CERTAIN',
  'THIN_EVIDENCE',
  'HIGH_MODEL_DISPERSION',
  'AMBIGUOUS_RESOLUTION',
  'NEAR_EXPIRY_SPORTS',
  'MARKET_NOT_ACCEPTING_ORDERS',
] as const;

export type GateReason = (typeof GATE_REASONS)[number];

export function isGateReason(value: unknown): value is GateReason {
  return typeof value === 'string' && (GATE_REASONS as readonly string[]).includes(value);
}

export type Verdict = 'CONSIDER' | 'NO_BET';

/**
 * The output of the gate. `CONSIDER` is never a claim that the system beats the
 * market; the claims policy in `docs/05-ai/EVALUATION.md` §B8 binds UI copy.
 */
export interface Recommendation {
  readonly verdict: Verdict;
  /** Populated for `NO_BET`; may be non-empty on `CONSIDER` as warnings. */
  readonly reasons: readonly GateReason[];
  /** `blendedProbability - (averagePrice + feePerShare)`. Negative is a real answer, never clamped. */
  readonly estimatedEdge: number;
  /** Quarter-Kelly, capped. `null` on `NO_BET`. */
  readonly suggestedFractionOfBankroll: number | null;
  readonly forecast: Forecast;
  readonly fill: FillEstimate;
}
