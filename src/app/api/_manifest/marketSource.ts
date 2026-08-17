/**
 * Where `pnpm freeze` gets its candidate markets from. Injectable for
 * exactly the reason `AnthropicTransport` is (T5.2): production code hits
 * live Polymarket, tests inject a fake, and nothing here ever needs a
 * network to run.
 */
import type { Market } from '@/domain';

export interface MarketCandidateSource {
  fetchCandidates(): Promise<readonly Market[]>;
}

/**
 * Pre-registered seed queries against `GET gamma /public-search` — code, not
 * a per-run judgment call (BACKLOG.md T8.1: "Selection rule is code, not
 * judgment"). Broad enough to span Polymarket's major categories without
 * hand-picking a market. `fetchSearch` is the one upstream read this project
 * has already verified and tested end to end (T1.4/T3.x); a bulk
 * `/markets/keyset` listing endpoint exists upstream but was not reachable
 * to verify from this environment, so it is not used here — see the handoff.
 */
export const DEFAULT_UNIVERSE_SEED_QUERIES: readonly string[] = [
  'election',
  'fed',
  'crypto',
  'sports',
  'inflation',
  'weather',
];

export type SearchFn = (query: string) => Promise<{ readonly data: readonly Market[] }>;

/** Dedupes candidates across seed queries by market id, preserving first-seen order. */
export function defaultMarketSource(
  fetchSearchFn: SearchFn,
  seedQueries: readonly string[] = DEFAULT_UNIVERSE_SEED_QUERIES,
): MarketCandidateSource {
  return {
    async fetchCandidates(): Promise<readonly Market[]> {
      const seen = new Map<string, Market>();
      for (const query of seedQueries) {
        const result = await fetchSearchFn(query);
        for (const market of result.data) {
          if (!seen.has(market.id)) seen.set(market.id, market);
        }
      }
      return [...seen.values()];
    },
  };
}
