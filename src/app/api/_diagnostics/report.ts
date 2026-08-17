/**
 * Composes the six resolution-free diagnostics (`docs/05-ai/EVALUATION.md` §B7, task T8.2) from
 * a manifest's raw text. Pure and synchronous — no filesystem, no network — so it is fully unit
 * testable; `src/app/diagnostics/page.tsx` is the one place that reads `MANIFEST.jsonl` /
 * `MANIFEST.sha256` off disk and hands their text to this function. The cost-waterfall diagnostic
 * (`waterfall.ts`) is deliberately not composed here: it needs a live book and market fetch,
 * which this module has no dependency on.
 */
import { parseJsonl } from '../_manifest/serialize';
import type { ManifestEntry } from '../_manifest/types';
import { computeComplementaryCoherence, computeMultiOutcomeCoherence } from './coherence';
import { computeBlindVsAnchoredDelta } from './delta';
import { computeDisagreementDistribution } from './disagreement';
import { computeSampleDispersion } from './dispersion';
import { computeGateReasonHistogram } from './gateHistogram';
import { checkManifestHash } from './hashCheck';
import type { DiagnosticsReport } from './types';

/**
 * `manifestText` / `hashFileText` are the raw bytes of `MANIFEST.jsonl` / `MANIFEST.sha256`
 * (empty string when either file does not exist yet — `readTextOrEmpty`'s contract, T8.1). An
 * entirely empty manifest reports `manifestHash: null` rather than the hash of an empty string,
 * so the empty state reads as "nothing frozen yet" and not as a tamper-check failure.
 */
export function buildDiagnosticsReport(manifestText: string, hashFileText: string): DiagnosticsReport {
  const entries = parseJsonl<ManifestEntry>(manifestText);
  const manifestHash =
    entries.length === 0 && hashFileText.trim().length === 0 ? null : checkManifestHash(manifestText, hashFileText);

  return {
    entryCount: entries.length,
    manifestHash,
    complementaryCoherence: computeComplementaryCoherence(entries),
    multiOutcomeCoherence: computeMultiOutcomeCoherence(entries),
    blindVsAnchoredDelta: computeBlindVsAnchoredDelta(entries),
    sampleDispersion: computeSampleDispersion(entries),
    disagreementDistribution: computeDisagreementDistribution(entries),
    gateReasonHistogram: computeGateReasonHistogram(entries),
  };
}
