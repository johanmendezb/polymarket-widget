/**
 * Blind-vs-anchored delta, `docs/05-ai/EVALUATION.md` §B7 row 3: `|p̂_blind - p̂_shown_price|`.
 * A delta near zero across the set is evidence the "blind" elicitation is actually echoing the
 * price it was never supposed to see (risk R-01) — this diagnostic makes that checkable without
 * a single resolved outcome.
 *
 * Only entries that ran the optional anchored diagnostic (`forecast.anchoredProbability !==
 * null`) contribute; `n` on the returned histogram reflects that narrower count, not the full
 * manifest size.
 */
import { probabilityValue, type Probability } from '@/domain';

import type { ManifestEntry } from '../_manifest/types';
import { bucketize } from './histogram';
import type { HistogramDiagnostic } from './types';

const EDGES = [0, 0.02, 0.05, 0.1, 0.2, Infinity];
const LABELS = ['0.00-0.02', '0.02-0.05', '0.05-0.10', '0.10-0.20', '0.20+'];

function hasAnchoredProbability(entry: ManifestEntry): entry is ManifestEntry & {
  readonly forecast: ManifestEntry['forecast'] & { readonly anchoredProbability: Probability };
} {
  return entry.forecast.anchoredProbability !== null;
}

export function computeBlindVsAnchoredDelta(entries: readonly ManifestEntry[]): HistogramDiagnostic {
  const deltas = entries
    .filter(hasAnchoredProbability)
    .map((entry) => Math.abs(probabilityValue(entry.forecast.anchoredProbability) - probabilityValue(entry.forecast.blindProbability)));

  return bucketize(deltas, EDGES, LABELS);
}
