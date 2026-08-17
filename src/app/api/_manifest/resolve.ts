/**
 * `pnpm resolve` (T8.3): verify the manifest's hash, then fill outcomes into
 * markets that have since resolved. Structurally cannot mutate a frozen
 * forecast — it only ever reads `MANIFEST.jsonl` and produces new
 * `OutcomeEntry` rows for a *separate* file (`OUTCOMES.jsonl`); nothing in
 * this module has a code path that writes back into the manifest text.
 */
import { priceValue, type Market, type TokenId } from '@/domain';

import { sha256Hex } from './hash';
import { parseJsonl, serializeJsonl } from './serialize';
import type { ManifestEntry, OutcomeEntry, ResolvedOutcome } from './types';

export interface ResolutionSource {
  /** Fetches current market state. Resolution is read off `market.closed` and the settled outcome price. */
  fetchMarketStatus(marketId: string): Promise<Market>;
}

/**
 * A resolved market's winning outcome settles its `indicativePrice` to (or
 * very near) 1, the losing outcome to (or very near) 0. The `Market` domain
 * type carries no separate, authoritative "winning token" field (out of
 * T3's read-path scope), so this is an inference over the settled price,
 * not an upstream-declared fact — documented as a known limitation in the
 * handoff. A closed market whose price for this token lands between the
 * two thresholds is recorded `ANNULLED` rather than guessed either way.
 */
const WIN_PRICE_THRESHOLD = 0.98;
const LOSS_PRICE_THRESHOLD = 0.02;

export type ResolutionStatus =
  | { readonly resolved: false }
  | { readonly resolved: true; readonly outcome: ResolvedOutcome };

export function inferResolvedOutcome(market: Market, tokenId: TokenId): ResolutionStatus {
  if (!market.closed) return { resolved: false };

  const outcome = market.outcomes.find((candidate) => candidate.tokenId === tokenId);
  if (!outcome || outcome.indicativePrice === null) return { resolved: false };

  const price = priceValue(outcome.indicativePrice);
  if (price >= WIN_PRICE_THRESHOLD) return { resolved: true, outcome: 'YES' };
  if (price <= LOSS_PRICE_THRESHOLD) return { resolved: true, outcome: 'NO' };
  return { resolved: true, outcome: 'ANNULLED' };
}

export interface ResolveDeps {
  /** Raw bytes of `MANIFEST.jsonl`, exactly as read from disk. */
  readonly manifestText: string;
  /** Raw contents of `MANIFEST.sha256`. */
  readonly hashFileText: string;
  /** Raw contents of `OUTCOMES.jsonl`, or `''` if it does not exist yet. */
  readonly existingOutcomesText: string;
  readonly resolutionSource: ResolutionSource;
  /** Epoch ms, injected so `resolvedAt` stays deterministic in tests. */
  readonly now: number;
}

export interface ResolveReport {
  readonly frozenCount: number;
  readonly alreadyResolvedCount: number;
  readonly newlyResolvedCount: number;
  readonly stillOpenCount: number;
}

export type ResolveResult =
  | { readonly kind: 'hash_mismatch'; readonly expectedHash: string; readonly actualHash: string }
  | { readonly kind: 'ok'; readonly report: ResolveReport; readonly newOutcomesJsonl: string };

export async function runResolve(deps: ResolveDeps): Promise<ResolveResult> {
  const expectedHash = deps.hashFileText.trim();
  const actualHash = sha256Hex(deps.manifestText);
  if (expectedHash !== actualHash) {
    return { kind: 'hash_mismatch', expectedHash, actualHash };
  }

  const entries = parseJsonl<ManifestEntry>(deps.manifestText);
  const existingOutcomes = parseJsonl<OutcomeEntry>(deps.existingOutcomesText);
  const alreadyResolved = new Set(existingOutcomes.map((outcome) => outcome.marketId));

  const newOutcomes: OutcomeEntry[] = [];
  let stillOpenCount = 0;

  for (const entry of entries) {
    if (alreadyResolved.has(entry.marketId)) continue;

    const market = await deps.resolutionSource.fetchMarketStatus(entry.marketId);
    const status = inferResolvedOutcome(market, entry.tokenId);
    if (!status.resolved) {
      stillOpenCount += 1;
      continue;
    }

    newOutcomes.push({
      marketId: entry.marketId,
      tokenId: entry.tokenId,
      outcome: status.outcome,
      resolvedAt: new Date(deps.now).toISOString(),
    });
  }

  return {
    kind: 'ok',
    report: {
      frozenCount: entries.length,
      alreadyResolvedCount: alreadyResolved.size,
      newlyResolvedCount: newOutcomes.length,
      stillOpenCount,
    },
    newOutcomesJsonl: serializeJsonl(newOutcomes),
  };
}
