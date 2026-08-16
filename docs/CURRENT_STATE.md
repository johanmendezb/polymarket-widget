# CURRENT_STATE

```yaml
phase: PHASE_0_INITIALIZATION
milestone: M1_REPO_AND_CONTRACT_SPIKE
health: GREEN
deadline: T0 + 48h
t0: 2026-08-15
active_epic: E2
active_task: T2.2/T2.3/T3.1/T4.1 (parallel, see below)
blocked_by: []
last_completed: T2.1
next_action: T2.1 unblocks four parallel workers - src/simulation (T2.2 book walk, T2.3 fees), src/polymarket (T3.1 schemas/mappers), and any src/ui or src/ai scaffolding that only needs domain types. AGENT_PROTOCOL.md §8 forbids parallelising src/domain itself, which is why T2.1 ran alone.
critical_risks:
  - R-01 anchoring collapse in the AI layer
  - R-02 scope creep past the time budget
  - R-03 shipping a cost preview without the taker fee
open_decisions: []
tests_status: GREEN_72_UNIT (up from 9; T2.1 added 68 domain tests: branded-primitive boundaries, brand-crossing @ts-expect-error checks, 77-digit tokenId round-trip, OrderBook normalization contract, purity)
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
| T0 + 6h | T2.1 done. `src/domain` populated: opaque branded primitives (`Probability`, `Price`, `Shares`, `Usdc`, `FeeRate`), all entity interfaces, the `GateReason` and `ErrorCode` closed unions, `TokenId` guard. 72 unit tests green, purity enforced by both ESLint and a dedicated source-scan test. Domain model doc corrected: brands were spec'd as `number & { __brand }`, which does not block cross-brand arithmetic; fixed to an opaque type in the same commit. |
| T0 + 7h | T5.1 done (E5, dispatched ahead of E3/E4 alongside the E2 parallel work; only dependency was T2.1). `src/ai` now assembles `blind-v1` and `anchored-v1` from `prompts/runtime/*.md`, loaded from disk via `fs.readFileSync` and never duplicated as string literals - a byte-identical test pins both files. `BlindPromptInput` has no price field; a `@ts-expect-error` test fails `pnpm typecheck` the moment one is added back. `submit_forecast.schema.json` is loaded and exported as the forced tool schema. 18 new unit tests (90 total), all green. R-01's structural defence now has a test, not just a doc claim. |

## What the next agent should do

1. Read `ACTIVE_CONTEXT.md`.
2. `src/domain` is done and stable. Import from `@/domain` (the barrel at `src/domain/index.ts`) - do not redefine any of these types locally in `src/simulation`, `src/polymarket`, `src/ai` or `src/ui`.
3. Four workers can now run in parallel: T2.2/T2.3 (`src/simulation`), T3.1 (`src/polymarket` schemas/mappers), and any UI/AI scaffolding that only needs domain types. Do not parallelise further work inside `src/domain` itself - see `AGENT_PROTOCOL.md` §8.
4. Update this file's `active_task` and `last_completed` when a task passes its acceptance criteria.

## Update protocol

Update this file whenever any of the following changes: phase, milestone, active task, blockers, test status, deployment status, or the risk register's top three. Do not update it for routine commits.
