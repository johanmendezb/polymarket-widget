import { describe, expect, it } from 'vitest';

import { computeGateReasonHistogram } from '@/app/api/_diagnostics/gateHistogram';
import { GATE_REASONS } from '@/domain';

import { fixtureManifestEntry } from './fixtures';

describe('computeGateReasonHistogram', () => {
  it('zero-fills every gate reason, including ones that never fired', () => {
    const entries = [fixtureManifestEntry({ gateVerdict: 'CONSIDER', gateReasons: [] })];
    const result = computeGateReasonHistogram(entries);
    expect(result.reasonCounts).toHaveLength(GATE_REASONS.length);
    expect(result.reasonCounts.every((r) => r.count === 0)).toBe(true);
    expect(result.considerCount).toBe(1);
    expect(result.noBetCount).toBe(0);
    expect(result.n).toBe(1);
  });

  it('counts every reason that fired, across NO_BET entries with multiple reasons', () => {
    const entries = [
      fixtureManifestEntry({ marketId: '1', gateVerdict: 'NO_BET', gateReasons: ['EDGE_BELOW_COST', 'SPREAD_TOO_WIDE'] }),
      fixtureManifestEntry({ marketId: '2', gateVerdict: 'NO_BET', gateReasons: ['EDGE_BELOW_COST'] }),
      fixtureManifestEntry({ marketId: '3', gateVerdict: 'CONSIDER', gateReasons: [] }),
    ];
    const result = computeGateReasonHistogram(entries);
    expect(result.considerCount).toBe(1);
    expect(result.noBetCount).toBe(2);
    expect(result.reasonCounts.find((r) => r.reason === 'EDGE_BELOW_COST')?.count).toBe(2);
    expect(result.reasonCounts.find((r) => r.reason === 'SPREAD_TOO_WIDE')?.count).toBe(1);
    expect(result.reasonCounts.find((r) => r.reason === 'THIN_EVIDENCE')?.count).toBe(0);
  });
});
