/**
 * Gate reason histogram, `docs/05-ai/EVALUATION.md` §B7 row 7: which of the 11 abstention rules
 * (`@/simulation`'s `evaluateGate`) actually fire, and how often, across the frozen set. An
 * all-`CONSIDER` result would mean the gate is decorative — this is the number that would show it.
 */
import { GATE_REASONS, type GateReason } from '@/domain';

import type { ManifestEntry } from '../_manifest/types';
import type { GateHistogramDiagnostic, GateReasonCount } from './types';

export function computeGateReasonHistogram(entries: readonly ManifestEntry[]): GateHistogramDiagnostic {
  const counts = new Map<GateReason, number>(GATE_REASONS.map((reason) => [reason, 0]));
  let considerCount = 0;
  let noBetCount = 0;

  for (const entry of entries) {
    if (entry.gateVerdict === 'CONSIDER') considerCount += 1;
    else noBetCount += 1;

    for (const reason of entry.gateReasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }

  const reasonCounts: GateReasonCount[] = GATE_REASONS.map((reason) => ({ reason, count: counts.get(reason) ?? 0 }));

  return { n: entries.length, considerCount, noBetCount, reasonCounts };
}
