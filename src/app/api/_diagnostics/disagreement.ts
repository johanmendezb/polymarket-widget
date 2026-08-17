/**
 * Disagreement distribution, `docs/05-ai/EVALUATION.md` §B7 row 5: `p̂_blind - mid` across the
 * frozen set. A spike at zero is the honest reading "no signal"; fat tails read as overconfidence
 * — INFERRED grounding per §B7, stated as such in the UI's methodology disclosure, not as a
 * verified claim.
 */
import { priceToProbability, probabilityValue } from '@/domain';

import type { ManifestEntry } from '../_manifest/types';
import { bucketize } from './histogram';
import type { HistogramDiagnostic } from './types';

const EDGES = [-Infinity, -0.2, -0.1, -0.05, 0.05, 0.1, 0.2, Infinity];
const LABELS = ['< -0.20', '-0.20 to -0.10', '-0.10 to -0.05', '-0.05 to 0.05', '0.05 to 0.10', '0.10 to 0.20', '> 0.20'];

export function computeDisagreementDistribution(entries: readonly ManifestEntry[]): HistogramDiagnostic {
  const values = entries.map((entry) => {
    const mid = probabilityValue(priceToProbability(entry.marketPriceAtFreeze));
    return probabilityValue(entry.forecast.blindProbability) - mid;
  });
  return bucketize(values, EDGES, LABELS);
}
