# Competitive Research - Polymarket Widget

**Prepared:** 2026-08-15
**Scope:** Items 1–4 of the research brief (Polymarket product surface, third-party ecosystem, adjacent prediction markets, AI forecasting/decision-support).
**Method:** Web search + page fetch. Every claim carries a status label.
**Status labels:** `VERIFIED` (stated by a primary/official source), `INFERRED` (reasoned from evidence, not directly stated), `UNKNOWN` (could not confirm), `CONFLICTING` (sources disagree).

> **Rule applied throughout:** no product capability is asserted as fact without a source. Where a secondary source contradicted an official one, the official source wins and the conflict is recorded.

---

## 1. Polymarket's Own Product Surface

### 1.1 Does Polymarket have an official embed/widget product?

**Yes. This is the single most important finding for this project.**

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 1.1a | Polymarket operates an official embed builder at `embed.polymarket.com` - "Add live Polymarket data to your site. Paste a link, configure the look, copy the code." | VERIFIED | https://embed.polymarket.com/ | 2026-08-15 |
| 1.1b | Two layouts are offered: **Standard** (full market display) and **Banner** (compact). | VERIFIED | https://embed.polymarket.com/ | 2026-08-15 |
| 1.1c | Configurable options include: dimensions (px or "Fit container"), affiliate code appended as `?via=`, chart toggle, buy-buttons toggle, volume, live activity, Y-axis, grid rows, border, dark mode. | VERIFIED | https://embed.polymarket.com/ | 2026-08-15 |
| 1.1d | Output is an `<iframe>` with `src=https://embed.polymarket.com/market?`, default dimensions **400x400**, transparency enabled, and a required Polymarket branding link. | VERIFIED | https://embed.polymarket.com/ | 2026-08-15 |
| 1.1e | An older/alternate URL form exists: `embed.polymarket.com/market.html?market={slug}&features=volume&theme=dark`. | VERIFIED | https://embed.polymarket.com/market.html?market=favorite-to-win-on-polymarket-one-day-after-debate&features=volume&theme=dark | 2026-08-15 |
| 1.1f | Embeds are available for Web/CMS (via the `< >` link on a market page), Twitter/X (paste URL), and Substack (paste URL in editor). | VERIFIED | https://help.polymarket.com/en/articles/13364174-how-to-use-embeds | 2026-08-15 |
| 1.1g | **The embed supports single markets only** - it cannot display market collections or groups. | VERIFIED | https://help.polymarket.com/en/articles/13364174-how-to-use-embeds | 2026-08-15 |
| 1.1h | The rendered embed contains title, probability percentages, `$Xm Vol.` with an "All time" filter, outcome rows with cent prices (e.g. "Kamala 100¢ / Trump 0¢"), and a "View Market" CTA. | VERIFIED | https://embed.polymarket.com/market.html?... | 2026-08-15 |
| 1.1i | **The embed is display-only for trading.** Interactive elements link out to polymarket.com with `utm_medium=embed&utm_campaign=market` and `tid` params; no order can be executed inside the frame. | VERIFIED (observed) | https://embed.polymarket.com/market.html?... | 2026-08-15 |
| 1.1j | The embed builder exposes a "Buy buttons: show/hide purchase functionality" toggle, which reads as if in-frame purchase exists. Observed behaviour is that these buttons deep-link out to polymarket.com rather than execute in-frame. | CONFLICTING → resolved as **deep-link, not in-frame execution** | https://embed.polymarket.com/ vs. observed embed markup | 2026-08-15 |
| 1.1k | Polymarket publishes an oEmbed endpoint or oEmbed discovery tags. | **UNKNOWN** - X/Substack unfurling is consistent with oEmbed or with bespoke platform integrations; no oEmbed spec/endpoint was found in the docs. Do not assume oEmbed. | - | 2026-08-15 |
| 1.1l | Documented terms governing commercial reuse of the embed, rate limits on the embed, or `frame-ancestors` restrictions on `embed.polymarket.com`. | **UNKNOWN** - not found in help-centre or embed builder pages. Must be checked before shipping. | - | 2026-08-15 |

**Implication:** the official product already owns "show live odds on a page." It does **not** own "select an outcome, size a position, preview the cost, and commit." That gap is the product.

### 1.2 Market list / detail presentation

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 1.2a | Market cards carry: question title, implied probability (prices quoted 0–100 cents), 24h volume, and outcome options (binary Yes/No or multi-outcome). | VERIFIED | https://polymarket.com/event | 2026-08-15 |
| 1.2b | Left-nav category browsing exists: Politics, Sports, Crypto, Esports, Finance, others. Sort by 24hr Volume; filter All vs Active. | VERIFIED | https://polymarket.com/event | 2026-08-15 |
| 1.2c | "Each share pays out $1 if the outcome resolves in its favor, and $0 if it does not." Binary is the base primitive; multi-outcome events are groupings (e.g. "What price will Bitcoin hit in August?"). | VERIFIED | https://polymarket.com/event | 2026-08-15 |
| 1.2d | The market detail page exposes price history, the order book, and full resolution rules. | VERIFIED | https://polymarket.com/event | 2026-08-15 |
| 1.2e | Order entry supports market orders (instant) and limit orders (your price) with an entry size; resting orders and their sizes are visible; positions appear in a portfolio and can be sold before resolution. | VERIFIED | https://www.alphascope.app/blog/how-does-polymarket-work | 2026-08-15 |
| 1.2f | Exact field labels of Polymarket's order ticket (e.g. whether it shows "Avg price", "Shares", "Potential return", "Fee") and its precise layout. | **UNKNOWN** - no fetched source enumerated the live ticket's fields. Requires hands-on inspection of polymarket.com by the implementing agent. | - | 2026-08-15 |

### 1.3 Pricing display rule worth copying

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 1.3a | **"If bid-ask spread > $0.10, Polymarket UI shows last traded price instead of midpoint."** | VERIFIED (Polymarket's own repo) | https://github.com/Polymarket/agent-skills/blob/main/market-data.md | 2026-08-15 |

This is a concrete, official, copyable heuristic for what number to show as "the price" when the book is thin. Adopt it.

### 1.4 Fees - the number that makes an order preview honest

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 1.4a | Polymarket charges **taker fees only; makers are never charged.** "Makers are never charged fees. Only takers pay fees." | VERIFIED | https://help.polymarket.com/en/articles/13364478-trading-fees | 2026-08-15 |
| 1.4b | Fee formula: **`fee = C × feeRate × p × (1 − p)`** where `C` = shares traded, `p` = share price. | VERIFIED | https://help.polymarket.com/en/articles/13364478-trading-fees | 2026-08-15 |
| 1.4c | feeRate by category: Crypto **0.07**; Sports/Economics/Culture/Weather/Other **0.05**; Finance/Politics/Mentions/Tech **0.04**; Geopolitics **0** (fee-free). | VERIFIED | https://help.polymarket.com/en/articles/13364478-trading-fees | 2026-08-15 |
| 1.4d | Fees are denominated in USDC, rounded to 5 decimals, min charge 0.00001 USDC; very small trades may incur zero fee. | VERIFIED | https://help.polymarket.com/en/articles/13364478-trading-fees | 2026-08-15 |
| 1.4e | The formula is symmetric around 50%: "a trade at 30¢ incurs the same dollar fee as a trade at 70¢." | VERIFIED | https://help.polymarket.com/en/articles/13364478-trading-fees | 2026-08-15 |
| 1.4f | The fee doc is dated **2026-07-10** and references a prior "Polymarket Exchange Upgrade: April 28, 2026." Exact effective date of the current schedule is not stated. | VERIFIED (doc date) / UNKNOWN (effective date) | https://help.polymarket.com/en/articles/13364478-trading-fees | 2026-08-15 |
| 1.4g | Polymarket announced taker fees across nearly all trading categories in March 2026. | VERIFIED (headline) | https://www.crowdfundinsider.com/2026/03/268884-polymarket-to-impose-taker-fees-on-nearly-all-trading-categories/ | 2026-08-15 |
| 1.4h | "Trading fees: currently 0% on most markets" / "no explicit trading fee on most markets." | **CONFLICTING - treat as STALE/WRONG.** Contradicted by 1.4a–1.4g. Secondary blogs have not been updated. | https://www.alphascope.app/blog/how-does-polymarket-work ; https://pillarlabai.com/blog/kalshi-vs-polymarket-2026/ | 2026-08-15 |

> **This is the single highest-risk factual trap in the project.** A large share of the public web still says Polymarket is fee-free. Any widget that computes "you pay $X" without the `C × feeRate × p × (1−p)` term will understate cost. Hardcode the formula, read feeRate per category, and cite the help-centre article in code comments.

### 1.5 API surface available to a widget (read path)

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 1.5a | Gamma API `https://gamma-api.polymarket.com` - **no auth required**. `GET /events?active=true&closed=false&limit=100`, `GET /markets?slug={slug}`. | VERIFIED (official repo) | https://github.com/Polymarket/agent-skills/blob/main/market-data.md | 2026-08-15 |
| 1.5b | Data API `https://data-api.polymarket.com` - no auth required. | VERIFIED | same | 2026-08-15 |
| 1.5c | CLOB `https://clob.polymarket.com` - **no auth for read endpoints**. `GET /book?token_id=…`, `POST /books`, `GET /price?token_id=…&side=BUY`, `POST /prices`, `POST /midpoints`, `POST /spreads`. Price history via SDK with `interval` ∈ {1h, 6h, 1d, 1w, 1m, max}. | VERIFIED | same | 2026-08-15 |
| 1.5d | Orderbook shape is `{bids:[{price,size}…], asks:[{price,size}…]}`; best ask = buy price, best bid = sell price, midpoint = average; **"walk the orderbook to estimate slippage for a given order size"** via `calculateMarketPrice()`. | VERIFIED | same | 2026-08-15 |
| 1.5e | Gamma `GET /markets` supports `limit`, `active`, `order` (`volume24hr`, `volume`, `liquidity`, `endDate`), `ascending`, `tag`. | VERIFIED (secondary, consistent with official) | https://rekko.ai/docs/guides/polymarket-api-guide | 2026-08-15 |
| 1.5f | A third-party guide states CLOB `GET /book` requires HMAC-SHA256 auth (`POLY-API-KEY`/`POLY-TIMESTAMP`/`POLY-SIGNATURE`). | **CONFLICTING - resolved against.** Polymarket's own repo states "no auth for read endpoints." Trust the official repo. | https://rekko.ai/docs/guides/polymarket-api-guide | 2026-08-15 |
| 1.5g | Published numeric rate limits for Gamma/CLOB reads. | **UNKNOWN.** Official doc documents none; one secondary says "no published limit (reasonable use expected)" and advises against aggressive polling; another says limits "vary by endpoint." Design for backoff and caching regardless. | https://github.com/Polymarket/agent-skills/blob/main/market-data.md ; https://rekko.ai/docs/guides/polymarket-api-guide | 2026-08-15 |
| 1.5h | Official CLOB clients: `github.com/Polymarket/py-clob-client` (Python), `github.com/polymarket/clob-client` (TypeScript). Also `github.com/Polymarket/polymarket-cli`. | VERIFIED | https://dev.to/idasweeney129012/5-open-source-polymarket-github-repos-developers-are-forking-in-2026-plus-the-official-clob-3li2 ; https://github.com/Polymarket/polymarket-cli | 2026-08-15 |
| 1.5i | Auth/signing for **placing** orders (EIP-712 + HMAC) is a separate, heavier path than reads. | INFERRED (metadata from parlay.run guide references "EIP-712 + HMAC auth"; body not retrievable) | https://www.parlay.run/polymarket-api | 2026-08-15 |

**Implication for a 48h build:** the entire read path - search, market detail, orderbook, price history, and therefore a *fully accurate order preview* - needs **no authentication at all**. Simulated betting is achievable end-to-end with public endpoints. This de-risks the challenge enormously.

---

## 2. Third-Party Polymarket Widgets, Terminals, Bots, Clones

### 2.1 What exists

| # | Product / repo | What it does | Status | Source | Checked |
|---|---|---|---|---|---|
| 2.1a | **PredictWidget** - free hosted Polymarket widget; live odds refreshed ~every 5s; two modes (featured single event, list); auto-shows top trending markets by 24h volume; no account/API key needed; WordPress/Webflow/Squarespace/HTML; monetised via affiliate click-through. | VERIFIED | https://predictwidget.com/polymarket-widget | 2026-08-15 |
| 2.1b | PredictWidget is **display-only**; "sends traffic to Polymarket" and does not facilitate trading. Documented gaps: no market-choice customisation, limited theming, third-party infra dependency. | VERIFIED | https://predictwidget.com/polymarket-widget | 2026-08-15 |
| 2.1c | **PredScope** - free prediction-market widget for embedding live odds. | VERIFIED (exists) / UNKNOWN (feature depth - not fetched) | https://predscope.com/guide/embed-widget | 2026-08-15 |
| 2.1d | **PolyCatalog** - directory of 216+ Polymarket tools. Categories: Trading & Automation; Analytics & Research; Dashboards & Portfolio; Alerts & Monitoring; Developer Infrastructure; Interfaces (browser extensions, aggregators, mobile alternatives). Featured: PolyBot Pro (AI trading bot), AlertPilot (arbitrage scanner), PolyTimer (Chrome extension), Predictify (aggregator), Poly SDK (TypeScript). | VERIFIED | https://www.polycatalog.io/ | 2026-08-15 |
| 2.1e | PolyCatalog's own homepage shows **no featured projects under Widgets/Embeds**, and no featured Telegram/Discord bot examples despite the category existing. The directory is "strongest in trading automation and least developed in social/messaging platform integrations." | VERIFIED | https://www.polycatalog.io/ | 2026-08-15 |
| 2.1f | Open-source repos being forked in 2026 are overwhelmingly **backend bots**: arbitrage bots (TS), oracle-lag snipers, Rust trading bots, auto-traders, market-maker bots. **"No UI/widget code is mentioned"** in the roundup. | VERIFIED | https://dev.to/idasweeney129012/... | 2026-08-15 |
| 2.1g | Terminal-style OSS exists: `NYTEMODEONLY/polyterm` ("Polymarket in your terminal"), `txbabaxyz/polyrec` (real-time TUI for BTC 15-min UP/DOWN, 70+ indicators, CSV logging, backtesting), `direkturcrypto/polymarket-terminal` (copy/scalping/sniper). | VERIFIED (repo descriptions) | GitHub links in Sources | 2026-08-15 |
| 2.1h | Full-stack clones exist but are demo-grade: `viral-sangani/Polymarket-clone` (Solidity + NextJS + IPFS). | VERIFIED (repo description) / INFERRED (demo-grade) | https://github.com/viral-sangani/Polymarket-clone | 2026-08-15 |
| 2.1i | Embedding into social/protocol contexts has been attempted: `iPaulPro/PolymarketAttestActionModule` - a Lens Protocol Open Action for embedding Polymarket trading inside publications. | VERIFIED (repo description) | https://github.com/iPaulPro/PolymarketAttestActionModule | 2026-08-15 |
| 2.1j | A community "Polymarket screener" turned 13,963 markets into a single scannable page - evidence that **discovery at scale is a felt pain point**. | VERIFIED (author's account) | https://dev.to/manja316/building-a-free-polymarket-screener-how-i-turned-13963-markets-into-a-single-scannable-page-nna | 2026-08-15 |
| 2.1k | Curated list of prediction-market tools spanning AI agents, analytics, APIs, dashboards, copy trading, alerting. | VERIFIED (exists) | https://github.com/aarora4/Awesome-Prediction-Market-Tools | 2026-08-15 |
| 2.1l | An autonomous Polymarket AI trading agent using x402 micropayments exists. | VERIFIED (repo description) | https://github.com/BlockRunAI/polymarket-agent | 2026-08-15 |

### 2.2 What the ecosystem does well

- **Read-only odds display is solved and commoditised.** Official embeds + PredictWidget + PredScope all do it, free, in two lines of HTML.
- **Backend automation is dense and mature.** Arbitrage, copy-trading, market-making, sniping - dozens of repos and 216+ catalogued tools.
- **Data access is genuinely open.** Unauthenticated Gamma/Data/CLOB reads plus official Python/TS clients plus a CLI.

### 2.3 What is missing (the gap)

| # | Gap | Status | Basis |
|---|---|---|---|
| 2.3a | **No embeddable widget where a user can select an outcome, size a position, and see a full cost preview before committing.** Official embed is display-only (1.1i); PredictWidget is display-only (2.1b); OSS roundup has no UI/widget code (2.1f); PolyCatalog features no widget projects (2.1e). | INFERRED (strong - triangulated from four independent sources; absence of evidence, so not VERIFIED) | 1.1i, 2.1b, 2.1e, 2.1f |
| 2.3b | **No widget shows fee-inclusive net cost.** Given that most of the public web still says Polymarket is fee-free (1.4h), it is very unlikely existing widgets apply the March-2026 taker-fee formula. | INFERRED | 1.4g, 1.4h |
| 2.3c | **No embed supports multi-market comparison or collections** - official embed is single-market only, by documentation. | VERIFIED | 1.1g |
| 2.3d | **Search inside an embed does not exist** in any surveyed product. Embeds require the publisher to pre-pick a market. | INFERRED | 1.1a–1.1g, 2.1a |
| 2.3e | **AI assistance is not embedded anywhere.** AI tools (§4) live in separate terminals/dashboards; AI agents are headless trading bots. Nothing puts "help me pick a market/outcome" inside a small embeddable surface. | INFERRED (strong) | §4, 2.1f, 2.1l |
| 2.3f | Whether any *unlisted/private* product already does all of the above. | **UNKNOWN** - directories are incomplete by nature. | - |

---

## 3. Adjacent Prediction-Market Interfaces

### 3.1 Feature / UX comparison

| Platform | Mechanism | How probability is shown | Uncertainty & liquidity signalling | Cost-to-trade shown? | Embeds/widgets | Status |
|---|---|---|---|---|---|---|
| **Polymarket** | CLOB (on-chain, Polygon), $1 payout per winning share, prices 0–100¢ | % + cents dual format; falls back to **last traded price when spread > $0.10** | Full order book + resting order sizes visible; 24h volume on cards | Order book visible; taker fee `C×r×p×(1−p)`, r 0–0.07 | **Official single-market embed, display-only** | VERIFIED (1.1–1.5) |
| **Kalshi** | CLOB, CFTC-regulated, contracts | Cent-denominated contracts | Not detailed in fetched sources | **Trading fee `roundup(0.07 × C × P × (1−P))`; maker fee `roundup(0.0175 × C × P × (1−P))`**; rounded up to next cent; maker fee only on resting orders that later fill; no fee if cancelled | UNKNOWN | VERIFIED (fee formulas) |
| **Manifold** | **Hybrid**: limit orders first, then AMM ("trades fill against open orders first and then against the AMM") | Probability % (e.g. "60% market estimate") | Cost surfaces as **price impact**, not fees: "M0 on trades… cost comes from AMM price impact and available limit-order liquidity" | **Order ticket shows bet amount, payout, and price impact before execution** | API covers markets/users/bets/comments/positions; WebSocket live topics; bulk historical downloads | VERIFIED |
| **Metaculus** | Not a market - community forecast + AI benchmark | Community prediction; **calibration by probability bucket** | Calibration-first framing of uncertainty | N/A (no trading) | UNKNOWN | VERIFIED |
| **Limitless** (Base) | Binary outcomes, collateralised shares in smart contracts | Not detailed | Optimised for **frequent short-duration markets (hourly/daily)** | UNKNOWN | UNKNOWN | VERIFIED (positioning) |
| **Myriad** | Automated market structures, multi-chain | Not detailed | Social-first; ">$100M USDC volume" | UNKNOWN | "Media-driven distribution strategy"; positions prediction markets as "a social layer for information discovery" - implies embedding into media surfaces | VERIFIED (positioning) |
| **Opinion.trade** | On-chain + AI-assisted oracles + DeFi composability | Not detailed | Positions itself as a **"people's terminal"** for macro signals | UNKNOWN | UNKNOWN | VERIFIED (positioning) |
| **Predict** (BNB Chain) | Binary + multi-outcome, bond-style structures | Not detailed | **Educational onboarding** is the differentiator; AI-proposed outcomes reviewed internally | UNKNOWN | UNKNOWN | VERIFIED (positioning) |
| **The Clearing Company** | CFTC-registered DCO, stablecoin-native clearing | N/A (infrastructure) | N/A | N/A | N/A | VERIFIED (positioning) |

Sources: Polymarket rows per §1; Kalshi fees https://sailgp.com/prediction-markets/kalshi/fees ; Manifold https://cryptoslate.com/prediction-markets/manifold-predictions-review/ and https://news.manifold.markets/p/manifold-2026-new-year-new-stuff ; Metaculus https://www.metaculus.com/aib/2026/spring/ ; Limitless/Myriad/Opinion.trade/Predict/Clearing Co https://privy.io/blog/beyond-polymarket-and-kalshi-five-prediction-markets-we-are-paying-attention-to ; Kalshi/Polymarket character https://pillarlabai.com/blog/kalshi-vs-polymarket-2026/ . All checked 2026-08-15.

### 3.2 Notable cross-platform findings

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 3.2a | **Kalshi and Polymarket now use the same fee formula shape**: `feeRate × C × P × (1−P)`. Kalshi's taker rate is 0.07 flat; Polymarket's is category-dependent 0–0.07. Kalshi rounds **up to the next cent**; Polymarket rounds to **5 decimals** with a 0.00001 USDC minimum. | VERIFIED (both formulas from their own docs/derived) | https://sailgp.com/prediction-markets/kalshi/fees ; https://help.polymarket.com/en/articles/13364478-trading-fees | 2026-08-15 |
| 3.2b | Kalshi's UI "feels like a brokerage account"; Polymarket's is "a crypto-native order book, with all the transparency (on-chain settlement, visible wallet activity) and friction (gas, wallet management) that implies." | VERIFIED (as characterisation) | https://pillarlabai.com/blog/kalshi-vs-polymarket-2026/ | 2026-08-15 |
| 3.2c | Kalshi "charges transparent per-contract fees scaled to price and volume, deducted automatically - no surprises, but it does eat into thin-edge positions." | VERIFIED | https://pillarlabai.com/blog/kalshi-vs-polymarket-2026/ | 2026-08-15 |
| 3.2d | Manifold shipped a **user calibration interface** in 2026 showing Sharpe ratio, 12-month max drawdown, volatility, and "calibration as a function of probability buckets" as a chart. | VERIFIED | https://news.manifold.markets/p/manifold-2026-new-year-new-stuff | 2026-08-15 |
| 3.2e | Manifold shipped **Predictle**, a daily game where users rank five markets by probability - gamified probability literacy. | VERIFIED | https://news.manifold.markets/p/manifold-2026-new-year-new-stuff | 2026-08-15 |
| 3.2f | Prediction markets industry-wide have "largely failed to build engagement mechanics independent of major events, creating a 'boom-bust retention pattern' that remains unsolved." | VERIFIED (as claim by design source) | https://avark.agency/learn/prediction-market-design-patterns | 2026-08-15 |
| 3.2g | Dominant list pattern is **card-based**; cards must "degrade gracefully on mobile, showing only event, probability, and a single action button." | VERIFIED | https://avark.agency/learn/prediction-market-design-patterns | 2026-08-15 |
| 3.2h | Market detail should use **three-layer progressive disclosure**: L1 event + probability + binary action + outcome description; L2 probability chart + recent trades + resolution criteria + position sizing; L3 full order book + depth charts + specs + portfolio tools. | VERIFIED (recommendation) | https://avark.agency/learn/prediction-market-design-patterns | 2026-08-15 |
| 3.2i | **"Make resolution criteria prominent, not buried. If users do not trust that resolution will be fair and transparent, nothing else in the interface matters."** | VERIFIED (recommendation) | https://avark.agency/learn/prediction-market-design-patterns | 2026-08-15 |
| 3.2j | Dual-format probability display (cents **and** percent simultaneously) is recommended; Robinhood's "72¢" label cited as exemplary. Multi-outcome markets: horizontal proportional bars colour-coded per outcome are "the emerging standard." | VERIFIED (recommendation) | https://avark.agency/learn/prediction-market-design-patterns | 2026-08-15 |

---

## 4. AI Forecasting & Decision-Support

### 4.1 How good are AI forecasters, actually? (This bounds what we may claim.)

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 4.1a | On ForecastBench (as of Oct 2025), LLMs forecast better than the average member of the public: **Brier 0.101 for LLMs vs 0.081 for superforecasters**; "the median public forecaster ranks #22." | VERIFIED (as reported synthesis) | https://forum.effectivealtruism.org/posts/Spyz3wESZu2eeqhDj/ai-forecasting-in-2026-what-11-analyses-say | 2026-08-15 |
| 4.1b | **"Pros beat bots in every comparison"** across four quarterly tournaments, margins of **8.9 to 20.03 peer-score points**. | VERIFIED (as reported) | same | 2026-08-15 |
| 4.1c | Parity projections disagree: Metaculus FutureEval → single-prompt baseline bots beat Pros ~**June 2027**; Forecasting Research Institute → **Nov 2026 (95% CI Dec 2025–Jan 2028)** at 0.016 Brier-points/year. | VERIFIED (as reported) / CONFLICTING between the two methods | same | 2026-08-15 |
| 4.1d | **Overconfidence is the dominant failure mode**: "a single misinterpretation, hallucination, or stale-news error at very high confidence can erase a season of gains," motivating **capping extreme predictions**. | VERIFIED (as reported) | same | 2026-08-15 |
| 4.1e | Post-hoc **Platt/logistic recalibration** improves bot Brier by **0.016** (binary) and **0.005** (multiple-choice), both p<0.001. | VERIFIED (as reported) | same | 2026-08-15 |
| 4.1f | **Training-data staleness degrades forecasting**: Daily Oracle shows 21.5% (true/false) and 11.3% (multiple-choice) degradation over 4 years of pre-training-data ageing. | VERIFIED (as reported) | same | 2026-08-15 |
| 4.1g | **Models cannot "pretend not to know"**: a 52% Brier gap when LLMs are asked to disregard their knowledge - retrospective/backtested AI-forecast claims are systematically contaminated by information and temporal leakage; one paper's results "do not replicate on a different question set." | VERIFIED (as reported) | same | 2026-08-15 |
| 4.1h | Common implementation bugs: misreading unresolved questions as resolved; units/date confusion (cost 80 points on one question). | VERIFIED (as reported) | same | 2026-08-15 |
| 4.1i | **Human forecasters using AI assistance show 24–28% accuracy improvements.** | VERIFIED (as reported) | same | 2026-08-15 |

> **4.1i is the strategic finding.** The defensible product claim is *not* "our AI predicts better than the market." It is **"AI assistance measurably improves human forecasters."** That is what the widget should deliver: assistance, framing, and evidence - not an oracle.

### 4.2 How AI forecasting programmes present results

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 4.2a | Metaculus AI Benchmark (Spring 2026, $58,000 prize pool) runs 4-month seasons plus a bi-weekly "MiniBench." | VERIFIED | https://www.metaculus.com/aib/2026/spring/ | 2026-08-15 |
| 4.2b | Bots must run **without human intervention** and **"post a comment explaining reasoning alongside each forecast."** Reasoning-with-forecast is a rule, not a nicety. | VERIFIED | https://www.metaculus.com/aib/2026/spring/ | 2026-08-15 |
| 4.2c | Bot performance is **explicitly benchmarked against the Metaculus human community prediction** on identical questions. | VERIFIED | https://www.metaculus.com/aib/2026/spring/ | 2026-08-15 |
| 4.2d | Which scoring rule the AIB uses (Brier / log / peer) and how calibration is visualised on that page. | **UNKNOWN** - not stated on the tournament page fetched. (Peer score is referenced in the synthesis at 4.1b, but not confirmed as the AIB's rule.) | https://www.metaculus.com/aib/2026/spring/ | 2026-08-15 |
| 4.2e | A Spring 2026 AI Forecasting Benchmark announcement exists with further tournament detail. | VERIFIED (exists) / not fetched | https://forum.effectivealtruism.org/posts/5EX9dz7nKthcxECTe/announcing-spring-2026-ai-forecasting-benchmark | 2026-08-15 |

### 4.3 AI decision-support products aimed at prediction markets

| # | Product | What it does / how it presents probability | Status | Source | Checked |
|---|---|---|---|---|---|
| 4.3a | **Alphascope** - research workflow combining live odds, AI forecasts, market-linked news, cross-platform analysis. Shows **"market probability beside AI forecast context, making disagreement visible."** Surfaces pricing gaps across Polymarket and Kalshi. Free tier, no card. | VERIFIED (vendor-adjacent source; Alphascope also authors the blog - treat as marketing-inflected) | https://www.alphascope.app/blog/best-ai-tools-prediction-markets | 2026-08-15 |
| 4.3b | **Polifly** - Polymarket-focused AI analyzer, "locating potential edge before a trade"; per-contract AI analysis. Uncertainty display not detailed. | VERIFIED (as described) | same | 2026-08-15 |
| 4.3c | **Metaculus** listed as calibration-focused framing of uncertainty, not a trading terminal; answers questions rather than scanning markets. | VERIFIED (as described) | same | 2026-08-15 |
| 4.3d | **ChatGPT/Claude** - only produce probabilities meaningfully "when current sources are supplied or retrieved"; good at conditional probabilities and disconfirming evidence; require the user to name the contract. | VERIFIED (as described) | same | 2026-08-15 |
| 4.3e | **Dune** - SQL over on-chain trades/wallets; dashboards, not probabilities. | VERIFIED (as described) | same | 2026-08-15 |
| 4.3f | Whether any of these publish their own **calibration track record**. | **UNKNOWN** - none of the surveyed AI market tools was shown to publish measured calibration. | - | 2026-08-15 |

### 4.4 Evidence-presentation UI (Perplexity-style)

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 4.4a | Seven citation UI patterns for 2026: (1) inline numbered citations with hover preview; (2) source-card sidebar (favicon, title, domain, excerpt); (3) **claim-level attribution** - "paragraph-level only" citations let unsourced inferences blend with sourced claims; (4) deep-link to the source passage; (5) **confidence / citation-strength indicators** (strong/mixed/weak/unsupported) to avoid the "equal-weighting illusion"; (6) source filtering/trust controls; (7) **"citation graveyard" / missing-source disclosure** - explicitly badge unsourced claims. | VERIFIED (as recommendations) | https://www.aydesign.ai/blog/ai-citation-source-ui-patterns-2026 | 2026-08-15 |
| 4.4b | Recommended priority: inline citations + source sidebar first (highest trust per unit of effort); claim-level attribution and deep-linking for high-stakes domains. | VERIFIED | same | 2026-08-15 |
| 4.4c | Perplexity keeps the **source panel perpetually visible** beside the answer; hover on `[1]` expands source context without leaving the answer. | VERIFIED (as design analysis) | https://blakecrosley.com/guides/design/perplexity | 2026-08-15 |
| 4.4d | Perplexity's staged reveal: search box (not a chat prompt) → sources appear **first** → answer streams → follow-ups. Phase indicators: **Searching** (orange), **Reading** (blue), **Writing** (green). | VERIFIED (as design analysis) | same | 2026-08-15 |
| 4.4e | Perplexity treats **ambiguous queries as a system failure, not a user failure** - it triggers refinement suggestions rather than returning weak results. | VERIFIED (as design analysis) | same | 2026-08-15 |
| 4.4f | Chunked streaming (natural groupings) is preferable to character-by-character output. | VERIFIED (recommendation) | same | 2026-08-15 |

---

## 5. Differentiation Opportunities for Our Widget

Ranked by (gap strength × feasibility in 48h × defensibility).

1. **Be the only embeddable surface with a real, fee-accurate order preview.** Everyone else stops at odds display (2.3a). Walk the order book (1.5d), apply `C × feeRate × p × (1−p)` (1.4b–1.4c), show net cost, average fill, and payout. Simulated execution means we can do this with **zero auth** (1.5a–1.5c).
2. **Search inside the widget.** No surveyed embed lets an end user find a market; publishers pre-pick one (2.3d, 1.1g). Gamma `/events` + `/markets` are unauthenticated and support ordering by `volume24hr`/`liquidity` (1.5a, 1.5e).
3. **AI that assists selection, framed as assistance.** The literature supports "AI-assisted humans improve 24–28%" (4.1i) and refutes "AI beats pros" (4.1b). Ship the former claim, never the latter.
4. **Show AI estimate *next to* market probability, with disagreement as the headline artifact.** Alphascope validates the pattern - "making disagreement visible" (4.3a) - and Metaculus institutionalises benchmarking bots against the human community prediction (4.2c).
5. **Reasoning + citations are mandatory, not optional.** Metaculus *requires* bots to post reasoning alongside each forecast (4.2b). Adopt claim-level citations and explicit unsupported-claim badges (4.4a).
6. **Cap extreme AI probabilities and say why.** Directly motivated by 4.1d. A visible clamp (e.g. never render an AI estimate outside a bounded interval, and label it) is a credibility feature, not a limitation.
7. **Resolution criteria in the primary flow.** 3.2i is unusually emphatic and cheap to honour: pull resolution rules from Gamma and surface them before the confirm step.
8. **Thin-book honesty.** Adopt Polymarket's own rule: spread > $0.10 → show last traded price, not midpoint (1.3a). Then say so in the UI.

---

## 6. What We Should NOT Copy

| # | Do not copy | Why | Basis |
|---|---|---|---|
| 6.1 | **Display-only embeds.** Rendering odds with a "View Market" button is a solved, free, commoditised category. Building another one is building the thing that already exists three times over. | Official embed (1.1i), PredictWidget (2.1b), PredScope (2.1c) all occupy it. | VERIFIED |
| 6.2 | **"0% fees" messaging.** Widely repeated across the web and now **factually wrong** for most Polymarket categories. Copying it would ship a miscalculated preview. | 1.4a–1.4h | CONFLICTING→resolved |
| 6.3 | **Hiding order-book depth and volume** (the Robinhood simplification). It removes trust signals; named as an anti-pattern. | "Hidden order book depth and volume… removes trust signals despite simplifying the interface." | https://avark.agency/learn/prediction-market-design-patterns |
| 6.4 | **Aggressive colour flashing / stock-ticker anxiety.** Green/red directional indicators should be subtle and desaturated; sudden number changes "feel jarring and trigger anxiety." | Same source recommends animating 72%→74% over **200–300ms**. | https://avark.agency/learn/prediction-market-design-patterns |
| 6.5 | **Data dumps without natural-language explanation.** Named anti-pattern: confuses users unfamiliar with trading. | same | same |
| 6.6 | **Heavy onboarding before exploration.** "Overly complex onboarding before users can explore the product" is a named anti-pattern - fatal for a 380×600 widget. | same | same |
| 6.7 | **Gamification of forecasting accuracy** (Manifold's Predictle, mana shop, cosmetics, loss leaderboards, streak freezes). Excellent for a play-money community; wrong for a widget that simulates real money. | 3.2d–3.2e | VERIFIED |
| 6.8 | **Play-money mental model generally.** Manifold's zero fees + mana economy trains expectations that do not transfer to Polymarket's fee-bearing, USDC-settled markets. | 3.2 table | VERIFIED |
| 6.9 | **Headless autonomous trading agents.** The OSS ecosystem is saturated with snipers, arbitrage and market-making bots (2.1f–2.1g). Zero differentiation, and it inverts the brief (assist a human, not replace them). | 2.1f | VERIFIED |
| 6.10 | **Retrospective/backtested AI accuracy claims.** Systematically contaminated by information and temporal leakage; a 52% Brier gap when models are asked to ignore what they know; one headline paper fails to replicate. Never show a backtested win-rate. | 4.1g | VERIFIED |
| 6.11 | **"Our AI beats the market / beats forecasters."** Pros beat bots in every comparison measured, by 8.9–20.03 peer-score points. This claim is currently false and is the fastest way to lose credibility with an expert reviewer. | 4.1b | VERIFIED |
| 6.12 | **Paragraph-level-only citations.** They let unsourced model inference blend invisibly into sourced claims. | 4.4a pattern 3 | VERIFIED |
| 6.13 | **Affiliate-link monetisation as a design driver** (PredictWidget's model, official embed's `?via=`). It biases the widget toward click-out, which is the opposite of our "complete the decision in place" thesis. | 1.1c, 2.1a | VERIFIED |
| 6.14 | **Push-notification retention mechanics.** Cited as a core mobile retention lever but requires "granular control to prevent fatigue" - out of scope for a widget and a fatigue liability. | avark | VERIFIED |
| 6.15 | **Crypto-native friction as identity.** Polymarket's wallet/gas/bridging friction is characterised as inherent to its design. A simulated-bet widget has no reason to reproduce any of it. | 3.2b | VERIFIED |

---

## Sources

All URLs checked **2026-08-15**.

**Polymarket official**
- https://embed.polymarket.com/
- https://embed.polymarket.com/market.html?market=favorite-to-win-on-polymarket-one-day-after-debate&features=volume&theme=dark
- https://docs.polymarket.com/polymarket-learn/FAQ/embeds (302 → help centre)
- https://help.polymarket.com/en/articles/13364174-how-to-use-embeds
- https://help.polymarket.com/en/articles/13364478-trading-fees
- https://github.com/Polymarket/agent-skills/blob/main/market-data.md
- https://github.com/Polymarket/polymarket-cli
- https://polymarket.com/event

**Polymarket ecosystem / third-party**
- https://predictwidget.com/polymarket-widget
- https://predscope.com/guide/embed-widget
- https://www.polycatalog.io/
- https://dev.to/idasweeney129012/5-open-source-polymarket-github-repos-developers-are-forking-in-2026-plus-the-official-clob-3li2
- https://dev.to/manja316/building-a-free-polymarket-screener-how-i-turned-13963-markets-into-a-single-scannable-page-nna
- https://github.com/viral-sangani/Polymarket-clone
- https://github.com/iPaulPro/PolymarketAttestActionModule
- https://github.com/NYTEMODEONLY/polyterm
- https://github.com/txbabaxyz/polyrec
- https://github.com/direkturcrypto/polymarket-terminal
- https://github.com/aarora4/Awesome-Prediction-Market-Tools
- https://github.com/BlockRunAI/polymarket-agent
- https://rekko.ai/docs/guides/polymarket-api-guide
- https://www.parlay.run/polymarket-api
- https://www.crowdfundinsider.com/2026/03/268884-polymarket-to-impose-taker-fees-on-nearly-all-trading-categories/
- https://support.substack.com/hc/en-us/articles/28879761546260-How-do-I-embed-Polymarket-odds-on-Substack

**Adjacent prediction markets**
- https://sailgp.com/prediction-markets/kalshi/fees
- https://www.dimers.com/prediction-markets/kalshi/fees
- https://pillarlabai.com/blog/kalshi-vs-polymarket-2026/
- https://cryptoslate.com/prediction-markets/manifold-predictions-review/
- https://news.manifold.markets/p/manifold-2026-new-year-new-stuff
- https://privy.io/blog/beyond-polymarket-and-kalshi-five-prediction-markets-we-are-paying-attention-to
- https://www.alphascope.app/blog/how-does-polymarket-work
- https://avark.agency/learn/prediction-market-design-patterns

**AI forecasting & evidence UI**
- https://www.metaculus.com/aib/2026/spring/
- https://forum.effectivealtruism.org/posts/Spyz3wESZu2eeqhDj/ai-forecasting-in-2026-what-11-analyses-say
- https://forum.effectivealtruism.org/posts/5EX9dz7nKthcxECTe/announcing-spring-2026-ai-forecasting-benchmark
- https://www.alphascope.app/blog/best-ai-tools-prediction-markets
- https://www.aydesign.ai/blog/ai-citation-source-ui-patterns-2026
- https://blakecrosley.com/guides/design/perplexity
