/**
 * A small fixed-edge bucketing helper shared by every distribution
 * diagnostic in T8.2. Pure and total: an empty input produces zero-count
 * bins and a `null` mean, never `NaN` and never a thrown error, so an empty
 * manifest renders an honest empty histogram rather than a blank panel.
 */
import type { HistogramBin, HistogramDiagnostic } from './types';

/**
 * `edges` has length `labels.length + 1` and is ascending; `edges[0]` and the last edge should
 * cover the full possible range (use `-Infinity`/`Infinity` for open-ended tails) so every value
 * lands in exactly one bin. A value equal to an interior edge falls into the higher bin.
 */
export function bucketize(values: readonly number[], edges: readonly number[], labels: readonly string[]): HistogramDiagnostic {
  if (edges.length !== labels.length + 1) {
    throw new Error('bucketize: edges must have exactly one more entry than labels.');
  }

  const counts = new Array<number>(labels.length).fill(0);
  for (const value of values) {
    let binIndex = labels.length - 1;
    for (let i = 0; i < labels.length; i += 1) {
      const lower = edges[i] ?? -Infinity;
      const upper = edges[i + 1] ?? Infinity;
      if (value >= lower && value < upper) {
        binIndex = i;
        break;
      }
    }
    counts[binIndex] = (counts[binIndex] ?? 0) + 1;
  }

  const bins: HistogramBin[] = labels.map((label, i) => ({ label, count: counts[i] ?? 0 }));
  const mean = values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;

  return { n: values.length, bins, mean };
}
