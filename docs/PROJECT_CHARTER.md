# PROJECT_CHARTER

## The challenge, as given

> Create a Polymarket widget that allows a user to search markets, select an outcome, simulate placing a bet, and use AI to assist in choosing a market and/or outcome.

## The challenge, as interpreted

The literal reading is a four-feature checklist and would take an afternoon. The interesting reading is the question behind it: **what does an AI-assisted betting interface owe its user?**

The research says the answer is uncomfortable. Prediction market prices are a strong, well-calibrated baseline. Published 2026 evaluations of frontier LLMs trading real capital on Polymarket and Kalshi are mostly negative. The one robust positive finding is that AI *combined with* market consensus beats market consensus alone, while AI alone does not.

So a widget that says "the AI thinks YES, place your bet" would be both unoriginal and, by the evidence, wrong.

What we build instead keeps three numbers separate and legible:

1. **What the market believes** (the price, with its known biases stated)
2. **What the model estimates** (elicited blind, as a range, with dated sources)
3. **What it would actually cost** (walked against the live order book, net of the real taker fee)

And it is allowed to conclude: *no bet*.

## Success criteria

This project succeeds if a technical reviewer, after five minutes, believes all four of these:

| # | Belief | Evidence we must show |
|---|---|---|
| S1 | The core flow works and feels finished | Live search → outcome → preview → simulated position, with loading, empty and error states, at 380x600 and full width |
| S2 | The author understands Polymarket, not just its README | Correct taker fee formula from per-market API fields, order-book walk with the descending-asks trap handled, negRisk markets identified, resolution risk disclosed |
| S3 | The AI layer is engineered, not prompted | Enforced output schema, blind-then-anchored elicitation, k-sample dispersion, an abstention gate that visibly fires, graceful failure |
| S4 | The author knows what they cannot claim | A written claims policy, a hashed prediction manifest, and confidence intervals that are honestly too wide |

It fails if we ship a beautiful UI wrapped around a number we cannot defend.

## Explicit non-goals

- Real trading. No wallet, no signing, no onchain transaction, in any code path.
- Beating the market. We have no evidence for it and will not imply it.
- Feature parity with polymarket.com.
- A monorepo, microservices, or infrastructure that does not earn its place.
- Any backtest presented as evidence of forecasting skill.

## Stakeholders and roles

| Role | Who | Responsibility |
|---|---|---|
| Orchestrator | Human + planning session | State, priorities, decisions, scope discipline |
| Implementer | Claude Code, local | Executes task contracts from `06-execution/BACKLOG.md` |
| Reviewer | Claude Code review pass | Rejects work that fails `DEFINITION_OF_DONE.md` gate 1 |
| QA acceptance | Project owner | Runs the 5-minute verification per epic and approves or rejects the PR. Approval is the acceptance. ADR-0017. |
| Evaluator | Challenge reviewer | The audience for the demo and the repository |

## Time budget

48 hours wall clock. Approximately 30 hours of effective working time. Budgeted per epic in `06-execution/ROADMAP.md`, with a documented cut order for when we fall behind.

## Definition of failure

We will consider the project failed, regardless of what is built, if any of the following is true at delivery:

- A simulated action is presented in language that could be read as a real trade.
- Any performance or profitability claim appears without a confidence interval and a stated methodology.
- The demo requires a manual step that was not rehearsed.
- The core flow has an unhandled error state.
