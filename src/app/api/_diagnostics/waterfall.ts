/**
 * Cost waterfall for one market, `docs/05-ai/EVALUATION.md` §B7 row 8: mid -> ask -> fee ->
 * depth-walk -> edge, with every step "VERIFIED inputs" per that table because it walks a fresh
 * live book and reads the fee straight off the market object (ADR-0009), exactly like
 * `POST /api/ai/forecast` (`@/ai`'s `composeForecastRecommendation`) does. `ManifestEntry` (T8.1)
 * only records the bid/ask midpoint at freeze time, not the full book or fee config, so this
 * diagnostic recomputes the waterfall against *current* market state rather than replaying the
 * frozen one — the UI must say so, since the edge shown here can differ from the frozen
 * `Recommendation`'s edge if the book has moved since freeze.
 */
import type { Market, OrderBook } from '@/domain';
import { computeCostWaterfall, computeEdge, walkBookByBudget } from '@/simulation';
import { REFERENCE_FILL_USDC } from '@/ai';

import type { ManifestEntry } from '../_manifest/types';
import type { WaterfallDiagnostic } from './types';

export interface WaterfallDeps {
  readonly fetchMarket: (marketId: string) => Promise<{ readonly data: Market }>;
  readonly fetchBook: (tokenId: string) => Promise<{ readonly data: OrderBook }>;
  /** Epoch ms, injected so `fetchedAt` is deterministic in tests. */
  readonly now: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Picks the first `CONSIDER`-verdict entry as the more interesting illustration (a `NO_BET`
 * market's edge is trivially non-positive); falls back to the first entry overall when nothing
 * passed the gate. Returns `null` only for an empty manifest.
 */
export function pickWaterfallEntry(entries: readonly ManifestEntry[]): ManifestEntry | null {
  return entries.find((entry) => entry.gateVerdict === 'CONSIDER') ?? entries[0] ?? null;
}

export async function computeLiveCostWaterfall(entry: ManifestEntry, deps: WaterfallDeps): Promise<WaterfallDiagnostic> {
  try {
    const [marketResult, bookResult] = await Promise.all([deps.fetchMarket(entry.marketId), deps.fetchBook(entry.tokenId)]);
    const fill = walkBookByBudget(bookResult.data, { usdc: REFERENCE_FILL_USDC }, marketResult.data.fees);
    const waterfall = computeCostWaterfall(bookResult.data, fill, marketResult.data.fees);
    const estimatedEdge = computeEdge(entry.forecast.blendedProbability, waterfall);

    return {
      available: true,
      marketId: entry.marketId,
      question: entry.question,
      waterfall,
      estimatedEdge,
      fetchedAt: new Date(deps.now).toISOString(),
    };
  } catch (error) {
    return { available: false, reason: errorMessage(error) };
  }
}
