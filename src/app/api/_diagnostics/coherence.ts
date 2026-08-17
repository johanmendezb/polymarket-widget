/**
 * Complementary and multi-outcome coherence, `docs/05-ai/EVALUATION.md` §B7 rows 1-2.
 *
 * Both group `ManifestEntry` rows by `marketId`: a complementary pair is two independently
 * frozen outcomes of the same market (ideally Yes/No), a multi-outcome group is three or more.
 * Neither needs a resolved outcome — coherence is checkable against nothing but the model's own
 * numbers, which is the entire point of a resolution-free diagnostic.
 *
 * `pnpm freeze` (T8.1) only ever freezes one outcome per market today (`freeze.ts` picks the
 * "yes" outcome, or the first, and stops), so every group here has size one and both diagnostics
 * report `n: 0` until freeze is extended to elicit more than one outcome per market. That is a
 * manifest-schema gap, not a bug in this computation, and the UI states it rather than silently
 * showing nothing.
 */
import { probabilityValue } from '@/domain';

import type { ManifestEntry } from '../_manifest/types';
import type { CoherenceDiagnostic, CoherenceGroup } from './types';

function groupByMarketId(entries: readonly ManifestEntry[]): ReadonlyMap<string, readonly ManifestEntry[]> {
  const groups = new Map<string, ManifestEntry[]>();
  for (const entry of entries) {
    const existing = groups.get(entry.marketId);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(entry.marketId, [entry]);
    }
  }
  return groups;
}

function toCoherenceGroup(marketId: string, members: readonly ManifestEntry[]): CoherenceGroup {
  const sum = members.reduce((total, entry) => total + probabilityValue(entry.forecast.blindProbability), 0);
  return {
    marketId,
    question: members[0]?.question ?? '',
    outcomeCount: members.length,
    absDelta: Math.abs(sum - 1),
  };
}

function summarize(groups: readonly CoherenceGroup[]): CoherenceDiagnostic {
  const meanAbsDelta = groups.length === 0 ? null : groups.reduce((sum, g) => sum + g.absDelta, 0) / groups.length;
  return { n: groups.length, groups, meanAbsDelta };
}

/** Groups of exactly two independently frozen outcomes for the same market. */
export function computeComplementaryCoherence(entries: readonly ManifestEntry[]): CoherenceDiagnostic {
  const groups = [...groupByMarketId(entries).entries()]
    .filter(([, members]) => members.length === 2)
    .map(([marketId, members]) => toCoherenceGroup(marketId, members));
  return summarize(groups);
}

/** Groups of three or more independently frozen outcomes for the same market. */
export function computeMultiOutcomeCoherence(entries: readonly ManifestEntry[]): CoherenceDiagnostic {
  const groups = [...groupByMarketId(entries).entries()]
    .filter(([, members]) => members.length >= 3)
    .map(([marketId, members]) => toCoherenceGroup(marketId, members));
  return summarize(groups);
}
