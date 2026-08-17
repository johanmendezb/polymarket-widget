import {
  priceValue,
  type FillEstimate,
  type GateReason,
  type Price,
  type Recommendation,
} from '@/domain';

/**
 * The 11-rule abstention gate, `docs/05-ai/AI_SYSTEM.md` §4. Full citations for every threshold
 * are in `docs/02-research/STRATEGY_RESEARCH.md` §C3; a reason code that cannot be traced to a
 * cited threshold does not ship (same doc, same section).
 *
 * Pure and total: given any well-formed input it returns every reason that fires, never just the
 * first, and never throws.
 */
export interface GateInput {
  readonly acceptingOrders: boolean;
  /** Gamma `category`, e.g. "Politics", "Sports". `null` when the market carries none. */
  readonly category: string | null;
  /** The crowd's belief - `(bestBid + bestAsk) / 2`, or a book midpoint computed upstream. */
  readonly marketMidpoint: Price;
  readonly bestBid: Price;
  readonly bestAsk: Price;
  /** `computeEdge`'s output: `estimatedProbability - effectiveCostPerShare`. May be negative. */
  readonly estimatedEdge: number;
  readonly fill: Pick<FillEstimate, 'averagePrice' | 'partial'>;
  /** ISO 8601, or `null` when the market carries no end date. */
  readonly endDate: string | null;
  /** Epoch ms, injected by the caller so the gate stays a pure function of its input. */
  readonly now: number;
  /** Count of relevant, dated sources the forecast retrieved. */
  readonly evidenceCount: number;
  /** IQR of the k blind samples. */
  readonly dispersion: number;
  readonly resolutionAmbiguity: 'low' | 'medium' | 'high';
}

/**
 * Rule 4, AI_SYSTEM.md §4 / STRATEGY_RESEARCH.md §C3 rule 4. Sub-10c contracts lost more than
 * 60% on Kalshi [S18]; spreads run 3-4x wider below 0.10 [S20]; Kelly explodes at the top end
 * (ORDER_EXECUTION.md §4).
 */
export const EXTREME_PRICE_LOW = 0.1;
export const EXTREME_PRICE_HIGH = 0.9;

/**
 * Rule 5, STRATEGY_RESEARCH.md §C3 rule 5, source S17: market compression toward 0.5 rises
 * beyond a one-month horizon, and any model news advantage decays over that window.
 */
export const HORIZON_TOO_LONG_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Rule 6, AI_SYSTEM.md §4 / STRATEGY_RESEARCH.md §C3 rule 6, source S10 (Halawi): LLMs were
 * only competitive against the market inside this band in the source's own conditional analysis.
 */
export const MARKET_TOO_CERTAIN_LOW = 0.3;
export const MARKET_TOO_CERTAIN_HIGH = 0.7;

/** Rule 7, STRATEGY_RESEARCH.md §C3 rule 7, source S10 (Halawi's >=5-article condition). */
export const MIN_EVIDENCE_COUNT = 5;

/**
 * Rule 8, STRATEGY_RESEARCH.md §C3 rule 8, source S14: dispersion predicts forecast error
 * better than verbalized confidence, but the source names no numeric IQR cutoff - only "reject
 * if the spread is large". `docs/05-ai/EVALUATION.md` §B9 OQ1 records sigma_d (the empirical
 * dispersion on our market set) as an explicitly unmeasured open question pending resolved-market
 * data. This value is therefore a provisional placeholder, not a cited figure, and must be
 * revisited once that data exists - it is deliberately named here rather than left silent.
 */
export const HIGH_DISPERSION_THRESHOLD = 0.15;

/**
 * Rule 10, STRATEGY_RESEARCH.md §C3 rule 10, source S19: calibration goes step-like and
 * distorts in the final 10 minutes of a sports market.
 */
export const NEAR_EXPIRY_SPORTS_MS = 10 * 60 * 1000;

function isSports(category: string | null): boolean {
  return category?.toLowerCase() === 'sports';
}

/**
 * Rule 3 implements only the "book cannot fill it" clause of AI_SYSTEM.md §4 rule 3
 * (`fill.partial`). STRATEGY_RESEARCH.md §C3 rule 3 names no numeric price-impact threshold -
 * only the qualitative $10-to-$1,000 order-size degradation evidence [S21] - so the
 * "moves the price beyond a threshold" clause is deliberately not implemented rather than
 * shipping a fabricated number. See CURRENT_STATE.md for the follow-up.
 */
export function evaluateGate(input: GateInput): Pick<Recommendation, 'verdict' | 'reasons'> {
  const reasons: GateReason[] = [];

  if (input.estimatedEdge <= 0) reasons.push('EDGE_BELOW_COST');

  const spread = priceValue(input.bestAsk) - priceValue(input.bestBid);
  if (spread > input.estimatedEdge) reasons.push('SPREAD_TOO_WIDE');

  if (input.fill.partial) reasons.push('INSUFFICIENT_DEPTH');

  const fillPrice = priceValue(input.fill.averagePrice);
  if (fillPrice < EXTREME_PRICE_LOW || fillPrice > EXTREME_PRICE_HIGH) {
    reasons.push('EXTREME_PRICE_BAND');
  }

  const horizonMs = input.endDate === null ? null : new Date(input.endDate).getTime() - input.now;
  if (horizonMs !== null && horizonMs > HORIZON_TOO_LONG_MS) reasons.push('HORIZON_TOO_LONG');

  const midpoint = priceValue(input.marketMidpoint);
  if (midpoint < MARKET_TOO_CERTAIN_LOW || midpoint > MARKET_TOO_CERTAIN_HIGH) {
    reasons.push('MARKET_TOO_CERTAIN');
  }

  if (input.evidenceCount < MIN_EVIDENCE_COUNT) reasons.push('THIN_EVIDENCE');

  if (input.dispersion > HIGH_DISPERSION_THRESHOLD) reasons.push('HIGH_MODEL_DISPERSION');

  // "Ambiguous" reads as anything short of a confidently low label, biasing toward abstention -
  // consistent with AI_SYSTEM.md §0's "most valuable output is often no bet".
  if (input.resolutionAmbiguity !== 'low') reasons.push('AMBIGUOUS_RESOLUTION');

  if (isSports(input.category) && horizonMs !== null && horizonMs >= 0 && horizonMs <= NEAR_EXPIRY_SPORTS_MS) {
    reasons.push('NEAR_EXPIRY_SPORTS');
  }

  if (!input.acceptingOrders) reasons.push('MARKET_NOT_ACCEPTING_ORDERS');

  return { verdict: reasons.length === 0 ? 'CONSIDER' : 'NO_BET', reasons };
}
