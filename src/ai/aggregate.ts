import { asProbability, probabilityValue, type Probability } from '@/domain';

/**
 * Keeps a probability strictly inside (0, 1) before it crosses into log-odds
 * space. `ln(p / (1-p))` is +/-Infinity at the boundary, and a model can
 * legitimately return exactly 0 or 1 (the tool schema allows it). Any value
 * this small changes the log-odds by an amount no aggregation downstream can
 * distinguish from the unclamped extreme, so the clamp does not bias the
 * result in any way that matters.
 */
const LOGIT_EPSILON = 1e-9;

function clampAwayFromBoundary(value: number): number {
  return Math.min(1 - LOGIT_EPSILON, Math.max(LOGIT_EPSILON, value));
}

/** `ln(p / (1-p))`. Clamps first so the boundary never produces Infinity. */
export function toLogOdds(probability: number): number {
  const clamped = clampAwayFromBoundary(probability);
  return Math.log(clamped / (1 - clamped));
}

/** The inverse of {@link toLogOdds}. Always lands back inside [0, 1]. */
export function fromLogOdds(logOdds: number): Probability {
  return asProbability(1 / (1 + Math.exp(-logOdds)));
}

function medianOfSorted(sortedValues: readonly number[]): number {
  const n = sortedValues.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 0) {
    return (sortedValues[mid - 1]! + sortedValues[mid]!) / 2;
  }
  return sortedValues[mid]!;
}

/**
 * Tukey's hinges: split the sorted set around the median (excluding it on an
 * odd count), then IQR is the median of the upper half minus the median of
 * the lower half. Chosen over the interpolated (numpy-default) method because
 * it stays exactly hand-computable for the k=5 case this project runs.
 *
 * A single sample has no spread by definition: IQR is 0.
 */
export function interquartileRange(values: readonly number[]): number {
  if (values.length <= 1) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = n % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);

  return medianOfSorted(upperHalf) - medianOfSorted(lowerHalf);
}

/** Median of the raw values (not log-odds). Exposed for the aggregate below. */
function median(values: readonly number[]): number {
  return medianOfSorted([...values].sort((a, b) => a - b));
}

export interface BlindAggregate {
  /** Median of the samples' log-odds, converted back to a probability. */
  readonly blindProbability: Probability;
  /** IQR of the samples' log-odds. Stays in log-odds space; never converted back. */
  readonly dispersion: number;
  readonly samples: readonly Probability[];
}

/**
 * Median of log-odds, with dispersion as the IQR of the same log-odds values.
 * Median is used, not the mean, so a single outlier sample cannot drag the
 * estimate; the outlier still shows up in the dispersion, which is the
 * point - see `docs/05-ai/AI_SYSTEM.md` §3.
 *
 * @throws Error when `samples` is empty; there is nothing to aggregate.
 */
export function aggregateBlindSamples(samples: readonly Probability[]): BlindAggregate {
  if (samples.length === 0) {
    throw new Error('aggregateBlindSamples requires at least one sample');
  }

  const logOdds = samples.map((sample) => toLogOdds(probabilityValue(sample)));
  const sortedLogOdds = [...logOdds].sort((a, b) => a - b);

  return {
    blindProbability: fromLogOdds(median(sortedLogOdds)),
    dispersion: interquartileRange(logOdds),
    samples,
  };
}
