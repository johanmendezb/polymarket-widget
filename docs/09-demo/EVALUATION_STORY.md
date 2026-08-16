# EVALUATION STORY

The nine questions a reviewer is likely to ask, with the answers this project is built to give. If any answer here is not supported by what actually shipped, the answer changes, not the product.

---

### 1. Product: why would someone use this instead of just opening Polymarket?

Because Polymarket shows you one number and this shows you the three numbers that number is hiding: what the crowd believes, what an independent estimate says, and what it would actually cost you to act.

The concrete gap is verified: every existing Polymarket embed and widget is display-only. Polymarket's own official embed renders a market and deep-links out. None of them lets you complete a decision in place, and none of them shows the execution cost of that decision. The fee alone is about 2 percent of stake at even odds in a politics market, and most tooling still presents Polymarket as fee-free.

---

### 2. AI: why is AI actually useful here?

Carefully, and less than you would hope.

The published evidence is that an AI forecaster on its own underperforms market consensus, while an AI combined with market consensus outperforms consensus alone. So the AI is used to *adjust* the market price, not to replace it. The estimate is elicited blind, with the price structurally unavailable to the prompt, so that the adjustment is not just an echo.

The second use is more defensible than the first: the AI reads resolution criteria and evidence availability, which feed an abstention gate. Deciding that a market is not worth betting on is a task where the model is genuinely useful and where being wrong is cheap.

---

### 3. Strategy: what makes the prediction methodology credible?

Four things, in descending order of strength:

1. **The gate requires no resolved outcomes to be correct.** It is arithmetic plus cited thresholds, so it cannot be contaminated or cherry-picked.
2. **The cost model is checkable on screen.** Book walk, real fee formula, real per-market rate.
3. **Blindness is structural, not instructed.** The prompt input type has no price field, and a test proves the assembled prompt contains no rendering of the price.
4. **Forecasts are frozen and hashed before resolution.** Ten lines of code, and it is the difference between a claim and evidence.

What does *not* make it credible: a performance number. There isn't one, deliberately.

---

### 4. Execution: how do you account for liquidity, spread, slippage and fees?

- **Liquidity and depth:** the fill is a volume-weighted walk of the live ask side at the requested size. Insufficient depth is a first-class product state that caps the input and explains itself, not an error.
- **Spread:** you buy at the ask, never the midpoint. Where the spread exceeds $0.10 we show the last traded price instead and say why, following Polymarket's own display rule.
- **Slippage:** deliberately not modelled, because slippage is quote-to-settlement drift and there is no settlement in a simulation. What we do model is *price impact*, which is your own size moving your own fill. Conflating the two is a common and misleading error.
- **Fees:** `fee = C × feeRate × p × (1 − p)`, taker only, with `feeRate` read per market from the API rather than hardcoded. The fee peaks at even odds, which is exactly where most interesting markets sit.

---

### 5. Engineering: why is the architecture designed this way?

One Next.js app, because there is one deployable and one consumer of the shared code. Boundaries are directories enforced by an ESLint rule, which is what a monorepo would have bought at a fraction of the setup cost.

Everything the browser touches goes through our own server, which turns two unknowns (CORS behaviour from an arbitrary embed origin, undocumented rate limits) into non-questions and gives us one place to cache, coalesce, back off and validate. We needed a server for the AI key regardless.

`src/domain` and `src/simulation` are pure and framework-free, which is what makes the arithmetic exhaustively testable and is why the test pyramid is deliberately bottom-heavy.

Fourteen ADRs record every decision of consequence, including the ones where we chose the less impressive option.

---

### 6. Testing: what proves the system works?

The test distribution is unbalanced on purpose: 100 percent branch coverage on the simulation arithmetic, six scenarios per API route, one E2E golden path and six E2E failure paths, and zero coverage target on the UI.

The eight tests that matter most are listed in `07-testing/TEST_STRATEGY.md`. Two examples of what they guard:

- Polymarket returns order book asks sorted **descending**, so `asks[0]` is the *worst* ask. An implementation that misses this prices every buy at 99 cents instead of 45. There is a test for it and it is the highest-priority test in the repository.
- The blind prompt is asserted to contain no rendering of the market price, in any format. Without that test, anchoring collapse would silently invalidate every edge number in the product.

---

### 7. Risk: what would have to happen before you allow real trading?

Sixteen things, listed in `04-architecture/SECURITY.md` §8, starting with a server-side fail-closed geographic eligibility check and ending with explicit per-session user confirmation. Between those: wallet architecture, L1 and L2 auth, server-side signing with no key material in the browser, order lifecycle validation against the real matching engine, fill and fee reconciliation against actual executed trades, hard position limits, a kill switch, monitoring, failure recovery testing and an independent security review.

`LiveExecutionProvider` does not exist as a file, specifically so that nobody can complete it without walking that list.

---

### 8. Future: what would you build next?

In order:

1. **WebSocket prices**, replacing polling. Cheap, and the deferral was purely about time.
2. **Sell and close**, so a simulated position has a lifecycle.
3. **The harness on a schedule**, accumulating resolved pairs toward the few hundred needed for a paired Brier comparison to mean anything, with a public results page carrying its own confidence intervals.
4. **Negative-risk group coherence.** Group prices that fail to sum correctly are a real, mechanically detectable mispricing. This is the one place where an automated system plausibly has an edge that does not depend on out-forecasting people, and it is the direction I would actually take the product.

---

### 9. Tradeoffs: what did you deliberately not build because of 48 hours?

Full list in `09-demo/TRADEOFFS.md`. The three that matter:

- **A backtest.** Mechanically possible; the price history API supports timestamp pinning. Methodologically invalid, because an LLM scored on markets that resolved before its training cutoff is not measuring forecasting skill, and prompting it to ignore what it knows leaves a measured 52 percent performance gap. Not shipping a number was the most expensive decision in the project and the one I would defend hardest.
- **A monorepo.** It would have looked more sophisticated and bought nothing this project needs.
- **Live trading.** Not a time constraint so much as a seriousness constraint. Polymarket also blocks 39 countries including the United States, so simulation is the only version most reviewers could actually use.
