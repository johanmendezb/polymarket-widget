// T8.1/T8.3: the freeze/resolve CLI's testable core. `src/app/api` is the
// one module allowed to import everything (ARCHITECTURE.md §3), which this
// needs: `@/polymarket` for market data, `@/ai` for the forecast pipeline.

export {
  DEFAULT_MAX_HORIZON_DAYS,
  DEFAULT_UNIVERSE_N,
  checkUnresolvedShortHorizon,
  dedupeAndSortCandidates,
  selectFreezeUniverse,
} from './universe';
export type { HorizonOptions, UnresolvedRefusalReason, UnresolvedShortHorizonCheck } from './universe';

export { DEFAULT_UNIVERSE_SEED_QUERIES, defaultMarketSource } from './marketSource';
export type { MarketCandidateSource, SearchFn } from './marketSource';

export { runFreeze } from './freeze';
export type { FreezeDeps, FreezeOptions, FreezeReport, FreezeSkip } from './freeze';

export { inferResolvedOutcome, runResolve } from './resolve';
export type { ResolutionSource, ResolutionStatus, ResolveDeps, ResolveReport, ResolveResult } from './resolve';

export { sha256Hex } from './hash';
export { parseJsonl, serializeJsonl } from './serialize';

export {
  DEFAULT_HASH_PATH,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_OUTCOMES_PATH,
  appendOutcomes,
  readTextOrEmpty,
  writeManifest,
} from './persistence';
export type { WriteManifestResult } from './persistence';

export type { ManifestEntry, OutcomeEntry, ResolvedOutcome } from './types';
