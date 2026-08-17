import { describe, expect, it } from 'vitest';

import { buildDiagnosticsReport } from '@/app/api/_diagnostics/report';
import { sha256Hex } from '@/app/api/_manifest/hash';
import { serializeJsonl } from '@/app/api/_manifest/serialize';

import { fixtureManifestEntry } from './fixtures';

describe('buildDiagnosticsReport', () => {
  it('renders an honest empty state for an empty manifest: entryCount 0, no fabricated hash', () => {
    const report = buildDiagnosticsReport('', '');
    expect(report.entryCount).toBe(0);
    expect(report.manifestHash).toBeNull();
    expect(report.complementaryCoherence).toEqual({ n: 0, groups: [], meanAbsDelta: null });
    expect(report.gateReasonHistogram.n).toBe(0);
  });

  it('reports every diagnostic\'s n against a small manifest, and the displayed hash matches the file (acceptance criterion 3)', () => {
    const entries = [fixtureManifestEntry({ marketId: '1' }), fixtureManifestEntry({ marketId: '2' })];
    const manifestText = serializeJsonl(entries);
    const hashFileText = `${sha256Hex(manifestText)}\n`;

    const report = buildDiagnosticsReport(manifestText, hashFileText);

    expect(report.entryCount).toBe(2);
    expect(report.manifestHash?.matchesFile).toBe(true);
    expect(report.manifestHash?.sha256).toBe(sha256Hex(manifestText));
    expect(report.sampleDispersion.n).toBe(2);
    expect(report.disagreementDistribution.n).toBe(2);
    expect(report.gateReasonHistogram.n).toBe(2);
  });

  it('surfaces a hash mismatch rather than hiding it', () => {
    const entries = [fixtureManifestEntry()];
    const manifestText = serializeJsonl(entries);
    const report = buildDiagnosticsReport(manifestText, 'not-the-real-hash\n');
    expect(report.manifestHash?.matchesFile).toBe(false);
  });
});
