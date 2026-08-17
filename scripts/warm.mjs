#!/usr/bin/env node
/**
 * Wake the Render staging service and wait until it answers warm.
 *
 * The free tier spins down after ~15 minutes idle and the next request takes
 * tens of seconds. That is documented in ADR-0015, not a defect, and it is
 * deliberately NOT worked around with a keep-alive pinger. What it does mean is
 * that sending a reviewer to a cold URL wastes a whole QA cycle on the hosting
 * tier, so this runs before any handover or demo.
 *
 *   pnpm warm                      # uses STAGING_URL
 *   pnpm warm https://other.url    # or an explicit one
 *
 * Exits 0 once /api/health answers 200. Exits 1 if it never does, so it can
 * gate a delivery step in CI or a script.
 */
import process from 'node:process';

const target =
  process.argv[2] ??
  process.env.STAGING_URL ??
  'https://polymarket-widget.onrender.com';

const url = new URL('/api/health', target).toString();
const deadlineMs = Number(process.env.WARM_TIMEOUT_MS ?? 180_000);
const startedAt = Date.now();

const elapsed = () => ((Date.now() - startedAt) / 1000).toFixed(1);

console.log(`warming ${url}`);

let attempt = 0;
for (;;) {
  attempt += 1;
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'polymarket-second-opinion-warm/0.1' },
      signal: AbortSignal.timeout(30_000),
    });

    if (response.ok) {
      const body = await response.json();
      // uptimeSeconds is the cold-start tell: a small number means the instance
      // woke for this very request.
      const uptime = body?.uptimeSeconds;
      const woke = typeof uptime === 'number' && uptime < 30;
      console.log(
        `warm after ${elapsed()}s and ${attempt} request(s). ` +
          `commit=${body?.commit ?? 'unknown'} uptimeSeconds=${uptime ?? 'unknown'}` +
          (woke ? ' (the instance just woke, so this was a cold start)' : ''),
      );
      process.exit(0);
    }

    console.log(`  attempt ${attempt}: HTTP ${response.status} after ${elapsed()}s`);
  } catch (error) {
    // A cold Render instance refuses or times out the first requests. That is
    // the expected path, not an error worth surfacing loudly.
    const reason = error instanceof Error ? error.name : 'unknown';
    console.log(`  attempt ${attempt}: not up yet (${reason}) after ${elapsed()}s`);
  }

  if (Date.now() - startedAt > deadlineMs) {
    console.error(
      `still not warm after ${elapsed()}s. The service may be failing to boot ` +
        `rather than merely cold; check the Render logs and /api/health.`,
    );
    process.exit(1);
  }

  await new Promise((resolve) => setTimeout(resolve, 3_000));
}
