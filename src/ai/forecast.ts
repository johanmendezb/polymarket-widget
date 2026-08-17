/**
 * Composes one `POST /api/ai/forecast` answer: runs the blind k-sampling and
 * the anchored diagnostic, blends, walks the book, evaluates the gate, and
 * assembles a `Recommendation`. `src/app/api/ai/forecast/route.ts` is a thin
 * wrapper around {@link composeForecastRecommendation} that does HTTP
 * concerns only (body parsing, error-to-status mapping) — everything
 * testable without a network belongs here, injected with a fake transport.
 */
import {
  asPrice,
  asUsdc,
  priceToProbability,
  priceValue,
  type Confidence,
  type EvidenceItem,
  type Forecast,
  type GateReason,
  type Market,
  type MarketOutcome,
  type OrderBook,
  type Recommendation,
  type Verdict,
} from '@/domain';
import {
  computeCostWaterfall,
  computeEdge,
  evaluateGate,
  HIGH_DISPERSION_THRESHOLD,
  KELLY_HARD_CAP_FRACTION,
  kellyFraction,
  walkBookByBudget,
} from '@/simulation';

import { BLEND_WEIGHT, blendWithMarket } from './blend';
import { ANTHROPIC_MODEL_ID, DEFAULT_TIMEOUT_MS, type AnthropicTransport } from './client';
import { toAnchoredPromptInput, toBlindPromptInput } from './prompts';
import type { ForecastSample } from './schema';
import { runAnchoredDiagnostic, runBlindSampling, type SamplingConfig } from './sampling';

/**
 * `POST /api/ai/forecast`'s body carries no order size (`04-architecture/
 * API_CONTRACTS.md`) — the user has not entered an amount yet at this point
 * in the flow (that happens in T4.3's preview, computed client-side against
 * the same book). The gate and edge still need one fill to reason about, so
 * this route walks the book at a fixed reference size. $100 sits inside the
 * $10-$1,000 range `docs/03-domain/ORDER_EXECUTION.md` discusses and is not
 * the size the user will necessarily trade.
 */
export const REFERENCE_FILL_USDC = asUsdc(100);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The model never self-reports confidence (`docs/05-ai/AI_SYSTEM.md` §5) —
 * dispersion is the documented substitute. Reuses the gate's own cited
 * `HIGH_DISPERSION_THRESHOLD` rather than inventing an uncited second number.
 */
function confidenceFromDispersion(dispersion: number): Confidence {
  if (dispersion >= HIGH_DISPERSION_THRESHOLD) return 'low';
  if (dispersion >= HIGH_DISPERSION_THRESHOLD / 2) return 'medium';
  return 'high';
}

/** Dedupes by `sourceUrl` across the surviving samples, preserving first-seen order. */
function mergeEvidence(samples: readonly ForecastSample[]): readonly EvidenceItem[] {
  const seen = new Set<string>();
  const merged: EvidenceItem[] = [];
  for (const sample of samples) {
    for (const item of sample.evidence) {
      if (seen.has(item.sourceUrl)) continue;
      seen.add(item.sourceUrl);
      merged.push(item);
    }
  }
  return merged;
}

function mergeRisks(samples: readonly ForecastSample[]): readonly string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const sample of samples) {
    for (const risk of sample.risks) {
      if (seen.has(risk)) continue;
      seen.add(risk);
      merged.push(risk);
    }
  }
  return merged;
}

const AMBIGUITY_ORDER: Record<'low' | 'medium' | 'high', number> = { low: 0, medium: 1, high: 2 };

/** The most cautious label wins, biasing toward abstention like the gate itself does. */
function resolutionAmbiguityConsensus(samples: readonly ForecastSample[]): 'low' | 'medium' | 'high' {
  return samples.reduce<'low' | 'medium' | 'high'>(
    (worst, sample) =>
      AMBIGUITY_ORDER[sample.resolutionAmbiguity] > AMBIGUITY_ORDER[worst] ? sample.resolutionAmbiguity : worst,
    'low',
  );
}

/**
 * `insufficient_evidence: true` is a per-sample answer, but the route
 * aggregates k samples. A strict majority of the surviving samples agreeing
 * there is nothing to forecast on is the point at which showing a blended
 * number would be showing noise dressed as a signal.
 */
function majorityDeclaredInsufficientEvidence(succeededCount: number, insufficientEvidenceCount: number): boolean {
  return insufficientEvidenceCount * 2 > succeededCount;
}

export type ForecastResult =
  | { readonly kind: 'recommendation'; readonly recommendation: Recommendation }
  | { readonly kind: 'no_evidence' };

export interface ComposeForecastDeps {
  readonly transport: AnthropicTransport;
  /** Epoch ms, injected so the gate and `createdAt` stay deterministic in tests. */
  readonly now: number;
  readonly timeoutMs?: number;
}

/**
 * Runs the blind and anchored elicitations concurrently — both share the
 * same `timeoutMs` ceiling, so the wall-clock cost of the pair stays bounded
 * by that one ceiling instead of doubling if they ran sequentially, which
 * would blow the route's hard 45s budget (`docs/05-ai/AI_SYSTEM.md` §1
 * numbers them 1 and 3 in pipeline order, but step 3 only depends on the
 * market price, not on step 2's aggregate, so nothing requires them to run
 * in sequence).
 *
 * The anchored call is diagnostic-only (`Forecast.anchoredProbability` is
 * nullable for exactly this reason): a failure there degrades to `null`
 * rather than failing the whole forecast. A failure in the blind sampling
 * propagates as a thrown {@link AiClientError} — that one is the actual
 * answer, and the route has nothing to show without it.
 *
 * @throws {AiClientError} `AI_TIMEOUT` or `AI_INVALID_OUTPUT` when the blind
 *   k-sampling itself fails; see `runBlindSampling`.
 */
export async function composeForecastRecommendation(
  market: Market,
  outcome: MarketOutcome,
  book: OrderBook,
  k: number,
  deps: ComposeForecastDeps,
): Promise<ForecastResult> {
  const todayIso = new Date(deps.now).toISOString().slice(0, 10);
  const blindInput = toBlindPromptInput(market, outcome, todayIso);

  const bestBid = book.bids[0]?.price ?? asPrice(0);
  const bestAsk = book.asks[0]?.price ?? bestBid;
  const marketMidpoint = asPrice(clamp01((priceValue(bestBid) + priceValue(bestAsk)) / 2));
  const marketProbability = priceToProbability(marketMidpoint);

  const samplingConfig: SamplingConfig = {
    transport: deps.transport,
    modelId: ANTHROPIC_MODEL_ID,
    timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };

  const [blindResult, anchoredProbability] = await Promise.all([
    runBlindSampling(blindInput, samplingConfig, k),
    runAnchoredDiagnostic(toAnchoredPromptInput(blindInput, marketProbability), samplingConfig).then(
      (result) => result.anchoredProbability,
      () => null,
    ),
  ]);

  if (majorityDeclaredInsufficientEvidence(blindResult.succeededCount, blindResult.insufficientEvidenceCount)) {
    return { kind: 'no_evidence' };
  }

  const blendedProbability = blendWithMarket(blindResult.aggregate.blindProbability, marketProbability);

  const fill = walkBookByBudget(book, { usdc: REFERENCE_FILL_USDC }, market.fees);
  const waterfall = computeCostWaterfall(book, fill, market.fees);
  const estimatedEdge = computeEdge(blendedProbability, waterfall);

  const evidence = mergeEvidence(blindResult.survivingSamples);
  const resolutionAmbiguity = resolutionAmbiguityConsensus(blindResult.survivingSamples);

  const gateOutcome = evaluateGate({
    acceptingOrders: market.acceptingOrders,
    category: market.category,
    marketMidpoint,
    bestBid,
    bestAsk,
    estimatedEdge,
    fill,
    endDate: market.endDate,
    now: deps.now,
    evidenceCount: evidence.length,
    dispersion: blindResult.aggregate.dispersion,
    resolutionAmbiguity,
  });

  const verdict: Verdict = gateOutcome.verdict;
  const reasons: readonly GateReason[] = gateOutcome.reasons;

  const rawKellyFraction = kellyFraction(blendedProbability, fill.averagePrice, 'quarter');
  const cappedKellyFraction = rawKellyFraction === null ? null : Math.min(rawKellyFraction, KELLY_HARD_CAP_FRACTION);
  const suggestedFractionOfBankroll = verdict === 'NO_BET' ? null : cappedKellyFraction;

  const forecast: Forecast = {
    tokenId: outcome.tokenId,
    outcomeLabel: outcome.label,
    blindProbability: blindResult.aggregate.blindProbability,
    dispersion: blindResult.aggregate.dispersion,
    samples: blindResult.aggregate.samples,
    anchoredProbability,
    blendedProbability,
    blendWeight: BLEND_WEIGHT,
    marketProbability,
    confidence: confidenceFromDispersion(blindResult.aggregate.dispersion),
    evidence,
    risks: mergeRisks(blindResult.survivingSamples),
    modelId: ANTHROPIC_MODEL_ID,
    promptVersion: blindResult.promptVersion,
    createdAt: new Date(deps.now).toISOString(),
  };

  const recommendation: Recommendation = {
    verdict,
    reasons,
    estimatedEdge,
    suggestedFractionOfBankroll,
    forecast,
    fill,
  };

  return { kind: 'recommendation', recommendation };
}
