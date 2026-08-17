# CURRENT_STATE

```yaml
phase: PHASE_0_INITIALIZATION
milestone: M1_REPO_AND_CONTRACT_SPIKE
health: GREEN
deadline: T0 + 48h
t0: 2026-08-15
active_epic: E4
active_task: none (E3 read path done; next worker picks up E4 per BACKLOG.md)
blocked_by: []
last_completed: T3.1, T3.2, T3.3, T3.4 (the whole E3 read path)
next_action: E4 widget UI (T4.1 shell, T4.2 search state, T4.3 order preview) can now build against real /api/polymarket/* routes instead of stubs.
critical_risks:
  - R-01 anchoring collapse in the AI layer
  - R-02 scope creep past the time budget
  - R-03 shipping a cost preview without the taker fee
open_decisions:
  - The search route's `tag`-only discovery path (gamma /markets/keyset, per API_CONTRACTS.md) is not implemented - T3.3's client only built fetchSearch(q). A tag-only request (no q) returns BAD_REQUEST. Needs its own task if E4 wants tag-browse.
tests_status: GREEN_179_UNIT_INTEGRATION (81 pre-E3 baseline [T2.1 domain + T1.4 fixture-integrity/import-boundary/scaffold] plus 98 from E3: 22 schema, 21 mapper, 11 cache, 14 client, 30 route integration [7 search, 7 market, 8 book, 8 history]; T1.4's separate 12-assertion live contract suite, `pnpm test:live`, stays excluded from CI and from this count)
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
| T0 + 8h | E3 read path done, T3.1-T3.4. `src/polymarket` now has zod schemas (permissive on ~70 unread Gamma fields, strict on the ones consumed; `clobTokenIds`/`outcomes`/`outcomePrices` JSON.parsed and length-cross-checked), mappers (`mapOrderBook` reverses both sides of the wire book — bids too, not just asks — proven by a narrow-spread regression test that I1 alone cannot catch), an in-memory `TtlCache` (coalescing, stale-on-error, exponential backoff on 429), and an upstream client sending an explicit honest User-Agent. All four routes (`search`, `market/[id]`, `book`, `history`) are live under `src/app/api/polymarket/`, each building its own upstream URL, none a generic pass-through. 98 new tests (22 schema + 21 mapper + 11 cache + 14 client + 30 route integration), `pnpm typecheck && pnpm lint && pnpm test` all green, `pnpm build` succeeds. Known gap: the `tag`-only search/discovery path from API_CONTRACTS.md is not implemented, since T3.3's client only built `fetchSearch(q)` - see `open_decisions` above. |

## What the next agent should do

1. Read `ACTIVE_CONTEXT.md`.
2. `src/domain` is done and stable. Import from `@/domain` (the barrel at `src/domain/index.ts`) - do not redefine any of these types locally in `src/simulation`, `src/polymarket`, `src/ai` or `src/ui`.
3. `src/polymarket` is done and stable (E3, T3.1-T3.4): schemas, mappers, cache and the four live routes. Import route responses through `fetch('/api/polymarket/...')` from the UI layer, or the mapped types from `@/polymarket` server-side - never call Gamma/CLOB directly from anywhere outside `src/polymarket`.
4. This worktree (`e3-readpath`) is not yet merged into whatever branch carries T2.2/T2.3 (`src/simulation`, if that landed on a sibling branch the way T1.4 did) - check for the same kind of unmerged-sibling-branch gap that blocked T3.1 at the start of this run before assuming `src/simulation` is present here.
5. E4 (widget UI) can now build against real routes instead of stubs. E5 (AI) still needs T2.2/T2.3/T2.6 (simulation) first.
6. Update this file's `active_task` and `last_completed` when a task passes its acceptance criteria.

## Update protocol

Update this file whenever any of the following changes: phase, milestone, active task, blockers, test status, deployment status, or the risk register's top three. Do not update it for routine commits.
