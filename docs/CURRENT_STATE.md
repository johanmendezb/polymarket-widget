# CURRENT_STATE

```yaml
phase: PHASE_2_DELIVERED
milestone: M3_ALL_EPICS_MERGED
health: GREEN
deadline: none (the 48h clock in ROADMAP.md is a narrative frame; owner confirmed quality beats speed)
t0: 2026-08-15
active_epic: none - all nine merged
active_task: none
blocked_by: []
last_completed: E9 (all nine epics on main, staging verified with a real model call)
next_action: Two owner actions remain, neither blocking - paste the master orchestrator prompt into prompts/build/00-master-orchestrator.md, and set the Render health check path to /api/health. Before any demo, run pnpm warm and raise AI_SAMPLES/AI_ANCHORED back up.
critical_risks:
  - R-01 anchoring collapse - the blind-vs-anchored check is currently OFF on staging (AI_ANCHORED=0) to save credit
  - R-03 fee shown without the taker fee - mitigated, category fallback labelled estimated
open_decisions: []
tests_status: GREEN_455_UNIT_14_E2E_12_LIVE (src/simulation at 100% branch coverage)
deployment_status: LIVE https://polymarket-widget.onrender.com serving main, real forecast verified 2026-08-17
environment: staging_only_render
awaiting_qa: []
assumed_accepted: [E1, E2, E3, E6]
owner_accepted: [E4, E5, E7, E8, E9]
```

---

## Where the project actually is

Three epics are merged to `main` and the widget is deployed and reachable at
https://polymarket-widget.onrender.com.

**E1 Foundation.** Next.js 15 App Router, TypeScript strict with `noUncheckedIndexedAccess`,
Tailwind v4, Vitest, Playwright, the module barrels, `/api/health`. CI runs typecheck, lint,
test, build, `pnpm audit` and a secret-leak scan on every push and pull request, behind one
aggregate `ci` check that branch protection requires. Real Gamma and CLOB responses are recorded
in `test/fixtures/`, dated, with `pnpm test:live` re-verifying them against production outside CI.

**E2 Domain and simulation.** Opaque branded primitives where `probability * price` is a compile
error rather than a silent wrong number. `walkBook`, `computeFee`, `computeEdge`, `kellyFraction`
and the 11-rule abstention gate, all pure. **`src/simulation` is at 100% branch coverage.**

**E3 Read path.** zod schemas at the one upstream boundary, mappers to domain types, an in-memory
cache with per-route TTL and request coalescing, and the four proxy routes, each covering six
integration scenarios against MSW fixtures.

**In flight on branches:** T4.1 widget shell, T5.1 blind prompt assembly, T5.2 Anthropic client
and k-sampling. T4.2-T4.5 and T5.3 are being built now.

## What the live API corrected, and why it matters

Five claims written before any code existed turned out to be wrong. All were caught by the
contract spike before the read path was written, and two of them were the orchestrator's own
errors caught by workers who checked rather than complied.

| Claim | Reality |
|---|---|
| Both book sides arrive descending | Asks descending, **bids ascending**. Both arrive worst-price-first, so `mapOrderBook` reverses **both**. |
| Grepping `.next/static` for `ANTHROPIC` catches a leak | It cannot. Next inlines `NEXT_PUBLIC_*` as the *value*, so the name never reaches the bundle, and in CI with no key set it inlines as `undefined`. |
| A missing `User-Agent` returns 403 | No. `Python-urllib/<version>` specifically is blocked; no UA at all is fine. |
| The hosts send no CORS headers | They send `Access-Control-Allow-Origin: *`, but only when an `Origin` header is present. |
| Per-market fee fields are populated | Usually absent. The category fallback is the common path, so an absent field must never become a zero rate. |

**The bids one is the dangerous one.** An unreversed `bids[0]` holds the worst bid, so the spread
reads as enormous and the abstention gate rejects healthy markets — while nothing throws and the
crossed-book invariant I1 still passes, because `0.008 >= 0.001` is true. Only a narrow-spread
test catches it, and there is one, plus a regression test proving the raw array would fail it.

## Deployment failures already paid for

- **The first deploy 502'd while reporting itself healthy.** `scripts/start.mjs` read its bind
  address from `process.env.HOSTNAME`, which containers set to the machine's name and most images
  map to `127.0.0.1`. Green build, healthy process, "live" deploy, loopback-only listener. Now
  hardcodes `0.0.0.0` with `BIND_HOST` as the override.
- **The runtime prompts would not have survived a standalone build.** They are read by a path
  built at runtime, which Next's tracing cannot see, and the loader resolved them relative to its
  own module — which under `output: 'standalone'` sits inside `.next/server/`. Fixed three ways:
  `process.cwd()` anchoring, a copy in `start.mjs`, and `outputFileTracingIncludes`.

Both classes of bug work locally and fail only in the packaged output, which is exactly why
ROADMAP.md insists on deploying a skeleton early.

## Open owner actions

- Paste the master orchestrator prompt into `prompts/build/00-master-orchestrator.md`. Gates the
  E9 prompt deliverable and nothing earlier.
- In the Render dashboard: set the health check path to `/api/health`, and enter
  `ANTHROPIC_API_KEY`. The MCP can create a service but has no update-service call. The key is
  needed from E5's forecast route onward.

## Update protocol

Update this file whenever any of the following changes: phase, milestone, active task, blockers, test status, deployment status, or the risk register's top three. Do not update it for routine commits.
