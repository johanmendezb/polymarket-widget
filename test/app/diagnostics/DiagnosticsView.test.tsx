/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildDiagnosticsReport } from '@/app/api/_diagnostics/report';
import { sha256Hex } from '@/app/api/_manifest/hash';
import { serializeJsonl } from '@/app/api/_manifest/serialize';
import { DiagnosticsView } from '@/app/diagnostics/DiagnosticsView';

import { fixtureManifestEntry } from '../api/_diagnostics/fixtures';

// No `@testing-library/jest-dom` in this project's devDependencies — assert
// via plain RTL query results (`getByText` already throws if nothing
// matches) and DOM API checks instead of adding a new dependency for this.
const FORBIDDEN_PHRASES = [/beats? the market/i, /outperforms? the market/i, /proven accurate/i, /guaranteed/i];

describe('DiagnosticsView', () => {
  it('renders an honest empty state with the sample size stated (acceptance criterion 4)', () => {
    const report = buildDiagnosticsReport('', '');
    render(<DiagnosticsView report={report} waterfall={null} />);

    expect(screen.getByText(/N = 0 frozen forecasts/)).toBeTruthy();
    expect(screen.getByText(/No forecasts have been frozen yet/)).toBeTruthy();
    expect(screen.queryByText(/SHA-256:/)).toBeNull();
  });

  it('shows the manifest hash and a match indicator (acceptance criterion 3)', () => {
    const entries = [fixtureManifestEntry()];
    const manifestText = serializeJsonl(entries);
    const hashFileText = `${sha256Hex(manifestText)}\n`;
    const report = buildDiagnosticsReport(manifestText, hashFileText);

    render(<DiagnosticsView report={report} waterfall={null} />);

    expect(screen.getByText(new RegExp(sha256Hex(manifestText)))).toBeTruthy();
    expect(screen.getByText(/matches MANIFEST\.sha256/)).toBeTruthy();
  });

  it('renders every diagnostic with a visible sample count and a methodology disclosure (acceptance criteria 1-2)', () => {
    const entries = [fixtureManifestEntry()];
    const report = buildDiagnosticsReport(serializeJsonl(entries), '');

    render(<DiagnosticsView report={report} waterfall={null} />);

    for (const heading of [
      'Complementary coherence',
      'Multi-outcome coherence',
      'Blind-vs-anchored delta',
      'Sample dispersion',
      'Disagreement distribution',
      'Gate reason histogram',
      'Cost waterfall',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    }
    // One "How this is computed" disclosure per panel (7 panels).
    expect(screen.getAllByText('How this is computed')).toHaveLength(7);
  });

  it('never states or implies the system beats the market, anywhere in the rendered text (acceptance criterion 5)', () => {
    const entries = [fixtureManifestEntry()];
    const report = buildDiagnosticsReport(serializeJsonl(entries), '');
    const { container } = render(<DiagnosticsView report={report} waterfall={null} />);

    const text = container.textContent ?? '';
    for (const pattern of FORBIDDEN_PHRASES) {
      expect(text).not.toMatch(pattern);
    }
  });

  it('renders an honest unavailable state for the cost waterfall on an upstream failure', () => {
    const report = buildDiagnosticsReport('', '');
    render(<DiagnosticsView report={report} waterfall={{ available: false, reason: 'network unreachable' }} />);

    expect(screen.getByText(/Could not fetch live data.*network unreachable/)).toBeTruthy();
  });
});
