/**
 * `GET /diagnostics` — T8.2. The only place that reads `MANIFEST.jsonl` /
 * `MANIFEST.sha256` off disk and, when there is at least one frozen entry,
 * fetches live upstream data for the cost-waterfall illustration. Everything
 * else is pure composition through `@/app/api/_diagnostics` and
 * `DiagnosticsView`.
 */
import type { ReactElement } from 'react';

import { fetchBook, fetchMarket } from '@/polymarket';

import { buildDiagnosticsReport, computeLiveCostWaterfall, pickWaterfallEntry, type WaterfallDiagnostic } from '../api/_diagnostics';
import { DEFAULT_HASH_PATH, DEFAULT_MANIFEST_PATH, parseJsonl, readTextOrEmpty } from '../api/_manifest';
import type { ManifestEntry } from '../api/_manifest';
import { DiagnosticsView } from './DiagnosticsView';

export const dynamic = 'force-dynamic';

export default async function DiagnosticsPage(): Promise<ReactElement> {
  const [manifestText, hashFileText] = await Promise.all([
    readTextOrEmpty(DEFAULT_MANIFEST_PATH),
    readTextOrEmpty(DEFAULT_HASH_PATH),
  ]);

  const report = buildDiagnosticsReport(manifestText, hashFileText);

  let waterfall: WaterfallDiagnostic | null = null;
  if (report.entryCount > 0) {
    const entries = parseJsonl<ManifestEntry>(manifestText);
    const entry = pickWaterfallEntry(entries);
    if (entry !== null) {
      waterfall = await computeLiveCostWaterfall(entry, { fetchMarket, fetchBook, now: Date.now() });
    }
  }

  return <DiagnosticsView report={report} waterfall={waterfall} />;
}
