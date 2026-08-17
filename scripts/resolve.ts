#!/usr/bin/env node
/**
 * `pnpm resolve`
 *
 * Verifies `evaluation/MANIFEST.jsonl` against its committed
 * `evaluation/MANIFEST.sha256` before touching anything, refuses loudly on a
 * mismatch, then fills outcomes for markets that have since resolved into
 * `evaluation/OUTCOMES.jsonl` — a separate, append-only file. Never edits a
 * frozen forecast. No network is required to read the files; fetching each
 * market's current status does require it, but nothing here needs
 * `ANTHROPIC_API_KEY`.
 */
import process from 'node:process';

import { fetchMarket } from '@/polymarket';
import {
  DEFAULT_HASH_PATH,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_OUTCOMES_PATH,
  appendOutcomes,
  readTextOrEmpty,
  runResolve,
} from '@/app/api/_manifest';

async function main(): Promise<void> {
  const manifestText = await readTextOrEmpty(DEFAULT_MANIFEST_PATH);
  if (manifestText.length === 0) {
    console.log(`${DEFAULT_MANIFEST_PATH} does not exist or is empty. Nothing to resolve. Run pnpm freeze first.`);
    return;
  }

  const hashFileText = await readTextOrEmpty(DEFAULT_HASH_PATH);
  const existingOutcomesText = await readTextOrEmpty(DEFAULT_OUTCOMES_PATH);

  const result = await runResolve({
    manifestText,
    hashFileText,
    existingOutcomesText,
    resolutionSource: { fetchMarketStatus: async (marketId) => (await fetchMarket(marketId)).data },
    now: Date.now(),
  });

  if (result.kind === 'hash_mismatch') {
    console.error(
      `pnpm resolve: ${DEFAULT_MANIFEST_PATH} does not match ${DEFAULT_HASH_PATH}. Refusing to proceed.\n` +
        `  expected: ${result.expectedHash}\n` +
        `  actual:   ${result.actualHash}\n` +
        'The manifest has been modified since it was frozen and hashed. This is a loud failure, not a warning.',
    );
    process.exit(1);
  }

  await appendOutcomes(result.newOutcomesJsonl);

  const { report } = result;
  console.log(
    `Frozen: ${report.frozenCount}. ` +
      `Already resolved (from a prior run): ${report.alreadyResolvedCount}. ` +
      `Newly resolved this run: ${report.newlyResolvedCount}. ` +
      `Still open: ${report.stillOpenCount}.`,
  );
  if (report.frozenCount === 0) {
    console.log('Manifest is empty. Reporting it as empty rather than as a failure.');
  }
}

main().catch((error: unknown) => {
  console.error(`pnpm resolve failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
