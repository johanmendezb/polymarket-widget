# CURRENT_STATE

```yaml
phase: PHASE_0_INITIALIZATION
milestone: M1_REPO_AND_CONTRACT_SPIKE
health: GREEN
deadline: T0 + 48h
t0: 2026-08-15
active_epic: E3
active_task: T3.1
blocked_by: []
last_completed: T2.1, T1.4 (merged from e1-contract into e3-readpath; T1.4 fixtures were recorded on a sibling branch and had not reached this branch until this merge)
next_action: T3.1 zod schemas for upstream, against the fixtures recorded in test/fixtures/. Then T3.2 mappers, T3.3 cache/client, T3.4 the four read routes, in order.
critical_risks:
  - R-01 anchoring collapse in the AI layer
  - R-02 scope creep past the time budget
  - R-03 shipping a cost preview without the taker fee
open_decisions: []
tests_status: GREEN_90_UNIT_1_E2E (T2.1's 72 unit tests plus T1.4's 18 unit/1 e2e; T1.4 also added a separate 12-assertion live contract suite, `pnpm test:live`, excluded from CI)
deployment_status: NOT_DEPLOYED
environment: staging_only_render
awaiting_qa: []
assumed_accepted: []
```

---

## Where the project actually is

The research gate is closed. Three parallel research streams ran (Polymarket domain/API, competitive/UX, forecasting strategy/evaluation) and their outputs are in `02-research/` and `05-ai/EVALUATION.md`. Every substantive claim carries a source URL, a date checked, and a VERIFIED / INFERRED / UNKNOWN / CONFLICTING label.

Fourteen ADRs are written and accepted. The product is scoped, the architecture is fixed, the backlog is decomposed into task contracts sized 15 to 90 minutes.

**The scaffold exists.** T1.1 landed on `epic/e1-foundation`: Next.js 15 App Router, TypeScript strict with `noUncheckedIndexedAccess`, Tailwind v4, Vitest, Playwright, the six module barrels, and `/api/health`. The import-boundary rule is real, not aspirational: a probe file importing `@/polymarket` from `src/domain` fails `pnpm lint`, and five boundary assertions run in CI as unit tests.

**T2.1 landed.** `src/domain` now exports every branded primitive and entity type from `03-domain/POLYMARKET_DOMAIN_MODEL.md` §1-§5, plus the closed `ErrorCode` union from `04-architecture/API_CONTRACTS.md`. The brands are opaque (`{ [BRAND]: Tag }`, not `number & { __brand }`), so bare arithmetic between two different brands is a compile error, not just a lint nuisance - the domain model doc's original brand shape was corrected in the same commit as the code, since it would not have stopped the bug it exists to catch. `FeeConfig` is a three-member discriminated union so `source: 'category-fallback'` and `estimated: true` cannot come apart. Everything else beyond types (`walkBook`, `computeFee`, `evaluateGate`) is out of scope for T2.1 by contract and belongs to T2.2/T2.3/T2.6.

## What changed since the last update

| When | What |
|---|---|
| T0 + 0h | Environment and repository assessed. Both empty. |
| T0 + 0h | Three research streams launched in parallel. |
| T0 + 1h | Research returned. 91 source records logged. Six UNKNOWNs, four CONFLICTs, all recorded rather than resolved by assumption. |
| T0 + 1h | Ideation funnel run over five candidate concepts. "Second Opinion" selected. See `01-product/PRD.md` §2. |
| T0 + 2h | Knowledge layer written: charter, PRD, MVP scope, architecture, domain model, AI system, evaluation plan, roadmap, backlog, test strategy, ADRs. |
| T0 + 4h | T1.1 done. Scaffold builds, typechecks, lints clean and runs 9 unit tests plus 1 e2e smoke test. Every dependency the project will need is installed up front so the four parallel module workers do not collide on `package.json`. |
| T0 + 3h | Owner feedback round 1. Railway replaced by Render staging (ADR-0015). Secret handling fixed to human-entered only (ADR-0016). Per-epic QA acceptance gate added (ADR-0017). Prompts made first-class deliverables (ADR-0018). Two repo-local skills added. |
| T0 + 5h | T1.4 done (on sibling branch `e1-contract`). `pnpm record-fixtures` records real Gamma/CLOB responses to `test/fixtures/`, dated in `MANIFEST.json`; picked a liquid market (Fed rate decision, ~$227k resting within 2c of best ask) and a thin one (`2491913`, ~$298) so E2/E3 have both a normal book and a partial-fill/insufficient-depth fixture. `pnpm test:live` (12 assertions, structurally excluded from `pnpm test`/CI via a separate Vitest project) confirms the bids-ascending/asks-descending contract, snake_case `/book` shape, 77-digit token-id strings, JSON-encoded `outcomes`/`outcomePrices`/`clobTokenIds`, and reachable-but-not-guaranteed-populated fee fields. Two corrections to the written record: OQ-01 (CORS) was wrongly recorded "No" — both hosts answer `*` when a request carries an `Origin` header, it just wasn't being sent; OQ-10 (User-Agent) downgraded from "RESOLVED" to CONFLICTING — the one observed 403, and a later "scraper-UA blocklist" theory for it, both failed to reproduce across `node:https`, `curl`, and eight UA strings including known scraper/bot strings. Both `OPEN_QUESTIONS.md` and `POLYMARKET_DOMAIN_MODEL.md` corrected in the same commit. |
| T0 + 6h | T2.1 done. `src/domain` populated: opaque branded primitives (`Probability`, `Price`, `Shares`, `Usdc`, `FeeRate`), all entity interfaces, the `GateReason` and `ErrorCode` closed unions, `TokenId` guard. 72 unit tests green, purity enforced by both ESLint and a dedicated source-scan test. Domain model doc corrected: brands were spec'd as `number & { __brand }`, which does not block cross-brand arithmetic; fixed to an opaque type in the same commit. |
| T0 + 6.5h | Branches merged: `e1-contract` (T1.4 fixtures) into `e3-readpath` (T2.1 domain types), so E3 has both the fixtures and the domain types it needs. OQ-10 re-confirmed CONFLICTING → resolved as scraper-pattern-UA-blocklisted per fresh 2026-08-16 probing (`Python-urllib/3.9` → 403, `curl/8.7.1` or an omitted header → 200); the read-path client sends an explicit, honest User-Agent and never falls back to a library default. |

## What the next agent should do

1. Read `ACTIVE_CONTEXT.md`.
2. `src/domain` is done and stable. Import from `@/domain` (the barrel at `src/domain/index.ts`) - do not redefine any of these types locally in `src/simulation`, `src/polymarket`, `src/ai` or `src/ui`.
3. Four workers can now run in parallel: T2.2/T2.3 (`src/simulation`), T3.1 (`src/polymarket` schemas/mappers), and any UI/AI scaffolding that only needs domain types. Do not parallelise further work inside `src/domain` itself - see `AGENT_PROTOCOL.md` §8.
4. Update this file's `active_task` and `last_completed` when a task passes its acceptance criteria.

## Update protocol

Update this file whenever any of the following changes: phase, milestone, active task, blockers, test status, deployment status, or the risk register's top three. Do not update it for routine commits.
