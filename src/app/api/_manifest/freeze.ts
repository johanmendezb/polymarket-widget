/**
 * `pnpm freeze` (T8.1): compose N frozen forecasts on unresolved,
 * short-horizon markets. Pure composition over injected dependencies — no
 * filesystem write happens here, so this is fully testable with a fake
 * transport and a fake market source and no network (see `persistence.ts`
 * for the disk-writing half).
 */
import { asPrice, priceValue, type OrderBook, type Price } from '@/domain';
import { composeForecastRecommendation, DEFAULT_SAMPLE_COUNT, type AnthropicTransport, type ForecastResult } from '@/ai';

import type { MarketCandidateSource } from './marketSource';
import type { ManifestEntry } from './types';
import { checkUnresolvedShortHorizon, dedupeAndSortCandidates, type HorizonOptions } from './universe';

export interface FreezeOptions {
  readonly n: number;
  readonly maxHorizonDays: number;
}

export interface FreezeDeps {
  readonly marketSource: MarketCandidateSource;
  readonly fetchBook: (tokenId: string) => Promise<{ readonly data: OrderBook }>;
  readonly transport: AnthropicTransport;
  /** Epoch ms, injected so freeze runs are deterministic in tests. */
  readonly now: number;
  readonly k?: number;
}

export interface FreezeSkip {
  readonly marketId: string;
  readonly reason: string;
}

export interface FreezeReport {
  readonly entries: readonly ManifestEntry[];
  /** Deduped candidates from the market source, before any eligibility filtering. */
  readonly candidatesConsidered: number;
  readonly skipped: readonly FreezeSkip[];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** `(bestBid + bestAsk) / 2`, recorded for later comparison only — never fed to the blind prompt. */
function marketMidpoint(book: OrderBook): Price {
  const bestBid = book.bids[0]?.price ?? asPrice(0);
  const bestAsk = book.asks[0]?.price ?? bestBid;
  return asPrice(clamp01((priceValue(bestBid) + priceValue(bestAsk)) / 2));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runFreeze(options: FreezeOptions, deps: FreezeDeps): Promise<FreezeReport> {
  const candidates = await deps.marketSource.fetchCandidates();
  const horizonOptions: HorizonOptions = { now: deps.now, maxHorizonDays: options.maxHorizonDays };
  // Deduped and sorted, but not pre-filtered: every candidate is visited, so
  // an ineligible one (closed, out of horizon, ...) is reported with a
  // reason in `skipped` rather than silently vanishing from the run. This
  // is also what makes "freezing refuses a resolved market, with a message
  // explaining why" observable in the report, not just in a unit test of
  // the filter in isolation.
  const deduped = dedupeAndSortCandidates(candidates);
  const k = deps.k ?? DEFAULT_SAMPLE_COUNT;

  const entries: ManifestEntry[] = [];
  const skipped: FreezeSkip[] = [];

  for (const market of deduped) {
    if (entries.length >= options.n) break;

    const check = checkUnresolvedShortHorizon(market, horizonOptions);
    if (!check.ok) {
      skipped.push({ marketId: market.id, reason: check.message });
      continue;
    }

    const outcome = market.outcomes.find((candidate) => candidate.label.toLowerCase() === 'yes') ?? market.outcomes[0];
    if (!outcome) {
      skipped.push({ marketId: market.id, reason: 'Market has no outcomes.' });
      continue;
    }

    let book: OrderBook;
    try {
      book = (await deps.fetchBook(outcome.tokenId)).data;
    } catch (error) {
      skipped.push({ marketId: market.id, reason: `Book fetch failed: ${errorMessage(error)}` });
      continue;
    }

    let result: ForecastResult;
    try {
      result = await composeForecastRecommendation(market, outcome, book, k, { transport: deps.transport, now: deps.now });
    } catch (error) {
      skipped.push({ marketId: market.id, reason: `Forecast pipeline failed: ${errorMessage(error)}` });
      continue;
    }

    if (result.kind === 'no_evidence') {
      skipped.push({ marketId: market.id, reason: 'AI_NO_EVIDENCE: no trusted sources found for this question.' });
      continue;
    }

    entries.push({
      marketId: market.id,
      question: market.question,
      tokenId: outcome.tokenId,
      outcomeLabel: outcome.label,
      marketPriceAtFreeze: marketMidpoint(book),
      forecast: result.recommendation.forecast,
      k,
      gateVerdict: result.recommendation.verdict,
      gateReasons: result.recommendation.reasons,
      frozenAt: new Date(deps.now).toISOString(),
    });
  }

  return { entries, candidatesConsidered: deduped.length, skipped };
}
