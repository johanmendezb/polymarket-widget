// T8.2: resolution-free diagnostics. `src/app/diagnostics/page.tsx` is the only caller.
export { bucketize } from './histogram';
export { computeComplementaryCoherence, computeMultiOutcomeCoherence } from './coherence';
export { computeBlindVsAnchoredDelta } from './delta';
export { computeSampleDispersion } from './dispersion';
export { computeDisagreementDistribution } from './disagreement';
export { computeGateReasonHistogram } from './gateHistogram';
export { checkManifestHash } from './hashCheck';
export { buildDiagnosticsReport } from './report';
export { computeLiveCostWaterfall, pickWaterfallEntry, type WaterfallDeps } from './waterfall';
export type {
  CoherenceDiagnostic,
  CoherenceGroup,
  DiagnosticsReport,
  GateHistogramDiagnostic,
  GateReasonCount,
  HistogramBin,
  HistogramDiagnostic,
  ManifestHashCheck,
  WaterfallDiagnostic,
} from './types';
