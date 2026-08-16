# CURRENT_STATE

```yaml
phase: PHASE_0_INITIALIZATION
milestone: M1_REPO_AND_CONTRACT_SPIKE
health: GREEN
deadline: none (the 48h clock in ROADMAP.md is a narrative frame; owner confirmed 2026-08-16 that quality beats speed and nothing is cut for time)
t0: 2026-08-15
active_epic: E1
active_task: T1.3
blocked_by: []
last_completed: T1.4
next_action: T1.3 (Render service, pnpm warm, branch protection) is the last task in E1. T2.1 is already done on branch e2-domain, so E2, E3, T4.1 and T5.1 can fan out as soon as E1 merges.
critical_risks:
  - R-01 anchoring collapse in the AI layer
  - R-02 scope creep past the time budget
  - R-03 shipping a cost preview without the taker fee
open_decisions: []
tests_status: GREEN_18_UNIT_1_E2E (plus a separate 12-assertion live contract suite, `pnpm test:live`, run manually against production and structurally excluded from CI)
deployment_status: NOT_DEPLOYED_CI_GREEN
environment: staging_only_render
awaiting_qa: []
assumed_accepted: []
```

---

## Where the project actually is

The research gate is closed. Three parallel research streams ran (Polymarket domain/API, competitive/UX, forecasting strategy/evaluation) and their outputs are in `02-research/` and `05-ai/EVALUATION.md`. Every substantive claim carries a source URL, a date checked, and a VERIFIED / INFERRED / UNKNOWN / CONFLICTING label.

Fourteen ADRs are written and accepted. The product is scoped, the architecture is fixed, the backlog is decomposed into task contracts sized 15 to 90 minutes.

**The scaffold exists.** T1.1 landed on `epic/e1-foundation`: Next.js 15 App Router, TypeScript strict with `noUncheckedIndexedAccess`, Tailwind v4, Vitest, Playwright, the six module barrels, and `/api/health`. The import-boundary rule is real, not aspirational: a probe file importing `@/polymarket` from `src/domain` fails `pnpm lint`, and five boundary assertions run in CI as unit tests.

**CI exists.** T1.2 landed on `e1-ci`: GitHub Actions runs typecheck, lint, test, build and `pnpm audit` in parallel on every push and every pull request, behind a single aggregate `ci` job so branch protection has one stable check name to require. The gate is proven, not assumed: a deliberately introduced type error turned the run red, and a deliberately introduced `NEXT_PUBLIC_ANTHROPIC_API_KEY` turned the `secret-leak` step red. Both were reverted.

**The secret-leak check had to be widened, and this matters beyond T1.2.** Next inlines `NEXT_PUBLIC_*` references at build time as the *value*, so the variable name never reaches `.next/static`. Grepping the bundle for `ANTHROPIC` - which is what the contract specified and what everyone assumes works - cannot see a `NEXT_PUBLIC_ANTHROPIC_API_KEY` leak at all unless the value happens to be shaped like a real key. The bundle grep stays, because it catches a real key in the browser; alongside it there is now a name-level scan of `src/`, `.env.example` and the build environment. Anyone who later assumes the bundle grep alone enforces CLAUDE.md rule 7 will be wrong.

No feature code exists yet. That is deliberate and correct for this point in the plan.

## What changed since the last update

| When | What |
|---|---|
| T0 + 0h | Environment and repository assessed. Both empty. |
| T0 + 0h | Three research streams launched in parallel. |
| T0 + 1h | Research returned. 91 source records logged. Six UNKNOWNs, four CONFLICTs, all recorded rather than resolved by assumption. |
| T0 + 1h | Ideation funnel run over five candidate concepts. "Second Opinion" selected. See `01-product/PRD.md` §2. |
| T0 + 2h | Knowledge layer written: charter, PRD, MVP scope, architecture, domain model, AI system, evaluation plan, roadmap, backlog, test strategy, ADRs. |
| T0 + 4h | T1.1 done. Scaffold builds, typechecks, lints clean and runs 9 unit tests plus 1 e2e smoke test. Every dependency the project will need is installed up front so the four parallel module workers do not collide on `package.json`. |
| T0 + 5h | T1.2 done. CI green on push and pull request. Both failure paths proven with real red runs and reverted. `secret-leak` widened to a name-level scan after the bundle grep was shown unable to see a `NEXT_PUBLIC_` leak. |
| T0 + 3h | Owner feedback round 1. Railway replaced by Render staging (ADR-0015). Secret handling fixed to human-entered only (ADR-0016). Per-epic QA acceptance gate added (ADR-0017). Prompts made first-class deliverables (ADR-0018). Two repo-local skills added. |
| T0 + 5h | T1.4 done. `pnpm record-fixtures` records real Gamma/CLOB responses to `test/fixtures/`, dated in `MANIFEST.json`; picked a liquid market (Fed rate decision, ~$227k resting within 2c of best ask) and a thin one (`2491913`, ~$298) so E2 has both a normal book and a partial-fill/insufficient-depth fixture. `pnpm test:live` (12 assertions, structurally excluded from `pnpm test`/CI via a separate Vitest project) confirms the bids-ascending/asks-descending contract, snake_case `/book` shape, 77-digit token-id strings, JSON-encoded `outcomes`/`outcomePrices`/`clobTokenIds`, and reachable-but-not-guaranteed-populated fee fields. Two corrections to the written record: OQ-01 (CORS) was wrongly recorded "No" — both hosts answer `*` when a request carries an `Origin` header, it just wasn't being sent; OQ-10 (User-Agent) downgraded from "RESOLVED" to CONFLICTING — the one observed 403, and a later "scraper-UA blocklist" theory for it, both failed to reproduce across `node:https`, `curl`, and eight UA strings including known scraper/bot strings. Both `OPEN_QUESTIONS.md` and `POLYMARKET_DOMAIN_MODEL.md` corrected in the same commit. |

## What the next agent should do

1. Read `ACTIVE_CONTEXT.md`.
2. Execute `T1.3` (Render staging) from `06-execution/BACKLOG.md`. `T1.4` (live-API contract spike) is also unblocked. When T1.3 enables branch protection on `main`, the status check to require is named **`ci`** - the aggregate job, not the five individual ones.
3. Update this file's `active_task` and `last_completed` when the task passes its acceptance criteria.

## Update protocol

Update this file whenever any of the following changes: phase, milestone, active task, blockers, test status, deployment status, or the risk register's top three. Do not update it for routine commits.
