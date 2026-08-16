# TECHNICAL FEASIBILITY

Assessed 2026-08-15, before any code. The question this document answers: **can each part of the intended product actually be built in the time available, with the data that actually exists?**

## Verdicts

| Capability | Feasible | Confidence | Evidence |
|---|---|---|---|
| Search live markets | Yes | High | `gamma /public-search` verified live, unauthenticated, returns nested markets with everything the list view needs |
| Show current probability and price | Yes | High | Present on the market object; CLOB `/midpoint` and `/price` available for freshness |
| Show price history | Yes | High | `clob /prices-history` verified, supports intervals and arbitrary timestamp ranges |
| Show the order book | Yes | High | `clob /book` verified live, returns full depth with `tick_size` and `min_order_size` |
| Simulate a realistic fill | Yes | High | Book depth is public, so a genuine VWAP walk is possible. This is the differentiator and it is fully supported by the data. |
| Compute the real fee | Yes | High | Formula published; rate available per market from the market object and from CLOB fee-rate endpoints |
| Multi-outcome and negRisk markets | Yes | Medium | `negRisk` flag and grouped events are exposed. Conversion mechanics exist but we do not implement them. |
| AI forecast with dated evidence | Yes | Medium | Anthropic web search returns sources. Quality of dating varies, which is why undated sources are labelled rather than dropped. |
| Abstention gate | Yes | High | Every one of the 11 inputs is available from the API at request time. No rule depends on data we do not have. |
| Live prices via WebSocket | Yes, but deferred | High | Public market channel verified. Deferred by ADR-0012 for time. |
| Prediction manifest and hashing | Yes | High | Pure local file work |
| Retrospective backtest | Mechanically yes, **methodologically no** | High | `prices-history` supports timestamp pinning, so it *could* be done. It would be invalid evidence because of training-data contamination. We do not do it. |
| Real trading | Out of scope | High | Requires wallet, L1/L2 auth, signing, and geographic eligibility. Explicitly excluded; see `SECURITY.md` §8. |

## The three things that could have sunk this, and why they did not

**1. Authentication.** If reads had required L1 and L2 credentials, the project would have needed a wallet and a signing flow before it could display anything, which would have consumed most of the budget. Verified: reads are public. The host-level summary table in the docs suggests otherwise; the per-endpoint reference and a live unauthenticated request both say reads are open. This single fact is what makes a 48-hour build realistic.

**2. Order book access.** Without public depth, "simulate a realistic fill" degrades to "multiply by the midpoint", which is the thing every other tool does and the thing this project exists to avoid. Verified: full depth is public.

**3. CORS.** Unknown, and it would have been fatal for a browser-direct widget. Neutralised by routing through our own server, which we needed anyway for the AI key.

## Known technical traps, with mitigations

| Trap | Consequence if missed | Mitigation |
|---|---|---|
| Asks are returned **descending** by price | Every buy priced at the worst ask instead of the best. Order-of-magnitude error in every downstream number. | Normalized in one mapper, guarded by the highest-priority test in the suite |
| Token ids exceed `Number.MAX_SAFE_INTEGER` | Silent corruption of the identifier | String everywhere, enforced by types and a round-trip test |
| Gamma prices are indicative, not executable | A preview that does not match the book | Gamma prices only ever render lists; anything the user acts on comes from a fresh `/book` |
| Taker fees exist and much of the web says they do not | A materially false cost preview | Fee is a tested pure function fed by per-market API fields |
| Legacy SDK examples everywhere | Building against a deprecated surface | We do not use the SDK on the read path. The current package is `@polymarket/client`; three earlier packages are deprecated. |
| Sandboxed iframes have no storage | Runtime failure in the actual embedding case | No storage APIs anywhere; positions are in-memory and the UI says so |
| Widget width is not viewport width | Wrong layout in every embed | Container queries only. Media queries are banned in widget CSS. |
| Undocumented rate limits | 429s mid-demo | Proxy-level caching, coalescing, backoff |

## Stack feasibility

Next.js 15 App Router gives us the client widget and the server routes in one deployable, which is exactly the shape the constraints imply: we need a server for the AI key, and having one makes the proxy nearly free.

Render builds Next standalone output without special handling, given that the app binds `process.env.PORT`. The deployment risk is front-loaded to H5 by deploying an empty skeleton before any features exist. The free tier spins down after ~15 minutes idle; the cold start is disclosed and rehearsed rather than worked around (ADR-0015).

No database, no cache server, no queue, no monorepo tooling. Every one of those was considered and rejected in an ADR, because the smallest architecture that meets the stated goals is the one that fits in the time.

## Effort estimate confidence

| Epic | Estimate | Confidence | Why |
|---|---|---|---|
| E1 Foundation | 3h | High | Well-trodden |
| E2 Simulation | 6h | High | Pure functions with hand-computable expected outputs |
| E3 Read path | 3h | Medium | Depends on how cleanly upstream shapes map |
| E4 UI | 7h | Medium | The estimate most likely to be wrong; polish is unbounded, hence the cut order |
| E5 AI | 5h | **Low** | Highest variance. Latency, cost and schema behaviour are only knowable by trying. Sequenced late so an overrun does the least damage, and it has a defined k=1 degradation. |
| E6 Testing | 3h | High | |
| E7 Polish and deploy | 3h | Medium | |
| E8 Credibility | 3h | Medium | Zero minimum viable hours by design |
| E9 Demo and docs | 2h | High | |

Total 35h of estimates against a 28h budget, which is why the cut order is not optional. The plan assumes we will cut E8 and probably two P2 features, and it is still a complete product if we do.
