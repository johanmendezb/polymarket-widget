# DELIVERY - E1 Foundation and live-API contract

**PR:** #1 (plus #2, rework)
**Branch:** `epic/e1-foundation`
**Staging:** https://polymarket-widget.onrender.com
**Submitted:** T0 + ~2h working time
**Status:** ACCEPTED (auto-merge epic, no user-visible surface — see the acceptance note)

---

## What was delivered

A repository that installs, typechecks, lints, tests, builds and deploys from a clean clone, and
a public URL that serves it. Plus proof that the live Polymarket read path behaves the way the
research said it does — recorded as dated fixtures that every later epic now tests against
instead of touching the network.

There is no user-visible feature here on purpose. The value is that everything after this has a
green pipeline, a working deploy and a set of real upstream responses to build against.

| Requirement | Status | Where |
|---|---|---|
| T1.1 scaffold, strict TS, module barrels, import-boundary rule | done | `src/`, `eslint.config.mjs` |
| T1.2 CI: typecheck, lint, test, build, audit, secret-leak | done | `.github/workflows/ci.yml` |
| T1.3 Render service, `pnpm warm`, branch protection | done | `scripts/warm.mjs`, `scripts/start.mjs` |
| T1.4 fixtures and live contract suite | done | `test/fixtures/`, `pnpm test:live` |

## How to verify in 5 minutes

The service sleeps after ~15 minutes idle, so step 1 always comes first.

1. Run `pnpm warm`. Expect it to report `warm after …s`, a commit SHA, and `uptimeSeconds`. A
   value under 30 means the instance woke for your request — that is the documented cold start
   (ADR-0015), not a fault.
2. Open https://polymarket-widget.onrender.com/api/health. Expect
   `{"status":"ok","commit":"<sha>","uptimeSeconds":n}` where `<sha>` matches the head of `main`.
3. Open https://polymarket-widget.onrender.com/. Expect a plain page reading "Second Opinion" and
   "Scaffold only". There is deliberately no widget yet.
4. Open the CI run on the latest commit to `main`. Expect six green checks: typecheck, lint,
   test, build, audit, and the aggregate `ci`.
5. Try to push directly to `main`. Expect rejection — protection requires a PR, the `ci` check
   and one approving review.

## Test evidence

| Suite | Count | Result | Time |
|---|---|---|---|
| Unit | 18 | pass | 0.7s |
| E2E (Playwright, local) | 1 | pass | ~2s |
| Live contract (`pnpm test:live`, excluded from CI) | 12 assertions | pass | ~5s |
| typecheck | — | 0 errors | — |
| lint | — | 0 errors, 0 warnings | — |

Import boundary proven by committing a probe importing `@/polymarket` from `src/domain`,
capturing the real `import/no-restricted-paths` failure, then deleting it. Five boundary
assertions also run as unit tests. `PORT` binding proven on 3000, 4567 and 4599 locally, and on
Render's 10000 in production.

Secret-leak check: pass. Both CI failure modes proven with real red runs, then reverted — a
deliberate type error, and a deliberate `NEXT_PUBLIC_ANTHROPIC_API_KEY` reference using an
obvious dummy value that was never shaped like a real key.

## Decisions taken during this epic

- **All dependencies installed up front in T1.1**, including ones nothing uses yet. Four workers
  then built `simulation`, `polymarket`, `ui` and `ai` in parallel without colliding on
  `package.json`, which is otherwise the one file they would all have touched.
- **Tailwind v4**, which is CSS-first and has no `tailwind.config.ts`. The T1.1 contract listed
  one; corrected in the same commit as the code.
- **Service named `polymarket-widget`**, not `polymarket-widget-staging`. One environment, no
  ambiguity, shorter URL.
- **`pnpm audit` fails only on a critical advisory.** Today's are all transitive through `next`
  and unfixable from here. A job that is red on `main` from day one teaches nobody to read it.

## Four things that were wrong before any code existed

The contract spike earned its 60 minutes several times over. All four were caught before a line
of the read path was written.

1. **Bids arrive ascending, not descending.** The domain model said both book sides arrived
   descending. Asks do; bids do not. Both actually arrive *worst-price-first*, so the best level
   is the last element of each and `mapOrderBook` must reverse both. Getting asks wrong prices
   every buy at 99¢ instead of 45¢ — loud. Getting bids wrong is quiet: `bids[0]` becomes the
   worst bid, the spread reads as enormous, the abstention gate rejects healthy markets, nothing
   throws, and invariant I1 still passes because `0.008 >= 0.001`. Added a narrow-spread test,
   which is the only one that catches it.

2. **The specified secret-leak check could not have caught a leak.** The contract said grep
   `.next/static` for `ANTHROPIC`. Next inlines `NEXT_PUBLIC_*` as its literal *value*, so the
   name never reaches the bundle; and in CI, with no key set, it inlines as `undefined`. The
   grep would pass cleanly on a genuinely leaking build. Now scans bundle, source and build
   environment (names only), and fails outright if `.next/static` is missing so it cannot
   vacuously pass.

3. **OQ-10 took three attempts.** First recorded as "a missing User-Agent is rejected" — wrong,
   only presence was varied, never value. Then as a broad scraper-UA blocklist — too general.
   A disproof sweep then missed it by testing `python-urllib` rather than the string Python
   actually sends. Reproducible rule: `Python-urllib/<version>` 403s and essentially nothing
   else does, including sending no UA at all.

4. **OQ-01 was wrong in the other direction.** Both hosts *do* send
   `Access-Control-Allow-Origin: *`, but only when an `Origin` header is present; the original
   probe omitted it. This does not change ADR-0002 — the proxy stands on the reasons the ADR
   already gave.

Two of the four were the orchestrator's own errors, caught by workers who checked rather than
complied.

## Known gaps and risks introduced

- **The first deploy 502'd and needed rework (PR #2).** `start.mjs` took its bind address from
  `process.env.HOSTNAME`, which containers set to the machine's name; most images map that to
  `127.0.0.1`, so the server listened on loopback while the build was green, the process healthy
  and the deploy "live". Now hardcodes `0.0.0.0`. Charged to E1's rework reserve. This is the
  epic's most useful finding, and precisely why the roadmap deploys a skeleton at H5.
- **The Render health check path is unset**, so Render does not gate deploys on it. The endpoint
  works; only Render's own check is unconfigured. The MCP has no update-service call.
- **`ANTHROPIC_API_KEY` is not yet set.** Not needed until E5.
- **Playwright has no CI job.** Browsers in CI are E6's problem.
- **Branch protection allows admin bypass**, deliberately, so the infra epics the owner
  delegated can self-merge. It is recorded in `assumed_accepted`, not hidden.
- **Fixtures are dated 2026-08-16** and will drift. `pnpm test:live` re-records them; run it
  before the demo.
- **`prompts/build/00-master-orchestrator.md` still holds its placeholder.** Owner action; gates
  the E9 prompt deliverable and nothing earlier.

## Open questions for you

- The health check path and `ANTHROPIC_API_KEY` both need a dashboard visit. Neither blocks work
  before E5, so they can wait until it is convenient.

---

## QA CHECKLIST

- [ ] The stated scope is actually present
- [ ] The 5-minute verification steps work as written
- [ ] Nothing claimed as done is missing
- [ ] Error and empty states behave as described
- [ ] Nothing in the UI overstates what the system knows
- [ ] The known-gaps list is honest
- [ ] I accept this epic

**Verdict:** ACCEPTED under the hybrid gate agreed 2026-08-16 — epics with no user-visible
surface (E1, E2, E3, E6) self-merge and are recorded in `assumed_accepted`; E4, E5, E7, E8 and E9
stop for the owner. Recorded rather than assumed.

**Notes:**

---

> **Staging cold start.** The Render free tier spins the service down after ~15 minutes of
> inactivity. The first request after idle takes tens of seconds. This is expected, documented in
> ADR-0015, and is not a defect. `/api/health` reports `uptimeSeconds`; a low value means the
> instance just woke. Run `pnpm warm` before sending anyone to the URL.
