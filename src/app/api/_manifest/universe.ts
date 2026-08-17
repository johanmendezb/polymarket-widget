/**
 * The freeze universe rule (T8.1). ADR-0007's whole argument depends on this
 * being mechanical: freezing a resolved market recreates exactly the
 * contamination the ADR rejects, so "unresolved" is checked here, in code,
 * rather than trusted to whoever calls `pnpm freeze`.
 */
import type { Market } from '@/domain';

/** BACKLOG.md T8.1's own worked example (`pnpm freeze --n 30 --max-horizon-days 21`). */
export const DEFAULT_UNIVERSE_N = 30;
export const DEFAULT_MAX_HORIZON_DAYS = 21;

export type UnresolvedRefusalReason =
  | 'CLOSED'
  | 'INACTIVE'
  | 'NOT_ACCEPTING_ORDERS'
  | 'NO_END_DATE'
  | 'ALREADY_ENDED'
  | 'HORIZON_TOO_LONG';

export type UnresolvedShortHorizonCheck =
  | { readonly ok: true; readonly endMs: number }
  | { readonly ok: false; readonly reason: UnresolvedRefusalReason; readonly message: string };

export interface HorizonOptions {
  /** Epoch ms. */
  readonly now: number;
  readonly maxHorizonDays: number;
}

/**
 * The single source of truth for "may this market be frozen". Used both to
 * build the candidate universe and, defensively, immediately before each
 * individual freeze attempt (a market can close between search and freeze).
 */
export function checkUnresolvedShortHorizon(market: Market, opts: HorizonOptions): UnresolvedShortHorizonCheck {
  if (market.closed) {
    return {
      ok: false,
      reason: 'CLOSED',
      message: `Market ${market.id} is closed (resolved). Freezing a resolved market would recreate the training-data contamination ADR-0007 exists to avoid.`,
    };
  }
  if (!market.active) {
    return { ok: false, reason: 'INACTIVE', message: `Market ${market.id} is not active.` };
  }
  if (!market.acceptingOrders) {
    return {
      ok: false,
      reason: 'NOT_ACCEPTING_ORDERS',
      message: `Market ${market.id} is not accepting orders; no fill can be priced.`,
    };
  }
  if (market.endDate === null) {
    return { ok: false, reason: 'NO_END_DATE', message: `Market ${market.id} has no end date; its horizon cannot be checked.` };
  }

  const endMs = new Date(market.endDate).getTime();
  const horizonMs = endMs - opts.now;
  if (horizonMs <= 0) {
    return { ok: false, reason: 'ALREADY_ENDED', message: `Market ${market.id}'s end date has already passed.` };
  }

  const maxHorizonMs = opts.maxHorizonDays * 24 * 60 * 60 * 1000;
  if (horizonMs > maxHorizonMs) {
    return {
      ok: false,
      reason: 'HORIZON_TOO_LONG',
      message: `Market ${market.id} ends in more than ${opts.maxHorizonDays} days, outside the pre-registered short-horizon window.`,
    };
  }

  return { ok: true, endMs };
}

/**
 * Dedupes by id and sorts deterministically (soonest end date first,
 * markets with no end date last, tie-broken by market id) — no eligibility
 * filtering. This is the order `runFreeze` walks: every candidate is
 * visited, so an ineligible one (closed, out of horizon, ...) is still
 * reported with a reason rather than silently vanishing from the run.
 */
export function dedupeAndSortCandidates(candidates: readonly Market[]): readonly Market[] {
  const seen = new Set<string>();
  const deduped: { readonly market: Market; readonly endMs: number }[] = [];

  for (const market of candidates) {
    if (seen.has(market.id)) continue;
    seen.add(market.id);
    const endMs = market.endDate === null ? Number.POSITIVE_INFINITY : new Date(market.endDate).getTime();
    deduped.push({ market, endMs });
  }

  deduped.sort((a, b) => (a.endMs !== b.endMs ? a.endMs - b.endMs : a.market.id.localeCompare(b.market.id)));
  return deduped.map((entry) => entry.market);
}

/**
 * The eligible subset of {@link dedupeAndSortCandidates}, in the same order —
 * the mechanical definition of "the freeze universe" (BACKLOG.md T8.1:
 * "Selection rule is code, not judgment"). `runFreeze` does not use this
 * directly (it needs to see and report on ineligible candidates too); it
 * exists as the single, testable, human-checkable statement of the rule.
 */
export function selectFreezeUniverse(candidates: readonly Market[], opts: HorizonOptions): readonly Market[] {
  return dedupeAndSortCandidates(candidates).filter((market) => checkUnresolvedShortHorizon(market, opts).ok);
}
