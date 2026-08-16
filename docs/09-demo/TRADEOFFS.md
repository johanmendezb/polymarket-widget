# TRADEOFFS

What was deliberately not built, and why. Written so that a reviewer can tell the difference between a decision and an oversight.

---

## Not built because of the 48-hour constraint

| Not built | Cost to build | Why it lost |
|---|---|---|
| **Live WebSocket prices** | ~3h | Connection lifecycle, reconnection, backpressure, keepalive, for a surface demoed for five minutes. Polling with a visible "updated Ns ago" stamp is more honest about staleness anyway. ADR-0012. First post-challenge addition. |
| **Sell and close positions** | ~3h | Doubles the order-ticket surface and the test matrix for little demo value. The interesting arithmetic is all on the buy side. |
| **Persisted portfolio with PnL** | ~4h | Needs storage, and a sandboxed iframe has none. Would also require time to pass before it shows anything, which a demo does not have. |
| **Negative-risk group arbitrage** | ~5h | Genuinely the most interesting future feature, because it is the one place an automated system plausibly has an edge that does not depend on out-forecasting people. Needs multi-market state and conversion mechanics. |
| **Cross-browser testing** | ~2h | Chromium only. A widget deserves better and will get it later. Named as a limitation rather than hidden. |
| **Visual regression tests** | ~2h | No stable baseline exists while the layout is still moving. |
| **Maker-order simulation** | ~4h | Requires queue-position modelling that cannot be validated in the time. Taker-only is stated rather than implied. |

## Not built because it would have been wrong

| Not built | Why it would have been wrong |
|---|---|
| **A retrospective backtest with a headline number** | An LLM scored on markets that resolved before its training cutoff is not measuring forecasting skill. Prompting a model to ignore what it knows leaves a measured 52 percent performance gap. Shipping a backtest number would be the single most impressive-looking and least defensible thing in the project. ADR-0007. |
| **"Our AI beats the market"** | No credible published result supports this at scale net of costs. Real-capital and order-book-simulated studies in 2026 were mostly negative. |
| **A single blended "expected return" figure** | Collapses forecast, price and execution cost into one number, which is exactly the conflation the product exists to prevent. |
| **A wallet connect button** | Implies a trading capability that does not exist behind it. ADR-0004. |
| **A slippage tolerance control** | Slippage is quote-to-settlement drift. There is no settlement in a simulation. It would be DEX chrome copied for the look of it, and it would ask the user a question they cannot answer. |
| **A confidence percentage from the model** | A model's verbalized confidence predicts its error worse than the dispersion across independent samples. Displaying it would invite the user to trust the wrong number. |
| **Silently filtering out unsuitable markets** | Hiding a market is less useful than showing it and explaining why it fails. ADR-0010. |

## Not built because it would have been architecture theatre

| Not built | Why |
|---|---|
| **Monorepo** | One deployable, one consumer of the shared code, no independent release cycles. What it would actually buy is workspace configuration and roughly two hours of debugging, in exchange for boundaries an ESLint rule already enforces. ADR-0001. |
| **Microservices** | There is one process and it does four things, all cheap. |
| **Database** | Nothing needs to survive a restart in v1. The prediction manifest is a file. |
| **Redis** | One instance. An in-memory LRU is the correct cache at this scale. |
| **Redux / Zustand / a server-state library** | Four screens and one selected market. The library would be larger than the state it manages. |
| **A `LiveExecutionProvider` stub** | A file that throws "not implemented" is an invitation to implement it without passing the sixteen-item gate. The interface exists; the file does not. ADR-0003. |
| **A generic pass-through proxy route** | Convenient, and an SSRF surface with unbounded rate-limit exposure. Four purpose-built routes instead. |

## Known limitations, stated plainly

1. **We do not know whether the forecast is any good.** Forty-eight hours is not enough to find out, and the published evidence suggests it probably is not better than the market. Everything downstream of the estimate is verifiable arithmetic; the estimate is not.
2. **Chromium only.**
3. **Simulated positions vanish on reload.** A consequence of sandboxed-iframe constraints, disclosed in the UI.
4. **Rate limits are undocumented**, so our caching parameters are a guess informed by nothing.
5. **The blend weight `w = 0.35` is a judgment call.** It is pre-registered so it cannot be tuned after the fact, but it was not derived from data.
6. **Resolution tail risk is disclosed but not quantified**, because Polymarket's annulment rate is unknown.
7. **Prompt injection through market text or a retrieved page is possible.** Bounded by the tool schema and by the absence of any mutating tool, but not eliminated.
8. **Taker market buys only.** No limit orders, no maker simulation.

## The meta-tradeoff

Nearly every decision above trades apparent sophistication for defensibility. A monorepo with a microservice and a backtest showing a twelve percent return would look more impressive for about ninety seconds, and would not survive a single follow-up question.

The bet this project makes is that a reviewer would rather see a smaller thing that is correct, tested, and honest about what it does not know.
