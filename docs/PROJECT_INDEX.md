# PROJECT_INDEX

> Read this first. It is designed to be understood in 90 seconds.
> If you are an agent starting a task, load only this file plus `CURRENT_STATE.md` and `ACTIVE_CONTEXT.md`.

---

## Project identity

**Name:** Second Opinion
**What it is:** An embeddable Polymarket widget that lets a user search markets, get an AI second opinion on an outcome, see what a bet would *actually* cost against the live order book, and place a clearly-labelled simulated bet.
**Challenge brief:** "Create a Polymarket widget that allows a user to search markets, select an outcome, simulate placing a bet, and use AI to assist in choosing a market and/or outcome."
**Hard constraint:** 48 hours from T0.
**T0:** 2026-08-15

## The one-sentence thesis

> A prediction market is three different numbers that most interfaces blend into one: what the market believes, what a model estimates, and what it would actually cost you to act. The widget keeps them apart.

## Current objective

Ship the golden-path flow (search → market → AI second opinion → cost-aware preview → simulated bet) with a working abstention gate and a tamper-evident prediction ledger.

## Current phase

`PHASE 0 - repository initialization` (research gate is CLOSED and passed)

## Current milestone

M1: repo scaffolded, CI green, live-API contract spike passing.

## Critical constraints

| Constraint | Value |
|---|---|
| Time | 48h wall clock, ~30h effective working time |
| Execution mode | Simulation only. No live trading. No wallet. |
| Environments | One. Staging only, on Render free tier. Sleeps after ~15 min idle. |
| Secrets | Anthropic API key only. Entered by a human in Render. Never in the repo, a doc, or a conversation. |
| Delivery | Every epic passes a human QA acceptance gate before it counts as delivered |
| Polymarket auth | Not needed. Every read endpoint we use is public (VERIFIED) |
| Geography | US and 38 other jurisdictions are blocked by Polymarket. We never circumvent this. Simulation mode makes it moot. |
| Claims | Governed by `05-ai/EVALUATION.md` §B8. No profitability claims. Ever. |

## Architecture snapshot

```
Browser widget (Next.js App Router, client components, container-queried, 380x600 baseline)
        |
        |  same-origin fetch only
        v
Next.js route handlers  (/api/polymarket/*, /api/ai/*, /api/simulate/*)
        |                          |
        |  public REST             |  Anthropic Messages API (server-side key)
        v                          v
Gamma API / CLOB API          claude-opus-5
```

One Next.js app. No monorepo. No database. One environment: Render staging, auto-deployed from `main`. See `04-architecture/ARCHITECTURE.md` and ADR-0001, ADR-0002, ADR-0015.

## Canonical documents

| Question | Document |
|---|---|
| What are we building and why | `01-product/PRD.md` |
| What is in and out of the 48h | `01-product/MVP_SCOPE.md` |
| What does Polymarket actually do | `03-domain/POLYMARKET_DOMAIN_MODEL.md` |
| How do we price a simulated fill | `03-domain/ORDER_EXECUTION.md` |
| How is the code laid out | `04-architecture/ARCHITECTURE.md` |
| What do our own endpoints return | `04-architecture/API_CONTRACTS.md` |
| How does the AI work | `05-ai/AI_SYSTEM.md` |
| What may we claim about the AI | `05-ai/EVALUATION.md` §B8 |
| What do I build next | `06-execution/BACKLOG.md` |
| What counts as done | `06-execution/DEFINITION_OF_DONE.md` |
| How do I test it | `07-testing/TEST_STRATEGY.md` |
| How do agents hand off | `11-agent-system/AGENT_PROTOCOL.md` |
| How is an epic delivered and accepted | `06-execution/DELIVERY_PROTOCOL.md` |
| Where do secrets live | `08-operations/SECRETS.md` |
| What prompts does this use | `prompts/README.md` |

## Current decisions

All ADRs are ACCEPTED unless noted. Full text in `10-decisions/`.

| ADR | Decision |
|---|---|
| 0001 | Single Next.js app with enforced module boundaries, not a monorepo |
| 0002 | All Polymarket reads go through our own server-side proxy |
| 0003 | `ExecutionProvider` interface; only `SimulationExecutionProvider` ships |
| 0004 | No wallet, no signing, no onchain interaction in v1 |
| 0005 | Anthropic `claude-opus-5` via server-side route, structured output enforced by tool schema |
| 0006 | Blind-then-anchored elicitation; AI adjusts the market price rather than replacing it |
| 0007 | Prospective hashed-manifest harness instead of a retrospective backtest |
| 0008 | Fills are priced by walking the order book, never by midpoint |
| 0009 | Fee parameters are read per-market from the API, never hardcoded |
| 0010 | The abstention gate is a first-class product feature, not an edge case |
| 0011 | Vitest + MSW + Playwright, with recorded fixtures from live responses |
| 0012 | Polling with a visible freshness stamp in v1; WebSocket deferred |
| 0013 | ~~Railway~~ superseded by 0015 |
| 0015 | Deploy to Render, one staging environment, documented cold start |
| 0016 | Secrets live only in GitHub and Render, never in the repo or a conversation |
| 0017 | Every epic passes a human QA acceptance gate before it is delivered |
| 0018 | Every prompt is a versioned, first-class deliverable |
| 0014 | Container queries and an explicit theme parameter for embeddability |

## Open questions

Tracked with owners and status in `02-research/OPEN_QUESTIONS.md`. The live ones that can change the plan:

1. **OQ-01** Do the Polymarket public read hosts send permissive CORS headers? *Mitigated by ADR-0002 regardless. Answer opportunistically, do not block on it.*
2. **OQ-02** Are there enforced rate limits on the public read endpoints? Undocumented. Assume yes; cache and back off.
3. **OQ-05** What is the Polymarket annulment / 50-50 resolution rate? Unknown. Disclosed as unquantified tail risk.

## Active risks

Top three only. Full register in `08-operations/RISKS.md`.

| ID | Risk | Mitigation |
|---|---|---|
| R-01 | Anchoring collapse: the model echoes the market price and every edge number becomes meaningless | Blind elicitation first, measured blind-vs-anchored delta, shipped as a visible diagnostic |
| R-02 | Scope creep past the 48h budget | Priority ladder in `06-execution/ROADMAP.md` §Cut order. P0 is the golden path only. |
| R-03 | Shipping a fee-free cost preview because most of the web still says Polymarket has no fees | Fee formula is a unit-tested pure function fed by per-market API fields (ADR-0009) |

## Active epic

`E1 - Foundation & live-API contract` (see `06-execution/EPICS.md`)

## Current task

`T1.1 - Scaffold Next.js app with typecheck, lint, test and CI` (see `06-execution/BACKLOG.md`)

## Working agreements

| | |
|---|---|
| **Delivery** | Each epic: PR against `main`, green CI, verified on staging, `docs/12-delivery/DELIVERY-E<n>.md`. The owner QAs and approves the PR. Approval is the acceptance. Work continues on a non-dependent epic meanwhile. ADR-0017. |
| **Secrets** | The owner enters values in the GitHub and Render UIs. No agent handles a secret. The repo holds names only. CI proves the client bundle is clean. ADR-0016. |
| **Prompts** | Every runtime prompt is a file in `prompts/runtime/` that the app loads. Every build prompt is captured verbatim in `prompts/build/`. Both are part of the submission. ADR-0018. |
| **Skills** | `.claude/skills/epic-delivery` packages an epic for QA. `.claude/skills/polymarket-domain` carries the API traps. |

## Last verified external information

**2026-08-15.** All Polymarket API claims in `03-domain/` and `02-research/POLYMARKET_RESEARCH.md` were checked against `docs.polymarket.com` and against live responses from `gamma-api.polymarket.com` and `clob.polymarket.com` on this date. Re-verify if more than a week has passed.

## Last project update

2026-08-15, end of research phase. Knowledge layer written. No application code exists yet.
