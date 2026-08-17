# Second Opinion

**A Polymarket widget that keeps three numbers apart: what the market believes, what a model estimates, and what it would actually cost you.**

> Staging URL: **https://polymarket-widget.onrender.com**
> **Cold start:** the free Render tier sleeps after ~15 minutes idle; the first request after that takes tens of seconds. Disclosed (ADR-0015), not a defect — run `pnpm warm` before sending anyone the link.
> Live build status, epic by epic: [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md).

---

## The idea

A Polymarket market shows you one number. 62%.

That number is doing three jobs at once:

- **It is what the crowd believes.** A strong estimate, and a biased one. Longshots are systematically overpriced, and politics markets have the worst calibration error of any category despite the best average accuracy.
- **It is not what you would pay.** You buy at the ask, your own size moves your fill, and since 2026 Polymarket charges takers `fee = C × feeRate × p × (1 − p)`. In a politics market at even odds that is about **2% of stake**. Most tooling, and most of the writing about Polymarket, still says fees are zero.
- **It is not an independent estimate.** Nothing on the screen tells you whether an informed outside view agrees.

This widget separates the three, shows their disagreement, and is allowed to conclude: **no bet**.

## What it does

- Search live Polymarket markets
- Open a market, see the probability, the spread, the depth and how it resolves
- Ask for an AI second opinion, elicited **without the market price in its context**, reported as a range with dated sources
- See what a bet would actually cost: the fill walked against the live order book, plus the real per-market taker fee
- Place a clearly labelled **simulated** bet

No wallet. No signing. No real trade, in any code path.

## What it will not tell you

There is no performance number in this project, and that is deliberate.

Published 2026 evaluations of frontier LLMs trading real capital on prediction markets are mostly negative. The one robust positive finding is that AI *combined with* market consensus beats consensus alone, while AI alone does not, so that is what is implemented.

A retrospective backtest is mechanically possible here (the price history API supports timestamp pinning) and would be invalid evidence, because a model scored on markets that resolved before its training cutoff is not measuring forecasting skill. Prompting it to ignore what it knows leaves a measured 52% performance gap. This was investigated deliberately and then refused — see [ADR-0007](docs/10-decisions/ADR-0007-a-prospective-hashed-manifest-harness-instead-of-a-retrospective-backtest.md) — not omitted for lack of time. In its place: forecasts are frozen into a hashed manifest before resolution (`pnpm freeze`), and resolution-free diagnostics (coherence, dispersion, the cost waterfall) carry the demo instead of a performance number.

The claims policy is in [`docs/05-ai/EVALUATION.md`](docs/05-ai/EVALUATION.md) §B8 and it is binding on the UI, this README, and everything else.

## What it deliberately does not do

**No wallet, no signing, no real order, in any code path.** [ADR-0004](docs/10-decisions/ADR-0004-no-wallet-no-signing-no-onchain-interaction-in-v1.md): every read this project uses is public and unauthenticated, simulation needs no account or balance, and Polymarket blocks 39 countries including the United States, so a wallet-gated widget would be unusable to most reviewers anyway. Bankroll is a user-entered notional, clearly labelled as notional. `LiveExecutionProvider` does not exist as a file — nobody can complete it by accident.

---

## The reviewer's nine questions

Full answers, checked against what actually shipped, are in [`docs/09-demo/EVALUATION_STORY.md`](docs/09-demo/EVALUATION_STORY.md). Condensed:

1. **Why this instead of opening Polymarket?** It shows the three numbers one price hides: what the crowd believes, an independent estimate, and what it would actually cost to act. No existing embed does that, and most tooling still treats the ~2%-of-stake fee as if it were zero.
2. **Why is AI actually useful here?** Less than you'd hope. Published evidence says AI alone underperforms the market while AI blended with the market beats the market alone, so that's what's built. The abstention gate — deciding a market isn't worth a bet — is the more defensible use of the model.
3. **What makes the methodology credible?** The gate needs no resolved outcomes to be correct — it's arithmetic plus cited thresholds. The cost model is checkable on screen. Blindness is structural (the prompt input type has no price field), not instructed. Forecasts are frozen and hashed before resolution.
4. **How are liquidity, spread, slippage and fees handled?** The fill is a volume-weighted walk of the live ask side. Buys price at the ask, never the midpoint. Slippage (quote-to-settlement drift) isn't modelled — there's no settlement in a simulation — but price impact (your own size moving your own fill) is. `fee = C × feeRate × p × (1 − p)`, taker only, `feeRate` read per market, never hardcoded.
5. **Why this architecture?** One Next.js app, directory boundaries enforced by ESLint instead of a monorepo. Everything the browser touches goes through our own server, which turns unknown CORS behaviour and undocumented rate limits into non-questions. `src/domain` and `src/simulation` are pure and framework-free, which is what makes the arithmetic exhaustively testable.
6. **What proves the system works?** A deliberately bottom-heavy test pyramid. See [Testing](#testing) below for the real, current numbers.
7. **What would have to happen before real trading?** Sixteen things in [`docs/04-architecture/SECURITY.md`](docs/04-architecture/SECURITY.md) §8, from a server-side fail-closed geographic check to a kill switch and an independent security review. `LiveExecutionProvider` does not exist as a file, specifically so nobody can complete it without walking that list.
8. **What would you build next?** In order: WebSocket prices instead of polling, sell/close so a simulated position has a lifecycle, the harness run on a schedule toward the few hundred resolved pairs a paired Brier comparison would need, and negative-risk group coherence — the one place an automated system plausibly has a real edge that doesn't depend on out-forecasting people.
9. **What did 48 hours rule out?** A backtest (methodologically invalid for an LLM, argued above), a monorepo (would have looked more sophisticated and bought nothing this project needs), and live trading (a seriousness and jurisdiction constraint more than a time one). Full list: [`docs/09-demo/TRADEOFFS.md`](docs/09-demo/TRADEOFFS.md).

---

## For technical reviewers

### Architecture

```
Browser widget (Next.js App Router, container-queried, 380x600 baseline)
        |  same-origin fetch only, no secrets, no storage APIs
        v
Next.js route handlers   /api/polymarket/*   /api/ai/*   /api/health
        |                                 |
        |  public REST, no auth           |  Anthropic, server-side key
        v                                 v
Gamma API / CLOB API                 claude-opus-5
```

One Next.js app. No monorepo, no database, no cache server. Every one of those was considered and rejected in an ADR.

```
src/domain/       pure types, branded primitives      imports nothing
src/polymarket/   zod schemas, client, mappers, cache imports domain
src/simulation/   book walk, fees, edge, Kelly, gate  imports domain
src/ai/           prompts, tool schema, sampling      imports domain + simulation
src/ui/           components
src/app/api/      route handlers
```

Boundaries are enforced by ESLint; a violation fails CI.

### Run it

```bash
pnpm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY
pnpm dev                       # widget at /widget, demo host page at /
```

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e     # Playwright, fixture-backed, deterministic
pnpm test:live    # live Polymarket contract suite, excluded from CI
```

### Testing

Deliberately bottom-heavy by design: 100% branch coverage on `src/simulation`, six-to-eight scenarios per API route (MSW-backed, no live network), and no coverage target on the UI at all. Full strategy: [`docs/07-testing/TEST_STRATEGY.md`](docs/07-testing/TEST_STRATEGY.md).

Current measured state (`pnpm typecheck && pnpm lint && pnpm test`, 2026-08-17): **zero typecheck errors, zero lint warnings, 455 tests green across 55 files.** `pnpm test:e2e` currently runs two Playwright smoke specs (`/api/health`, the widget shell at two container widths); the golden-path and failure-path E2E suites the strategy document specifies are not yet implemented — see Known limitations.

The two tests that matter most:

- **Polymarket returns order book asks sorted descending**, so `asks[0]` is the *worst* ask. Missing this prices every buy at 99 cents instead of 45. Verified live 2026-08-15.
- **The blind prompt is asserted to contain no rendering of the market price.** Without it, the model anchors on the price and every edge number in the product becomes an artifact.

### Prompts

Every prompt is in [`prompts/`](prompts/), and it is part of the submission rather than an appendix.

- `prompts/runtime/` is what the application sends. These files are **loaded at build time**, not duplicated as string literals, so the file you read and the string the model receives are the same bytes. A test enforces it.
- `prompts/build/` is the set of prompts that produced this repository: the master orchestrator prompt and the three research agent prompts, verbatim as sent, including the ones whose output was later overruled.

For this challenge the engineering process is part of the subject matter, so `prompts/build/00-master-orchestrator.md` also records the seven places where the research contradicted the prompt that commissioned it.

### Delivery

Each epic is delivered as a pull request with green CI, verified on staging, accompanied by a delivery note in [`docs/12-delivery/`](docs/12-delivery/) containing scope, test evidence with real numbers, five-minute verification steps, honest known gaps, and a QA checklist. **The project owner's PR approval is the acceptance**, enforced by branch protection rather than convention. See [`docs/06-execution/DELIVERY_PROTOCOL.md`](docs/06-execution/DELIVERY_PROTOCOL.md) and ADR-0017.

### Decisions

Eighteen ADRs in [`docs/10-decisions/`](docs/10-decisions/), one of them superseded. The load-bearing ones:

| ADR | Decision |
|---|---|
| [0002](docs/10-decisions/) | All Polymarket reads go through our own proxy, which turns unknown CORS behaviour and undocumented rate limits into non-questions |
| [0006](docs/10-decisions/) | Blind-then-anchored elicitation; the AI adjusts the market rather than replacing it |
| [0007](docs/10-decisions/) | A prospective hashed-manifest harness instead of a retrospective backtest |
| [0008](docs/10-decisions/) | Fills are priced by walking the order book, never by midpoint |
| [0009](docs/10-decisions/) | Fee parameters read per market from the API, never hardcoded |
| [0010](docs/10-decisions/) | The abstention gate is a first-class product feature |
| [0015](docs/10-decisions/) | Render, one staging environment, with the free-tier cold start disclosed rather than worked around |
| [0016](docs/10-decisions/) | Secrets live only in GitHub and Render, never in the repository or a conversation |
| [0017](docs/10-decisions/) | Every epic passes a human QA acceptance gate before it counts as delivered |
| [0018](docs/10-decisions/) | Every prompt is a versioned, first-class deliverable |

### Documentation map

| Question | Document |
|---|---|
| What is this and where is it | [`docs/PROJECT_INDEX.md`](docs/PROJECT_INDEX.md) |
| What does Polymarket actually do, verified | [`docs/02-research/POLYMARKET_RESEARCH.md`](docs/02-research/POLYMARKET_RESEARCH.md) |
| How is a fill priced | [`docs/03-domain/ORDER_EXECUTION.md`](docs/03-domain/ORDER_EXECUTION.md) |
| How does the AI work, and what may it claim | [`docs/05-ai/AI_SYSTEM.md`](docs/05-ai/AI_SYSTEM.md) |
| What did you not build, and why | [`docs/09-demo/TRADEOFFS.md`](docs/09-demo/TRADEOFFS.md) |
| The reviewer's nine questions, answered | [`docs/09-demo/EVALUATION_STORY.md`](docs/09-demo/EVALUATION_STORY.md) |

---

## Limitations

Stated plainly, because an unstated limitation looks like an oversight.

1. **We do not know whether the forecast is any good.** Everything downstream of the estimate is verifiable arithmetic. The estimate is not.
2. Chromium only.
3. Simulated positions vanish on reload. A sandboxed iframe has no storage, and pretending otherwise would be a bug.
4. Rate limits are undocumented, so our caching parameters are an informed guess.
5. The blend weight `w = 0.35` is a judgment call. It is pre-registered so it cannot be tuned after the fact, but it was not derived from data.
6. Resolution tail risk is disclosed but not quantified, because Polymarket's annulment rate is unknown.
7. Taker market buys only. No limit orders, no maker simulation, no selling.
8. Staging sleeps after ~15 minutes idle. Warm it before you look at it.
9. **E2E coverage is partial.** `docs/07-testing/TEST_STRATEGY.md` specifies one golden-path suite plus six failure-path suites (E6). As of this writing, `e2e/` holds two smoke specs — a health check and a widget-shell layout check — and the golden-path and failure-path suites are not yet implemented.

## Compliance

Polymarket restricts 39 countries including the United States, plus sub-national regions, and prohibits VPN circumvention. This project **builds no mechanism to detect, circumvent or work around those restrictions**. It reads public market data and simulates. No order is ever placed.

## Research provenance

Every substantive claim in `docs/02-research/` carries a source URL, a date checked, and a status label: VERIFIED, INFERRED, UNKNOWN or CONFLICTING. Where sources disagreed, the conflict is recorded rather than silently resolved. Ninety-one source records are in [`docs/02-research/RESEARCH_SOURCES.md`](docs/02-research/RESEARCH_SOURCES.md).

All Polymarket API claims were checked against `docs.polymarket.com` and against live responses on **2026-08-15**.
