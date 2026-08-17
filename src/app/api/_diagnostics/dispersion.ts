/**
 * Sample dispersion, `docs/05-ai/EVALUATION.md` §B7 row 4: the IQR of each entry's k blind
 * log-odds samples (`forecast.dispersion`, already computed by `@/ai`'s `aggregateBlindSamples`
 * at freeze time). Wide dispersion is the documented signal the abstention gate's
 * `HIGH_DISPERSION_THRESHOLD` acts on — this histogram is where that threshold becomes visible
 * across the whole frozen set instead of one market at a time.
 */
import { HIGH_DISPERSION_THRESHOLD } from '@/simulation';

import type { ManifestEntry } from '../_manifest/types';
import { bucketize } from './histogram';
import type { HistogramDiagnostic } from './types';

const EDGES = [0, 0.05, 0.1, HIGH_DISPERSION_THRESHOLD, 0.3, Infinity];
const LABELS = ['0.00-0.05', '0.05-0.10', `0.10-${HIGH_DISPERSION_THRESHOLD}`, `${HIGH_DISPERSION_THRESHOLD}-0.30`, '0.30+'];

export function computeSampleDispersion(entries: readonly ManifestEntry[]): HistogramDiagnostic {
  const values = entries.map((entry) => entry.forecast.dispersion);
  return bucketize(values, EDGES, LABELS);
}
