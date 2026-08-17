#!/usr/bin/env node
/**
 * `pnpm freeze [--n 30] [--max-horizon-days 21]`
 *
 * Freezes N unresolved, short-horizon markets with their forecasts into
 * `evaluation/MANIFEST.jsonl`, and writes its SHA-256 to
 * `evaluation/MANIFEST.sha256`. ADR-0007: this is the prospective, hashed
 * commitment that stands in for a backtest a training-data-contaminated LLM
 * cannot honestly produce (`docs/05-ai/EVALUATION.md` §B5).
 *
 * Runs under `tsx` (not plain `node --experimental-strip-types`, unlike
 * `scripts/record-fixtures.ts`): this script composes `@/polymarket` and
 * `@/ai`, both written with the `@/` path alias and extensionless relative
 * imports that only a bundler-aware loader resolves. `tsx` is the one new
 * dependency this task adds, for exactly that reason.
 *
 * Needs `ANTHROPIC_API_KEY` in the environment. If it is not set, this
 * prints one clean line naming what is missing and exits 1 — never a stack
 * trace, never a printed key.
 */
import process from 'node:process';

import { fetchBook, fetchSearch } from '@/polymarket';
import { AiClientError, createAnthropicTransport, sampleCountFromEnv } from '@/ai';
import {
  DEFAULT_MAX_HORIZON_DAYS,
  DEFAULT_UNIVERSE_N,
  defaultMarketSource,
  runFreeze,
  writeManifest,
} from '@/app/api/_manifest';

function parseIntFlag(argv: readonly string[], flag: string, fallback: number): number {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const raw = argv[index + 1];
  const parsed = raw === undefined ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be followed by a positive integer, got: ${String(raw)}`);
  }
  return parsed;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const n = parseIntFlag(argv, '--n', DEFAULT_UNIVERSE_N);
  const maxHorizonDays = parseIntFlag(argv, '--max-horizon-days', DEFAULT_MAX_HORIZON_DAYS);

  console.log(`pnpm freeze: universe rule n=${n}, max-horizon-days=${maxHorizonDays} (pre-registered, disclosed here as a deliberate choice).`);

  const transport = createAnthropicTransport();
  const marketSource = defaultMarketSource(fetchSearch);

  const report = await runFreeze(
    { n, maxHorizonDays },
    {
      marketSource,
      fetchBook,
      transport,
      now: Date.now(),
      k: sampleCountFromEnv(),
    },
  );

  const result = await writeManifest(report.entries);

  console.log(
    `Froze ${report.entries.length}/${n} requested (${report.candidatesConsidered} eligible candidates considered, ` +
      `${report.skipped.length} skipped).`,
  );
  for (const skip of report.skipped) {
    console.log(`  skipped ${skip.marketId}: ${skip.reason}`);
  }
  console.log(`Wrote ${result.manifestPath} (${result.entryCount} entries) and ${result.hashPath}.`);
  console.log(`sha256: ${result.sha256}`);

  if (report.entries.length === 0) {
    console.log('Manifest is empty. Reporting it as empty rather than as a failure.');
  }
}

main().catch((error: unknown) => {
  if (error instanceof AiClientError) {
    console.error(`pnpm freeze: ${error.message}`);
    process.exit(1);
  }
  console.error(`pnpm freeze failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
