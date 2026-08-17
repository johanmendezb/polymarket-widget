/**
 * T8.2: the resolution-free diagnostics computed from a frozen manifest
 * (T8.1). Every diagnostic type carries the sample or bin count it was
 * computed from as a first-class field — `docs/05-ai/EVALUATION.md` §B7/§B8
 * forbids a metric without one, and the UI renders `n` next to every number
 * rather than in a tooltip.
 */
import type { CostWaterfall } from '@/simulation';
import type { GateReason } from '@/domain';

export interface HistogramBin {
  readonly label: string;
  readonly count: number;
}

/** A binned distribution over a set of numeric values. `n` is the total count that produced the bins. */
export interface HistogramDiagnostic {
  readonly n: number;
  readonly bins: readonly HistogramBin[];
  readonly mean: number | null;
}

/** One market (or market group) whose outcome probabilities were compared for coherence. */
export interface CoherenceGroup {
  readonly marketId: string;
  readonly question: string;
  readonly outcomeCount: number;
  /** `|sum(blindProbability) - 1|` across the group. */
  readonly absDelta: number;
}

/**
 * `n` is the number of *groups* found, not the number of manifest entries — a market needs two
 * (complementary) or three-plus (multi-outcome) independently frozen outcomes to produce one
 * group, and today's `pnpm freeze` (T8.1) only ever freezes a single outcome per market. This
 * diagnostic is therefore honestly empty until freeze is extended to elicit more than one
 * outcome per market; see `report.ts`'s module doc.
 */
export interface CoherenceDiagnostic {
  readonly n: number;
  readonly groups: readonly CoherenceGroup[];
  readonly meanAbsDelta: number | null;
}

export interface GateReasonCount {
  readonly reason: GateReason;
  readonly count: number;
}

export interface GateHistogramDiagnostic {
  readonly n: number;
  readonly considerCount: number;
  readonly noBetCount: number;
  /** Every `GateReason`, zero-filled, so an unused reason is visibly zero rather than absent. */
  readonly reasonCounts: readonly GateReasonCount[];
}

export interface ManifestHashCheck {
  readonly sha256: string;
  readonly matchesFile: boolean;
  /** The hash read from `MANIFEST.sha256`, or `null` when that file does not exist yet. */
  readonly fileHash: string | null;
}

export type WaterfallDiagnostic =
  | {
      readonly available: true;
      readonly marketId: string;
      readonly question: string;
      readonly waterfall: CostWaterfall;
      readonly estimatedEdge: number;
      readonly fetchedAt: string;
    }
  | {
      readonly available: false;
      readonly reason: string;
    };

export interface DiagnosticsReport {
  readonly entryCount: number;
  readonly manifestHash: ManifestHashCheck | null;
  readonly complementaryCoherence: CoherenceDiagnostic;
  readonly multiOutcomeCoherence: CoherenceDiagnostic;
  readonly blindVsAnchoredDelta: HistogramDiagnostic;
  readonly sampleDispersion: HistogramDiagnostic;
  readonly disagreementDistribution: HistogramDiagnostic;
  readonly gateReasonHistogram: GateHistogramDiagnostic;
}
