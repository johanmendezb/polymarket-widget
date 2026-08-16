# PRODUCT REQUIREMENTS - Second Opinion

## 1. Problem

A person looking at a Polymarket market sees one number: 62%. That number is doing three jobs at once and doing none of them explicitly.

- It is **the crowd's belief**, which is a strong estimate and also a biased one. Longshots are systematically overpriced. Politics markets have the worst calibration error of any category despite good average accuracy.
- It is **not the price you pay**. You buy at the ask, your own size moves your fill, and since 2026 Polymarket charges a taker fee of `C × feeRate × p × (1−p)`, which is about 2% of stake at even odds in a politics market. Most tooling, and most of the public writing about Polymarket, still says fees are zero.
- It is **not an independent estimate**. Nothing on the screen tells you whether an informed outside view agrees.

The gap in the ecosystem is specific and verified: **every existing Polymarket embed and widget is display-only.** Polymarket's own official embed renders a market and deep-links out. Third-party widgets show prices. None of them lets you complete a decision in place, and none of them shows what the decision would actually cost.

## 2. Ideation funnel

Five concepts were generated and scored before one was chosen. Scores are 1 to 5.

| # | Concept | Impact | Novelty | Feasibility | Demoability | Risk | 48h cost | Verdict |
|---|---|---|---|---|---|---|---|---|
| C1 | **Copilot.** Search, AI picks a market and an outcome, simulate a bet. The literal reading of the brief. | 2 | 1 | 5 | 3 | 4 | Low | Rejected. Every candidate will build this. The AI layer would be a single unstructured call, and the implied claim (the AI knows better) is unsupported by the evidence. |
| C2 | **True Cost.** No AI in the centre; the product is a rigorous execution-cost preview against the live book. | 3 | 4 | 5 | 3 | 1 | Low | Rejected as a whole product: the brief requires AI assistance. **Absorbed into the winner as its spine.** |
| C3 | **Second Opinion.** AI elicited blind, shown *against* the market rather than instead of it, with an abstention gate that can say no bet. | 5 | 4 | 4 | 5 | 2 | Medium | **Selected.** |
| C4 | **Calibration Lab.** A forecasting evaluation harness with a thin market UI attached. | 3 | 5 | 3 | 2 | 3 | High | Rejected as the primary concept. It is a research tool, not a widget, and much of it cannot be demoed in five minutes. **Its harness is absorbed as a supporting feature.** |
| C5 | **Portfolio Simulator.** Multi-market paper trading with PnL tracking over time. | 3 | 2 | 3 | 2 | 3 | High | Rejected. Needs persistence, needs time to pass before it shows anything, and the demo has neither. |

**Selection rationale.** C3 is the only concept that satisfies all four parts of the brief while being defensible against the research. The published finding that matters most is that an AI forecaster underperformed market consensus alone, but AI *combined with* market consensus beat consensus alone. C3 is the direct product expression of that finding. C2 and C4 fold into it as the execution spine and the credibility layer.

## 3. Product definition

**Second Opinion** is an embeddable widget that keeps three numbers apart and makes their disagreement the point.

| | |
|---|---|
| **What the market believes** | The live price, with its spread, its depth and its known biases labelled |
| **What a model estimates** | A probability elicited without ever seeing the price, reported as a range with dated sources |
| **What it would cost you** | A fill walked against the real order book, net of the real taker fee |

And a fourth thing, which is the differentiator: **the product is allowed to say no.**

## 4. Users

| User | Need | What they get |
|---|---|---|
| Curious visitor on a blog or newsletter that embeds the widget | Understand a market without leaving the page | Search, probability, plain-language explanation of what resolution means |
| Someone deciding whether to bet | Know whether the market is worth acting on and what it costs | The cost waterfall and an independent estimate they can disagree with |
| Technical reviewer of this challenge | Judge engineering quality in five minutes | Visible arithmetic, a gate that fires, a hashed prediction ledger, an honest confidence interval |

## 5. Functional requirements

Priorities: **P0** challenge-critical · **P1** high-impact · **P2** differentiator · **P3** future.

### Market discovery

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | Full-text search over live Polymarket markets with debounced input | P0 |
| FR-1.2 | Results show question, current probability, 24h volume and close date | P0 |
| FR-1.3 | Category chips (Trending, Politics, Crypto, Sports) filtering by Gamma tag | P1 |
| FR-1.4 | Empty search state offers trending markets rather than a bare "no results" | P1 |
| FR-1.5 | "Ask AI to help me pick" ranks candidate markets by where a second opinion is most likely to be useful | P2 |

### Market detail

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Show current probability and price, with a freshness stamp ("updated 3s ago") | P0 |
| FR-2.2 | Outcome selector supporting binary and multi-outcome markets | P0 |
| FR-2.3 | Resolution criteria surfaced in the primary flow, not buried | P0 |
| FR-2.4 | Order book depth available behind a disclosure, not hidden | P1 |
| FR-2.5 | Probability sparkline from `prices-history` | P1 |
| FR-2.6 | negRisk markets labelled as mutually exclusive | P1 |
| FR-2.7 | Where spread exceeds $0.10, show last traded price and say so | P1 |

### AI assistance

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | AI is user-invoked, never fires on load | P0 |
| FR-3.2 | Probability elicited blind, k samples, reported as a range with dispersion | P0 |
| FR-3.3 | Output conforms to an enforced schema; a malformed response is a handled error, not a crash | P0 |
| FR-3.4 | Evidence rendered with per-claim citations and publication dates; undated sources labelled | P0 |
| FR-3.5 | AI estimate rendered in a visually distinct register from the market price. They are never blended into one number. | P0 |
| FR-3.6 | Displayed estimate is the pre-registered blend of blind estimate and market price, with the weight shown | P1 |
| FR-3.7 | Abstention gate with enumerated reason codes, each traceable to a cited threshold | P1 |
| FR-3.8 | Blind-vs-anchored delta computed and displayed as an anti-anchoring diagnostic | P2 |
| FR-3.9 | AI failure, timeout or no-usable-evidence are distinct, non-fatal states. Market data and the cost preview always render regardless. | P0 |

### Simulation

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Amount input in dollars or shares with presets | P0 |
| FR-4.2 | Fill estimated by walking the live order book | P0 |
| FR-4.3 | Five-line preview: shares, average price, fee, total cost, payout and net | P0 |
| FR-4.4 | Fee computed from the per-market rate with the category named in-line | P0 |
| FR-4.5 | Price impact row shown only when the fill price differs from top of book | P1 |
| FR-4.6 | Insufficient depth caps the input and explains, rather than erroring | P0 |
| FR-4.7 | Confirm produces a simulated position, labelled as simulated at the point of commitment | P0 |
| FR-4.8 | Cost waterfall view: midpoint → ask → impact → fee → surviving edge | P2 |
| FR-4.9 | Fractional Kelly sizing suggestion, quarter Kelly default, full Kelly disabled | P2 |

### Credibility layer

| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | A CLI that freezes N unresolved markets with their forecasts and writes a SHA-256-hashed JSONL manifest | P2 |
| FR-5.2 | Resolution-free diagnostics computed and rendered: complementary coherence, sample dispersion, blind-vs-anchored delta, disagreement distribution, gate reason histogram | P2 |
| FR-5.3 | A written claims policy in the repository, linked from the README | P0 |

### Platform

| ID | Requirement | Priority |
|---|---|---|
| FR-0.1 | Deployed, publicly reachable URL | P0 |
| FR-0.2 | Works at 380x600 and at full width, using container queries | P0 |
| FR-0.3 | Light and dark themes via an explicit parameter, not CSS inheritance | P1 |
| FR-0.4 | Keyboard navigable; search is a proper combobox; results use roving tabindex | P1 |
| FR-0.5 | No dependency on localStorage or cookies (a sandboxed iframe has neither) | P0 |
| FR-0.6 | Height negotiation with the host via ResizeObserver and postMessage | P2 |

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | No secret is reachable from the client bundle. Verified by a build-output grep in CI. |
| NFR-2 | Search results render within 1s on a warm cache; the order book within 500ms. |
| NFR-3 | The AI call has a hard timeout. Exceeding it degrades to "AI unavailable", never blocks the flow. |
| NFR-4 | All upstream responses pass a zod schema at the boundary. A shape change fails loudly in one place. |
| NFR-5 | Every upstream call is cached and coalesced at the proxy. Published rate limits are unknown; assume they exist. |
| NFR-6 | No code path can place a real order. There is no signing code in the repository. |

## 7. Explicit anti-requirements

Things we will not build, so that nobody builds them by accident.

- A slippage tolerance control. There is no settlement, therefore no slippage.
- A wallet connect button. It would imply a capability we do not have.
- A single "expected return" number that blends model estimate and price into one figure.
- Any leaderboard, streak or gamification mechanic.
- A modal confirmation dialog. At 380px it fights the host page for focus and scroll.
- Price impact repeated in three places.

## 8. Success metrics for the demo

Not product analytics; these are the things that must be true on screen.

1. A market is searched, opened, analysed, priced and bet on in under 90 seconds without a reload.
2. The gate fires on a deliberately chosen market, and the reason code and its citation are visible.
3. The cost waterfall's arithmetic can be verified by a reviewer with a calculator.
4. Killing the AI route handler leaves the rest of the widget fully functional.
5. Nothing on screen claims the system beats the market.
