# SOURCES_UX.md - structured source ledger

All records from the competitive + UX research pass for the Polymarket widget.
Date format ISO. Status ∈ VERIFIED / INFERRED / UNKNOWN / CONFLICTING.
Confidence ∈ high / medium / low.

---

id: S-001
topic: Polymarket official embed product
claim: Polymarket runs an official embed builder at embed.polymarket.com offering Standard and Banner layouts, configurable dimensions ("Fit container" supported), affiliate code via ?via=, and toggles for chart, buy buttons, volume, live activity, Y axis, grid rows, border and dark mode; output is an iframe with src=https://embed.polymarket.com/market? defaulting to 400x400.
source: https://embed.polymarket.com/
source_type: official product page
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: First-party embed generator producing a copy-paste iframe with a broad set of display toggles and a mandatory Polymarket branding link.
implication: The "display live odds on a page" category is already owned by Polymarket itself, for free. Our widget must be differentiated by interaction (search, outcome selection, order preview), not by display.

---

id: S-002
topic: Polymarket embed limitations
claim: Embeds are available for Web/CMS, Twitter/X and Substack, and "currently supports single markets only" - market collections or groups cannot be embedded.
source: https://help.polymarket.com/en/articles/13364174-how-to-use-embeds
source_type: official help centre (reached via 302 from docs.polymarket.com/polymarket-learn/FAQ/embeds)
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: Official embeds are single-market, live-updating odds displays with a light/dark toggle.
implication: Multi-market comparison and in-widget search are unserved by the official product - both are legitimate differentiators.

---

id: S-003
topic: Polymarket embed is display-only
claim: The rendered embed shows title, probabilities, "$5m Vol." with an All-time filter, outcome rows with cent prices, and a "View Market" CTA; all interactive elements link out to polymarket.com with utm_medium=embed&utm_campaign=market and tid params. No trade can be executed inside the frame.
source: https://embed.polymarket.com/market.html?market=favorite-to-win-on-polymarket-one-day-after-debate&features=volume&theme=dark
source_type: live embed page (direct observation of rendered output)
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: Official embed is a display + click-out surface, monetised via affiliate/UTM attribution.
implication: The core gap is confirmed - nobody offers "select an outcome and preview a bet" inside an embeddable frame. This is our product thesis.

---

id: S-004
topic: Embed buy-button ambiguity
claim: The embed builder exposes a "Buy buttons - show/hide purchase functionality" toggle, which reads as in-frame purchasing, but the observed embed markup routes those actions to polymarket.com via UTM-tagged links.
source: https://embed.polymarket.com/ (builder copy) vs https://embed.polymarket.com/market.html?... (rendered output)
source_type: official product page vs direct observation
date_checked: 2026-08-15
status: CONFLICTING
confidence: medium
summary: Resolved in favour of the observed behaviour - "buy buttons" are deep-links, not in-frame execution.
implication: Do not cite Polymarket as offering in-frame trading. If a reviewer challenges our gap claim, this is the record that settles it.

---

id: S-005
topic: Polymarket oEmbed
claim: Whether Polymarket publishes an oEmbed endpoint or oEmbed discovery tags.
source: https://help.polymarket.com/en/articles/13364174-how-to-use-embeds ; https://support.substack.com/hc/en-us/articles/28879761546260-How-do-I-embed-Polymarket-odds-on-Substack
source_type: official help centre + platform partner help centre
date_checked: 2026-08-15
status: UNKNOWN
confidence: low
summary: X and Substack unfurl Polymarket URLs, which is consistent with oEmbed but also with bespoke per-platform integrations. No oEmbed spec or endpoint was located.
implication: Do not design around an assumed oEmbed contract. If we want unfurl-style distribution we must implement our own oEmbed provider and verify it independently.

---

id: S-006
topic: Embed terms, rate limits, frame-ancestors
claim: Documented terms for commercial reuse of the official embed, any rate limits applied to it, and whether embed.polymarket.com restricts framing via X-Frame-Options / CSP frame-ancestors.
source: https://embed.polymarket.com/ ; https://help.polymarket.com/en/articles/13364174-how-to-use-embeds
source_type: official
date_checked: 2026-08-15
status: UNKNOWN
confidence: low
summary: Not addressed in either official surface.
implication: Only material if we ever wrap their embed. Building our own UI on the public APIs avoids the question entirely - a further argument for not re-skinning their iframe.

---

id: S-007
topic: Polymarket market list structure
claim: Market cards carry question title, implied probability quoted 0-100 cents, 24h volume and outcome options; left-nav categories include Politics, Sports, Crypto, Esports, Finance; sort by 24hr Volume, filter All vs Active; each share pays $1 if it resolves in its favour and $0 otherwise; detail pages expose price history, order book and full resolution rules.
source: https://polymarket.com/event
source_type: official product page
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: Card-based discovery, cent-denominated pricing, binary $1 payout primitive, order book and resolution rules on detail pages.
implication: Our result rows should mirror this information set (question, probability, volume, close date) so the widget feels native to anyone who knows Polymarket.

---

id: S-008
topic: Polymarket order ticket field labels
claim: The exact field labels and layout of Polymarket's live buy/sell ticket.
source: no source located
source_type: n/a
date_checked: 2026-08-15
status: UNKNOWN
confidence: low
summary: No fetched source enumerated the live order ticket's fields; reviews describe mechanics but not labels.
implication: The implementing agent should inspect polymarket.com directly before finalising copy, so our labels either match or deliberately improve on theirs.

---

id: S-009
topic: Polymarket order types and book visibility
claim: Order entry supports market orders (instant) and limit orders at a chosen price with an entry size; all resting orders and their sizes are visible with bid/ask spreads; positions appear in a portfolio and can be sold before resolution.
source: https://www.alphascope.app/blog/how-does-polymarket-work
source_type: third-party explainer (vendor blog)
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Confirms full CLOB semantics with public depth.
implication: Order-book depth is available to show, which supports the "do not hide depth" recommendation; also confirms walking the book is a legitimate pricing method.

---

id: S-010
topic: Polymarket taker fees (critical)
claim: Makers are never charged; only takers pay. fee = C x feeRate x p x (1 - p), where C = shares and p = price. feeRate: Crypto 0.07; Sports/Economics/Culture/Weather/Other 0.05; Finance/Politics/Mentions/Tech 0.04; Geopolitics 0. Denominated in USDC, rounded to 5 decimals, minimum 0.00001 USDC. Symmetric around 50% - a trade at 30c costs the same as at 70c. Document dated 2026-07-10, references a prior "Polymarket Exchange Upgrade: April 28, 2026".
source: https://help.polymarket.com/en/articles/13364478-trading-fees
source_type: official help centre
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: Polymarket charges category-dependent taker fees using a price-symmetric formula; the fee peaks at p=0.5 and vanishes at the extremes.
implication: Hardcode this formula in the order preview and cite it in code comments. Any preview omitting it understates cost. Name the category rate in the UI since it ranges 0-7%.

---

id: S-011
topic: Fee announcement timing
claim: Polymarket moved to impose taker fees across nearly all trading categories, reported March 2026.
source: https://www.crowdfundinsider.com/2026/03/268884-polymarket-to-impose-taker-fees-on-nearly-all-trading-categories/
source_type: trade press
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Corroborates that the fee regime is recent, explaining why much of the web is stale on this point.
implication: Treat any pre-2026 or undated source describing Polymarket as fee-free as unreliable.

---

id: S-012
topic: Stale "0% fees" claims
claim: Multiple 2026-dated secondary sources still state "Trading fees: currently 0% on most markets" and "no explicit trading fee on most markets".
source: https://www.alphascope.app/blog/how-does-polymarket-work ; https://pillarlabai.com/blog/kalshi-vs-polymarket-2026/
source_type: third-party blogs
date_checked: 2026-08-15
status: CONFLICTING
confidence: high
summary: Directly contradicted by the official help centre (S-010). Resolved against these sources.
implication: The single highest-risk factual trap in this project. Anyone implementing from general web knowledge will build a wrong preview.

---

id: S-013
topic: Polymarket public read APIs
claim: Gamma API https://gamma-api.polymarket.com - no auth required (GET /events?active=true&closed=false&limit=100, GET /markets?slug={slug}). Data API https://data-api.polymarket.com - no auth. CLOB https://clob.polymarket.com - no auth for read endpoints (GET /book?token_id=, POST /books, GET /price?token_id=&side=BUY, POST /prices, POST /midpoints, POST /spreads). Price history via SDK with interval in {1h,6h,1d,1w,1m,max}.
source: https://github.com/Polymarket/agent-skills/blob/main/market-data.md
source_type: official Polymarket repository
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: The complete read path for search, market detail, orderbook and history requires no authentication.
implication: A search + detail + order-preview + simulated-bet widget is achievable with zero auth. This removes the largest schedule risk from a 48h build.

---

id: S-014
topic: Computing execution price from the book
claim: Orderbook returns {bids:[{price,size}...], asks:[{price,size}...]}. Best ask = buy price, best bid = sell price, midpoint = average of the two. "Walk the orderbook to estimate slippage for a given order size" via calculateMarketPrice().
source: https://github.com/Polymarket/agent-skills/blob/main/market-data.md
source_type: official Polymarket repository
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: Polymarket's own guidance is to walk the book for size-dependent pricing.
implication: Our average-fill calculation is method-blessed by the vendor, not an invention. Use it for the "Avg. price" line.

---

id: S-015
topic: Thin-book price display rule
claim: "If bid-ask spread > $0.10, Polymarket UI shows last traded price instead of midpoint."
source: https://github.com/Polymarket/agent-skills/blob/main/market-data.md
source_type: official Polymarket repository
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: A concrete, official heuristic for which number to display when the book is wide.
implication: Adopt verbatim, and label the fallback in the UI so the displayed price is never silently substituted.

---

id: S-016
topic: CLOB read authentication conflict
claim: A third-party guide states CLOB GET /book requires HMAC-SHA256 auth with POLY-API-KEY / POLY-TIMESTAMP / POLY-SIGNATURE headers.
source: https://rekko.ai/docs/guides/polymarket-api-guide
source_type: third-party developer guide
date_checked: 2026-08-15
status: CONFLICTING
confidence: high
summary: Contradicted by Polymarket's own repo (S-013), which states "no auth for read endpoints". Resolved in favour of the official source.
implication: Do not build an auth layer for market data reads. If a read 401s in practice, that is a signal to re-check, not to assume auth is required.

---

id: S-017
topic: Gamma query parameters
claim: Gamma GET /markets supports limit, active, order (volume24hr | volume | liquidity | endDate), ascending, and tag.
source: https://rekko.ai/docs/guides/polymarket-api-guide
source_type: third-party developer guide
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Sorting by 24h volume and liquidity, and filtering by tag, are available server-side.
implication: "Trending" and category chips in the widget can be a single server-side query rather than client-side sorting of a large payload - important for a small widget on a slow connection.

---

id: S-018
topic: Polymarket API rate limits
claim: Published numeric rate limits for Gamma and CLOB reads.
source: https://github.com/Polymarket/agent-skills/blob/main/market-data.md ; https://rekko.ai/docs/guides/polymarket-api-guide
source_type: official repo + third-party guide
date_checked: 2026-08-15
status: UNKNOWN
confidence: low
summary: Official doc documents none; one secondary says "no published limit (reasonable use expected)" with advice against aggressive polling, another says limits "vary by endpoint".
implication: Assume limits exist. Cache aggressively, back off on 429, and treat rate-limiting as a "refreshing paused" state rather than an error.

---

id: S-019
topic: CORS from an embedding origin
claim: Whether Polymarket's public endpoints permit browser-origin fetch from an arbitrary third-party embedding origin.
source: no source located
source_type: n/a
date_checked: 2026-08-15
status: UNKNOWN
confidence: low
summary: Not documented anywhere fetched.
implication: Highest-priority implementation unknown. Test on day one; if CORS is restrictive the widget needs a thin proxy, which changes the deployment shape.

---

id: S-020
topic: Official Polymarket client libraries
claim: Official CLOB clients exist for Python (github.com/Polymarket/py-clob-client) and TypeScript (github.com/polymarket/clob-client); an official CLI exists at github.com/Polymarket/polymarket-cli.
source: https://dev.to/idasweeney129012/5-open-source-polymarket-github-repos-developers-are-forking-in-2026-plus-the-official-clob-3li2 ; https://github.com/Polymarket/polymarket-cli
source_type: developer roundup + official repo
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: First-party SDKs in both relevant languages.
implication: Use the TypeScript client for a browser/Node widget rather than hand-rolling request signing or book-walking.

---

id: S-021
topic: Third-party widget - PredictWidget
claim: Free hosted Polymarket widget; live odds refreshed roughly every 5 seconds; featured (single event) and list modes; auto-shows top trending markets by 24h volume; no Polymarket account or API key needed; supports WordPress, Webflow, Squarespace and plain HTML; monetised by affiliate commission on click-through. Display-only - it "sends traffic to Polymarket" and does not facilitate trading. Stated gaps: no customisation of which markets display, limited theming, third-party infra dependency.
source: https://predictwidget.com/polymarket-widget
source_type: vendor product page
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: The main independent widget is also display-only and affiliate-monetised.
implication: Second independent confirmation of the gap. Also sets the adoption bar: two lines of copy-paste HTML, no API key. Our embed ceremony must be equally light.

---

id: S-022
topic: Third-party widget - PredScope
claim: PredScope offers a free prediction-market widget for embedding live odds.
source: https://predscope.com/guide/embed-widget
source_type: vendor guide
date_checked: 2026-08-15
status: VERIFIED (existence) / UNKNOWN (feature depth)
confidence: medium
summary: A third player in the display-only embed category; not fetched in depth.
implication: Reinforces that odds-display embeds are commoditised. Not worth deeper investigation unless we pivot to display.

---

id: S-023
topic: Polymarket tool ecosystem shape
claim: PolyCatalog lists 216+ tools across Trading & Automation, Analytics & Research, Dashboards & Portfolio, Alerts & Monitoring, Developer Infrastructure, and Interfaces (browser extensions, aggregators, mobile alternatives). Featured: PolyBot Pro (AI trading bot), AlertPilot (arbitrage scanner), PolyTimer (Chrome extension), Predictify (aggregator), Poly SDK (TypeScript). No featured projects appear under widgets/embeds; no featured Telegram/Discord bots despite the category existing; the directory is "strongest in trading automation and least developed in social/messaging platform integrations."
source: https://www.polycatalog.io/
source_type: third-party directory
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: A large ecosystem heavily weighted toward headless automation, with embeddable interfaces conspicuously thin.
implication: Third independent signal for the widget gap. Also a warning: do not build another trading bot - that category is saturated.

---

id: S-024
topic: Open-source Polymarket repos
claim: The repos being forked in 2026 are backend bots - arbitrage (TypeScript), oracle-lag snipers, Rust trading bots, auto-traders with risk limits, market-maker bots. "No UI/widget code is mentioned." Official clients are py-clob-client and clob-client.
source: https://dev.to/idasweeney129012/5-open-source-polymarket-github-repos-developers-are-forking-in-2026-plus-the-official-clob-3li2
source_type: developer roundup
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: The OSS energy is entirely in automation, not interfaces.
implication: Fourth signal for the gap, and confirmation that "autonomous trading agent" is the crowded, undifferentiated choice.

---

id: S-025
topic: Terminal and clone projects
claim: polyterm ("Polymarket in your terminal"); polyrec (real-time TUI for BTC 15-min UP/DOWN markets aggregating Chainlink, Binance and Polymarket book data, 70+ indicators, CSV logging, backtesting); polymarket-terminal (copy/scalping/sniper); Polymarket-clone (Solidity + NextJS + IPFS).
source: https://github.com/NYTEMODEONLY/polyterm ; https://github.com/txbabaxyz/polyrec ; https://github.com/direkturcrypto/polymarket-terminal ; https://github.com/mohamedkhaled105656/polymarket-terminal ; https://github.com/viral-sangani/Polymarket-clone
source_type: repository descriptions
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Terminal UIs target power traders; clones are demo-grade full-stack rebuilds.
implication: Neither serves the embeddable-widget use case. Power-trader density (70+ indicators) is explicitly the wrong direction for a 380x600 assistive widget.

---

id: S-026
topic: Embedding Polymarket into other protocols
claim: PolymarketAttestActionModule is a Lens Protocol Open Action for embedding Polymarket trading within Lens publications.
source: https://github.com/iPaulPro/PolymarketAttestActionModule
source_type: repository description
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Prior art for embedding *trading* (not just odds) into a third-party content surface.
implication: The strongest existing analogue to our thesis, but scoped to one social protocol rather than the open web. Worth reviewing for interaction ideas.

---

id: S-027
topic: Discovery at scale is a pain point
claim: A developer built a free Polymarket screener that turned 13,963 markets into a single scannable page.
source: https://dev.to/manja316/building-a-free-polymarket-screener-how-i-turned-13963-markets-into-a-single-scannable-page-nna
source_type: developer blog
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Market count is in the ~14k range and finding the right market is a felt problem people build tools to solve.
implication: Validates in-widget search and AI-assisted market selection as real needs, not invented ones. Also sets scale expectations for the search index.

---

id: S-028
topic: Prediction-market tool landscape
claim: A curated list catalogues prediction-market tools spanning AI agents, analytics, APIs, dashboards, copy trading, alerting and tracking.
source: https://github.com/aarora4/Awesome-Prediction-Market-Tools
source_type: curated repository list
date_checked: 2026-08-15
status: VERIFIED
confidence: low
summary: Secondary index of the ecosystem; not fetched in depth.
implication: Useful as a completeness check for the implementing agent before claiming novelty.

---

id: S-029
topic: Autonomous AI trading agent
claim: polymarket-agent is an autonomous AI-powered prediction-market trading agent using x402 micropayments.
source: https://github.com/BlockRunAI/polymarket-agent
source_type: repository description
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: AI in this ecosystem currently means headless autonomous execution.
implication: Our differentiation is the inverse - AI as visible, cited, human-in-the-loop assistance inside an interface. Explicitly not an agent that trades.

---

id: S-030
topic: Kalshi fee formulas
claim: Kalshi trading fees = roundup(0.07 x C x P x (1 - P)); maker fees = roundup(0.0175 x C x P x (1 - P)), where P is price in dollars and C is contract count. Both round up to the next cent. Trading fees apply on immediate match; maker fees apply to resting orders that later execute; cancelled resting orders incur no fee. Rounding overpayments above $10 are reimbursed in the first week of the following month.
source: https://sailgp.com/prediction-markets/kalshi/fees
source_type: third-party fee explainer
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Kalshi uses the same price-symmetric fee shape as Polymarket, at a flat 0.07 taker rate, rounded up to the cent.
implication: The p(1-p) fee shape is now an industry convention, not a Polymarket quirk. Our preview logic generalises if we later add Kalshi.

---

id: S-031
topic: Kalshi fee presentation
claim: A second Kalshi fee explainer gives only simplified per-contract tables ($0.01-$0.02 per contract, lower for 100+) and states users "can confirm this firsthand before making a trade", without documenting order-ticket display mechanics.
source: https://www.dimers.com/prediction-markets/kalshi/fees
source_type: third-party fee explainer
date_checked: 2026-08-15
status: UNKNOWN
confidence: low
summary: Confirms fees are visible pre-trade but does not describe the ticket.
implication: Kalshi's exact ticket layout remains unverified; do not describe it as if observed.

---

id: S-032
topic: Kalshi vs Polymarket product character
claim: Kalshi "feels like a brokerage account"; Polymarket is "a crypto-native order book, with all the transparency (on-chain settlement, visible wallet activity) and friction (gas considerations, wallet management) that implies." Kalshi "charges transparent per-contract fees scaled to price and volume, deducted automatically - no surprises, but it does eat into thin-edge positions."
source: https://pillarlabai.com/blog/kalshi-vs-polymarket-2026/
source_type: third-party review
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Two different cost-communication philosophies: Kalshi automatic and transparent, Polymarket implicit and crypto-mediated.
implication: Kalshi's "no surprises" automatic fee deduction is the standard our preview should meet. Note this same article carries the stale zero-fee claim (S-012) - cite it for character, not for fees.

---

id: S-033
topic: Manifold mechanism and order ticket
claim: Manifold uses a hybrid model - "trades fill against open orders first and then against the AMM". Contracts display as probabilities (e.g. "a 60% market estimate"). The order ticket "show[s] bet amount, payout, and price impact before execution". Trading fees are zero: "M0 on trades", but "cost comes from AMM price impact and available limit-order liquidity". API covers markets, users, bets, comments and positions, with WebSocket live topics and bulk historical downloads.
source: https://cryptoslate.com/prediction-markets/manifold-predictions-review/
source_type: third-party review
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Manifold already ships the prediction-market order-preview pattern: amount, payout and price impact shown pre-execution.
implication: Direct precedent for our five-line preview. Our addition is the fee line, which Manifold does not need and Polymarket now requires.

---

id: S-034
topic: Manifold 2026 features
claim: Manifold shipped a user calibration interface with Sharpe ratio, 12-month max drawdown, volatility, and "calibration as a function of probability buckets" charted; plus Predictle (daily game ranking five markets by probability), a Mana Shop with cosmetics and streak freezes, tiered mana subscriptions, margin loans, and an all-time Loss leaderboard.
source: https://news.manifold.markets/p/manifold-2026-new-year-new-stuff
source_type: official platform blog
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: Manifold is investing in calibration literacy and heavy gamification.
implication: Adopt calibration-by-probability-bucket as the honest way to ever show a track record. Reject the gamification layer - wrong register for a widget simulating real money.

---

id: S-035
topic: Emerging prediction markets
claim: Limitless (Base) supports natural-language expressions of market conditions with binary collateralised shares, optimised for frequent short-duration hourly/daily markets. Myriad is social-first with a media-driven distribution strategy, multi-chain, past $100M USDC volume, positioning prediction markets as "a social layer for information discovery". Opinion.trade positions as a "people's terminal" for macro signals with AI-assisted oracles. Predict (BNB Chain) leads with education and AI-proposed outcomes reviewed internally. The Clearing Company is building a CFTC-registered DCO for stablecoin-native clearing.
source: https://privy.io/blog/beyond-polymarket-and-kalshi-five-prediction-markets-we-are-paying-attention-to
source_type: infrastructure vendor blog
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: New entrants differentiate on distribution (Myriad), duration (Limitless), education (Predict) and regulation (Clearing Co) rather than on trading UI.
implication: Myriad's "social layer / media distribution" thesis is the closest strategic neighbour to an embeddable widget - embedding into content surfaces is a recognised growth vector, not a niche idea.

---

id: S-036
topic: Prediction-market UX patterns
claim: Card-based browsing dominates and cards must "degrade gracefully on mobile, showing only event, probability, and a single action button". Market detail should use three-layer progressive disclosure (L1 event/probability/binary action/outcome description; L2 probability chart/recent trades/resolution criteria/position sizing; L3 full order book/depth charts/specs/portfolio). "Make resolution criteria prominent, not buried. If users do not trust that resolution will be fair and transparent, nothing else in the interface matters." Dual-format probability (cents and percent) recommended, Robinhood's "72c" cited. Multi-outcome: horizontal proportional bars colour-coded per outcome are "the emerging standard". Charts should "communicate uncertainty, not just price history". Animate probability changes over 200-300ms because "sudden number changes feel jarring and trigger anxiety"; keep green/red subtle and desaturated to avoid "stock ticker anxiety"; show "Updated 3s ago" timestamps. Mobile: ruthless hierarchy, thumb-zone trade buttons. Named anti-patterns: data dumps without natural-language explanation; hidden order-book depth and volume (Robinhood's choice) which "removes trust signals"; aggressive notification or colour flashing; overly complex onboarding before exploration; emotionally flat trade confirmations. The industry has "largely failed to build engagement mechanics independent of major events", producing an unsolved boom-bust retention pattern.
source: https://avark.agency/learn/prediction-market-design-patterns
source_type: design agency guide
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: The densest single source of prediction-market-specific UI guidance found, including named anti-patterns and concrete timings.
implication: Backbone of the UX recommendations. Note it is agency thought-leadership rather than empirical research - treat timings (200-300ms) as sensible defaults, not validated findings.

---

id: S-037
topic: LLM forecasting accuracy 2026
claim: On ForecastBench (Oct 2025) LLMs beat the average public forecaster - Brier 0.101 vs superforecasters' 0.081; the median public forecaster ranks #22. "Pros beat bots in every comparison" across four quarterly tournaments, margins 8.9 to 20.03 peer-score points. Parity projections: Metaculus FutureEval ~June 2027; Forecasting Research Institute Nov 2026 (95% CI Dec 2025-Jan 2028) at 0.016 Brier points/year. Overconfidence dominates failures - "a single misinterpretation, hallucination, or stale-news error at very high confidence can erase a season of gains", motivating capping extreme predictions. Logistic recalibration improves bot Brier by 0.016 (binary) and 0.005 (multiple-choice), p<0.001. Daily Oracle shows 21.5% (T/F) and 11.3% (MC) degradation over 4 years of pre-training-data ageing. LLMs asked to pretend they don't know show a 52% Brier gap. Superforecaster-parity claims suffer information and temporal leakage; one paper does not replicate on a different question set. Common bugs: treating unresolved questions as resolved, units/date confusion. Human forecasters using AI assistance show 24-28% accuracy improvements.
source: https://forum.effectivealtruism.org/posts/Spyz3wESZu2eeqhDj/ai-forecasting-in-2026-what-11-analyses-say
source_type: research synthesis (community forum, aggregating 11 analyses)
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: AI forecasters beat the public but consistently lose to professionals; overconfidence and leakage are the headline risks; AI-assisted humans improve substantially.
implication: Defines what we may claim. Ship "AI assistance improves human forecasters" (24-28%), never "our AI beats the market". Clamp extreme AI probabilities and disclose the clamp. Never show backtested win-rates.

---

id: S-038
topic: Metaculus AI Forecasting Benchmark
claim: The Spring 2026 AIB runs 4-month seasons plus a bi-weekly MiniBench, with a $58,000 prize pool. Bots must operate without human intervention and "post a comment explaining reasoning alongside each forecast". Performance is "benchmarked against the Metaculus human community prediction" on identical questions. Scoring rule and calibration presentation are not stated on the page.
source: https://www.metaculus.com/aib/2026/spring/
source_type: official tournament page
date_checked: 2026-08-15
status: VERIFIED (rules) / UNKNOWN (scoring rule, calibration display)
confidence: high
summary: The leading AI forecasting programme mandates published reasoning per forecast and benchmarks bots against the human crowd.
implication: Two design mandates fall out directly - never show an AI probability without its reasoning, and always show the AI estimate beside the market/crowd number.

---

id: S-039
topic: Spring 2026 AIB announcement
claim: A detailed announcement post for the Spring 2026 AI Forecasting Benchmark exists.
source: https://forum.effectivealtruism.org/posts/5EX9dz7nKthcxECTe/announcing-spring-2026-ai-forecasting-benchmark
source_type: community forum announcement
date_checked: 2026-08-15
status: VERIFIED (existence) / not fetched
confidence: low
summary: Identified but not read; likely contains the scoring-rule detail missing from S-038.
implication: Follow-up read if we need to resolve the AIB scoring-rule UNKNOWN.

---

id: S-040
topic: AI tools for prediction markets
claim: Alphascope combines live odds, AI forecasts, market-linked news and cross-platform analysis, showing "market probability beside AI forecast context, making disagreement visible", surfacing pricing gaps across Polymarket and Kalshi; free tier, no card. Polifly is a Polymarket-focused AI analyzer for "locating potential edge before a trade". Metaculus is framed as calibration-focused, not a trading terminal. ChatGPT/Claude produce useful probabilities "only when current sources are supplied or retrieved" and are good at conditional probabilities and disconfirming evidence. Dune provides SQL dashboards, not probabilities.
source: https://www.alphascope.app/blog/best-ai-tools-prediction-markets
source_type: vendor blog (Alphascope reviewing a field it competes in)
date_checked: 2026-08-15
status: VERIFIED (as descriptions)
confidence: low
summary: The AI-assist category exists but lives in standalone terminals; the "show disagreement" pattern is the shared idea.
implication: Adopt "market beside AI, disagreement visible". Discount the self-favourable ranking. None of these is embeddable - the embedded AI-assist surface remains unoccupied.

---

id: S-041
topic: AI calibration track records
claim: Whether any AI prediction-market tool publishes its own measured calibration.
source: no source located
source_type: n/a
date_checked: 2026-08-15
status: UNKNOWN
confidence: low
summary: None of the surveyed tools was shown to publish calibration data.
implication: Publishing calibration (Manifold-style, by probability bucket) would be a genuine trust differentiator - but only after enough resolved questions exist. Do not fake it.

---

id: S-042
topic: AI citation UI patterns
claim: Seven patterns for 2026: inline numbered citations with hover preview; source-card sidebar (favicon, title, domain, excerpt); claim-level citation attribution, since "paragraph-level only" citations let unsourced inferences blend with sourced claims; deep-link to the source passage; confidence and citation-strength indicators (strong/mixed/weak/unsupported) to avoid the "equal-weighting illusion"; source filtering and trust controls; and citation-graveyard / missing-source disclosure that explicitly badges unsourced claims. Recommended priority: inline citations plus source sidebar first, escalating to claim-level attribution and deep-linking for high-stakes domains.
source: https://www.aydesign.ai/blog/ai-citation-source-ui-patterns-2026
source_type: design blog
date_checked: 2026-08-15
status: VERIFIED (as recommendations)
confidence: medium
summary: A named vocabulary for evidence UI, including how to mark what is not sourced.
implication: Betting decisions are high-stakes, so go straight to claim-level attribution plus explicit unsourced badging. Derive the confidence badge from source count and agreement, never from model self-report.

---

id: S-043
topic: Perplexity interaction design
claim: Citations are foundational, not supplementary - inline [1][2] markers on factual claims, a perpetually visible source panel with favicon/domain/snippet, hover to expand without leaving the answer. Progressive disclosure runs search box (not a chat prompt) -> sources appear first -> answer streams -> follow-ups. Three phase indicators: Searching (orange), Reading (blue), Writing (green); sources fade in staggered. Ambiguous queries trigger refinement suggestions rather than weak results, "treating insufficient context as a system failure, not user failure". Chunked streaming grouped naturally beats character-by-character.
source: https://blakecrosley.com/guides/design/perplexity
source_type: design analysis
date_checked: 2026-08-15
status: VERIFIED (as design analysis)
confidence: medium
summary: Sources-before-answer plus visible phase indicators is the pattern that makes AI read as researcher rather than oracle.
implication: Adopt directly for the AI-assist panel and for empty search results. Third-party analysis, not Perplexity's own documentation - describe as a pattern, not as Perplexity's stated intent.

---

id: S-044
topic: Price impact vs slippage
claim: Price impact is "the change in token price caused by your own trade... the difference between the current market price and how your trade impacts the total liquidity in a pool". Slippage is "the difference between the price you expect to receive after swapping and what you actually receive after the swap is complete".
source: https://support.uniswap.org/hc/en-us/articles/8643794102669-Price-Impact-vs-Price-Slippage
source_type: official vendor support doc
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: Two distinct concepts routinely conflated in trading UIs.
implication: Our size-dependent average fill is price impact. Slippage (quote-to-settlement drift) does not apply to a simulated bet - do not ship a slippage-tolerance control.

---

id: S-045
topic: Uniswap slippage settings
claim: The Uniswap Web App applies auto-slippage "usually between 0.1% and 5%, based on live gas fees and your swap size". Presets: 0.5%, 1%, 5%, or custom. "If the price moves beyond your tolerance, the swap won't go through" and users "will still pay the network cost". Searchers "may front-run or sandwich large swaps".
source: https://blog.uniswap.org/what-is-slippage-crypto
source_type: official vendor blog
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: Auto-tuned tolerance with presets; failed swaps still cost gas; MEV named as a slippage cause.
implication: "Failure is not free" is the transferable lesson - if our widget cannot price a bet, explain precisely why rather than failing generically.

---

id: S-046
topic: Uniswap warning thresholds
claim: The specific percentages at which Uniswap escalates price-impact warnings.
source: https://support.uniswap.org/hc/en-us/articles/8643794102669-Price-Impact-vs-Price-Slippage ; https://blog.uniswap.org/what-is-slippage-crypto
source_type: official vendor docs
date_checked: 2026-08-15
status: UNKNOWN
confidence: low
summary: Not stated in the fetched support material.
implication: Do not cite a threshold we cannot source. Set our own price-impact warning threshold and document it as our choice.

---

id: S-047
topic: DEX interface best practices
claim: Show price impact alongside the fiat equivalent in the "to" field; showing it in main form, details panel and preview screen at once is "useful but possibly overkill". "Minimum received" and "slippage" are "two sides of the same coin" - do not list both as independent items. Make slippage directly editable from the details panel as an accelerator. Four items belong in the main form's corners: wallet balance, Max button, fiat equivalent, price impact on received amount. A preview screen creates beneficial friction by forcing reconsideration but risks redundancy - decide deliberately whether the details panel is always visible or click-to-expand. Use the main CTA button for contextual error states ("switch network", "connect wallet") and have it perform the fix on click rather than merely alerting.
source: https://ethereum.org/developers/docs/design-and-ux/dex-design-best-practice/
source_type: ethereum.org developer documentation
date_checked: 2026-08-15
status: VERIFIED (as recommendations)
confidence: high
summary: The canonical write-up of swap-form information architecture, including the CTA-as-error-surface pattern.
implication: Adopt the CTA-as-error-surface ladder verbatim. Heed the redundancy warning - at 380px, show price impact once.

---

id: S-048
topic: Jupiter swap preview
claim: The quote surfaces estimated output, price impact, minimum received after slippage tolerance, route composition (Raydium, Orca, Meteora, Phoenix) and a fee breakdown. Jupiter charges "0% protocol fee to retail users"; costs are underlying DEX pool fees (0.01-0.30%), Solana network fees and optional Jito priority tips. Slippage tolerance sits behind a settings gear, with guidance of 0.1-0.5% for liquid pairs, 0.5-1.5% for established memecoins, 2-10%+ for fresh launches. Quotes "update continuously until you sign"; refresh interval not published.
source: https://uwuu.ai/blog/jupiter-swap
source_type: third-party guide
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Best-in-class preview itemises fees by origin rather than lumping them, and keeps quotes live until commitment.
implication: Itemise our cost by origin (shares x avg price, then fee) rather than showing one blended total. Keep the quote live and stamped with freshness up to the confirm action.

---

id: S-049
topic: Secure embeddable widget architecture
claim: Hosts should embed third-party widgets via sandboxed iframe (sandbox="allow-scripts allow-forms"), never a direct script tag. "Without allow-same-origin, the iframe runs in a special 'null' origin security context" with no access to parent DOM, localStorage or cookies; adding allow-same-origin "completely defeats isolation". Communication is postMessage-only through a message bus that validates event.source against known iframe windows and validates message structure. Dynamic resizing uses ResizeObserver on document.body posting {type:'resize', height: document.body.scrollHeight} to the parent, which sets iframe.style.height. Sandboxing inherently isolates CSS in both directions, so theming must be passed via postMessage rather than inherited. Each iframe can carry its own CSP independent of the host. Caveats: never eval message content, validate structure, rate-limit handlers, do not pass auth tokens through postMessage. Practical ceiling 10-100 concurrent widgets per page.
source: https://medium.com/aveva-tech/building-secure-widget-systems-with-javascript-iframes-4efd1e7963cc
source_type: engineering blog
date_checked: 2026-08-15
status: VERIFIED (as recommendations)
confidence: medium
summary: Written from the host's perspective, but it defines the environment a well-behaved widget must survive.
implication: Assume no localStorage, no cookies, no CSS inheritance. Keep state in memory, take theme as an explicit input, and ship the ResizeObserver/postMessage height protocol on day one with a versioned message contract.

---

id: S-050
topic: CSP frame directives
claim: frame-ancestors controls who may frame your page; frame-src controls what your page may frame. They are distinct directives serving opposite directions.
source: https://www.codegenes.net/blog/content-security-policy-for-frame-frame-src-vs-frame-ancestors/
source_type: technical blog
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: Clarifies which directive governs embeddability of our widget (frame-ancestors) versus what hosts must allow (frame-src).
implication: Our widget origin must not set a restrictive frame-ancestors, and our embed docs should tell hosts to allow our origin in their frame-src.

---

id: S-051
topic: Partitioned storage edge cases
claim: An embedded third-party iframe opening a new tab or window to the same third-party site does not straightforwardly share partitioned cookies with its opener - an open issue in the CHIPS specification.
source: https://github.com/privacycg/CHIPS/issues/82
source_type: standards working-group issue tracker
date_checked: 2026-08-15
status: VERIFIED (as an open issue)
confidence: medium
summary: Third-party storage partitioning has unresolved continuity gaps across the iframe/new-tab boundary.
implication: Never design a flow that hands off from the widget to a popup and expects shared session state. Reinforces keeping the widget stateless.

---

id: S-052
topic: Container queries for widgets
claim: Container size queries have baseline support across all major browsers since 2023 and length units are fully supported; container style queries are incomplete (Firefox pending) and scroll-state queries are Chrome/Edge/Opera only. Syntax: container-type: inline-size (shorthand container: card / inline-size), queried with @container (min-width: 400px). Units cqi, cqb, cqmin, cqmax; e.g. font-size: clamp(14px, 10px + 1.33cqi, 20px). "When component sizes vary independently of the viewport, media queries alone cannot solve the problem"; components "flow naturally in any layout, whether narrow or wide". Gotchas: a container cannot query itself; flex items need explicit sizing or content collapses; custom properties do not work in query conditions; avoid grid items as containers, add a wrapper; containment is performance opt-in. Adoption ~41%.
source: https://blog.logrocket.com/container-queries-2026/
source_type: engineering blog
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: Container queries are the correct and now-safe mechanism for components whose width is decoupled from the viewport.
implication: Use container queries for every widget breakpoint. Media queries would key off the host page's viewport and give a 380px widget desktop styles inside a wide page.

---

id: S-053
topic: Modern CSS theming
claim: light-dark(a, b) returns a in light schemes and b in dark, responding to the computed color-scheme property rather than only prefers-color-scheme. color-scheme: light dark on root respects OS preference and can be overridden at any level. contrast-color(c) auto-selects black or white for best WCAG contrast against c. @container style() queries allow branching on custom property values. Adaptive elevation: swap shadows in light for glowing borders in dark via light-dark(). The set is "Baseline Newly Available... stable in all browser engines as of May 2026"; @function syntax is Chrome 139+ only.
source: https://una.im/modern-css-theming
source_type: practitioner blog (CSS working-group adjacent author)
date_checked: 2026-08-15
status: VERIFIED
confidence: high
summary: A single mechanism delivering both host-override and OS-preference theming, stable across engines as of May 2026.
implication: Set color-scheme from a host-provided theme param, defaulting to "light dark". Use light-dark() for all themed values and contrast-color() for outcome chips so YES/NO badges stay legible in both schemes.

---

id: S-054
topic: Keyboard navigation and ARIA for complex widgets
claim: Core model - Tab/Shift+Tab moves between widgets, arrow keys navigate within them. Roving tabindex: one item at tabindex="0", siblings at "-1", arrows update them, making the composite a single tab stop. Editable combobox: type to filter, Down moves into suggestions, Up/Down navigate without committing, Enter confirms, Escape dismisses while preserving typed text. Required ARIA: role="combobox", aria-haspopup="listbox", aria-expanded, role="listbox"/"option", aria-selected, aria-activedescendant. Modals: focus to first meaningful element on open, Tab cycles within only, background inert, Escape closes and restores focus to the stored trigger. Lists: Home/End first/last, Page Up/Down for long lists, arrows move focus without changing selection. Focus indicators need minimum 3:1 contrast. DOM order must match visual layout; no keyboard traps; always an escape route. Manual keyboard-only testing must verify tab order, visible focus at every step, no traps, documented keys, and screen-reader announcement of roles/states/shortcuts.
source: https://www.uxpin.com/studio/blog/keyboard-navigation-patterns-complex-widgets/
source_type: design tool vendor blog summarising ARIA Authoring Practices
date_checked: 2026-08-15
status: VERIFIED (as recommendations)
confidence: high
summary: Standard ARIA practice; roving tabindex and combobox semantics are the two patterns our widget needs most.
implication: Market search is a real combobox, not an input plus a div list. Result list and outcome selector are each one tab stop - essential at 380px where 20 results would otherwise mean 20 tab presses to reach the CTA. Secondary source restating W3C practice; verify against APG before implementation.

---

id: S-055
topic: WCAG keyboard requirement
claim: WCAG 2.1.1 requires all functionality to be operable through a keyboard interface.
source: https://www.uxpin.com/studio/blog/wcag-211-keyboard-accessibility-explained/
source_type: vendor blog
date_checked: 2026-08-15
status: VERIFIED (existence of guidance) / not fetched in depth
confidence: low
summary: Identified as supporting reference for the keyboard requirement; not read in full.
implication: Cite W3C directly rather than this secondary source in any formal accessibility statement.

---

id: S-056
topic: Accessible modals and focus traps
claim: Guidance exists on building accessible modals with focus traps.
source: https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/
source_type: vendor blog
date_checked: 2026-08-15
status: VERIFIED (existence) / not fetched in depth
confidence: low
summary: Supporting reference for the modal recommendation in S-054; not read in full.
implication: Largely moot if we follow the recommendation to use an in-place confirm step rather than a modal at 380x600.

---

id: S-057
topic: Substack embed support
claim: Substack documents embedding Polymarket odds by pasting the market link directly into a post.
source: https://support.substack.com/hc/en-us/articles/28879761546260-How-do-I-embed-Polymarket-odds-on-Substack
source_type: platform partner help centre
date_checked: 2026-08-15
status: VERIFIED
confidence: medium
summary: A major publishing platform has first-class support for Polymarket odds embeds.
implication: Confirms real publisher demand for prediction-market embeds, and sets the distribution bar a new widget would have to clear. Also the main evidence behind the unresolved oEmbed question (S-005).

---

id: S-058
topic: Polymarket screener / market count context
claim: Polymarket carried roughly 13,963 markets at the time a community screener was built.
source: https://dev.to/manja316/building-a-free-polymarket-screener-how-i-turned-13963-markets-into-a-single-scannable-page-nna
source_type: developer blog
date_checked: 2026-08-15
status: INFERRED
confidence: low
summary: A point-in-time count from one developer's dataset, not an official figure.
implication: Order-of-magnitude planning input for search indexing (~10^4 markets). Do not quote as an official statistic.
# SOURCES - Strategy / Evaluation Research

All entries checked **2026-08-15** by the strategy research agent.
Record format is fixed; one block per source. Referenced as `[Sxx]` from `STRATEGY_RESEARCH.md` and `BACKTEST_PLAN.md`.

Status legend: VERIFIED (read in the cited source) / INFERRED (my synthesis) / UNKNOWN (unconfirmed) / CONFLICTING (credible disagreement).
Confidence legend: HIGH / MEDIUM / LOW - my confidence that the claim is true *and* applies to our use case.

---

id: S01
topic: Benchmark infrastructure - ForecastBench site
claim: ForecastBench is a dynamic, contamination-free benchmark of LLM forecasting accuracy with human comparison groups; it runs Tournament (tool use allowed), Preliminary, and Baseline (base model, no tools) leaderboards, scored with a difficulty-adjusted Brier score presented as a "Brier Index" on a 0–100% scale. Human baselines (Superforecaster, Public) were last surveyed July 2024. Reference lines include Always 0.5, Imputed Forecaster, Naive Forecaster, Always 0, Random Uniform.
source: https://www.forecastbench.org/ , https://www.forecastbench.org/leaderboards/ , https://www.forecastbench.org/explore/ , https://www.forecastbench.org/docs/
source_type: Official benchmark website
date_checked: 2026-08-15
status: VERIFIED (structure) / UNKNOWN (live numeric leaderboard - rendered client-side; CSV endpoints returned 403 through the agent proxy)
confidence: HIGH for structure, N/A for numbers
summary: The canonical live benchmark for LLM forecasting. Human comparison values date from July 2024 and are carried forward, which is a material caveat for every "parity" claim built on it.
implication: Adopt its market-question scoring convention (score vs the market on the same question). Do not cite live leaderboard numbers we could not read.

---

id: S02
topic: LLM vs human forecasting - primary benchmark paper
claim: On ForecastBench, superforecasters scored Brier 0.096 overall (0.118 dataset / 0.074 market), general public 0.121 (0.153 / 0.089), best LLM Claude-3.5-Sonnet 0.122 (0.138 / 0.107), GPT-4-Turbo 0.128 (0.162 / 0.095), GPT-4o 0.128 (0.186 / 0.069). Superforecasters beat the best LLM by 0.026, p<0.001. Question bank 6,435 (2,060 market from Metaculus/Polymarket/Manifold/RFI selected for liquidity; 4,375 dataset from ACLED/FRED/DBnomics/Wikipedia/Yahoo Finance at 8 horizons, 7–3,650 days). 1,000 questions to LLMs every two weeks, 200-question human subset. 500 public participants (Prolific/Facebook, ~49 responses/question); 39 superforecasters over 9 days, ≥3 forecasts/question (avg 8). Missing LLM forecasts imputed with the crowd forecast on market questions and 0.5 on dataset questions. Difficulty-adjusted Brier: γ̂ⱼ = w_mkt·b_mkt,j + (1−w_mkt)·γ̂ᴼᴸˢⱼ, public leaderboard uses w_mkt = 1; rescaled so always-0.5 → 0.25.
source: https://faculty.wharton.upenn.edu/wp-content/uploads/2026/02/ForecastBench_A_Dynamic_.pdf ; https://arxiv.org/abs/2409.19839 ; https://www.forecastbench.org/assets/pdfs/forecastbench_updated_methodology.pdf
source_type: Peer-reviewed (ICLR 2025) + updated methodology report
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: The reference dataset for LLM-vs-human forecasting. Market questions are markedly easier than dataset questions for everyone; on the market subset GPT-4o (0.069) actually beat superforecasters (0.074).
implication: Two things directly transfer to us - (1) score against the market on the same question (w_mkt=1), (2) impute the market price for abstained markets rather than silently dropping them.

---

id: S03
topic: LLM vs superforecaster - most optimistic current claim
claim: As of 2026-07-16, 17 systems on the preliminary ForecastBench leaderboard exceed superforecasters on dataset questions; Cassi AI ranks above the superforecaster median on *market* questions for the first time. Bootstrap p-values: Cassi 0.41, xAI 0.15–0.16, Google DeepMind 0.14 (cannot reject equal accuracy). Authors' caveat: "95% CIs for many of these submissions overlap substantially; results are more consistent with superforecaster parity than with outperformance." Superforecaster data is from 2024 and extrapolated.
source: https://forecastingresearch.substack.com/p/ai-models-have-likely-reached-parity
source_type: Research-org blog (Forecasting Research Institute - the benchmark's own authors)
date_checked: 2026-08-15
status: VERIFIED (as reported); CONFLICTING with S07/S08
confidence: MEDIUM - self-reported by the benchmark's authors, against a two-year-old human baseline
summary: Claims parity, not superiority, and explicitly against a 2024 human snapshot.
implication: We may cite "parity claims exist" but must pair them with the contradicting live-tournament evidence.

---

id: S04
topic: LLM vs superforecaster - trend line
claim: As of 2026-01-29, superforecasters lead state-of-the-art LLMs by 0.017 Brier points. Claude 3.5 Sonnet (Oct 2024) 0.117; Grok 4.20 Preview (run Oct 2025) 0.102 - ~0.015 Brier/year improvement. Extrapolated parity: overall Nov 2026 (95% CI Jan 2026 – Nov 2027); dataset questions Jun 2026; market questions Aug 2026.
source: https://forecastingresearch.substack.com/p/llms-are-closing-the-gap-on-human
source_type: Research-org blog
date_checked: 2026-08-15
status: VERIFIED
confidence: MEDIUM (extrapolation with a 22-month-wide CI)
summary: A ~0.015 Brier/year improvement rate with a parity CI so wide it spans "already happened" to "two years away."
implication: The honest framing is "the gap is closing at an uncertain rate", not "LLMs have caught up."

---

id: S05
topic: Metric interpretability
claim: Brier Index = (1 − √Brier) × 100%. 100% = perfect, 50% = always predicting 0.5, 0% = maximally wrong. October 2025 values: superforecasters 70.6% (raw Brier 0.086); best LLMs (Cassi ensemble_2_crowdadj, xAI Grok 4.20 Preview) 67.9% (raw 0.103). The 2.7 pp gap ≈ one year of LLM progress.
source: https://forecastingresearch.substack.com/p/introducing-the-brier-index
source_type: Research-org blog
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: A monotone rescaling of Brier for readability; adds no statistical information.
implication: Optional UI nicety. Does not fix the cross-dataset comparability problem (see S29).

---

id: S06
topic: Meta-analysis of the whole AI-forecasting evidence base - MOST IMPORTANT SINGLE SOURCE
claim: Synthesises 11 analyses. Key contents: (a) Metaculus AIB pro-vs-bot gaps Q3 2024 −11.3 (p=0.036), Q4 2024 −8.9 (p=0.079), Q1 2025 −17.7 (p=0.001), Q2 2025 −20.03 (p=0.00001); (b) "the Pro advantage is discrimination, not calibration"; (c) automated prompt engineering gained ~18 pts on GPT-4.1-nano, moderate on 4.1, none on R1 - and Part 2 (Feb 2026) was a null result that failed to replicate live; (d) Fall 2025 survey of 39 bot makers: research breadth r=0.42 p=0.006, winners 1.75 sources vs 1.00, 34/39 used frontier models; (e) search-provider analysis: "best search is uncertain" each season, no provider with consistent advantage; (f) Platt scaling improved bot Brier by 0.016 on binary (p<0.001) and 0.005 on MC (p<0.001); Phan's external validation 0.0999→0.0934; (g) FutureEval extrapolates bot-vs-pro parity ~Jun 2027 vs ForecastBench's Nov 2026; (h) contamination catalogue: Phan et al. "539 paper" did not replicate (Halawi Sep 2024), leakage via "cutoff-date confusion and faulty Google date indexing"; Reasoning-and-Tools used Google date-range filters "known for temporal leakage"; Silicon Crowd's equivalence bound (ΔBrier ≤ 0.081) so wide "a constant 50% forecast would also qualify"; AIA Forecaster acknowledged leakage in ~1.65% of search results; Simulated Ignorance Fails found a 52% Brier gap. Conclusion: superforecaster-parity claims rest on retrospective backtesting with admitted leakage, and forward-looking leaderboards contradict the strongest claims.
source: https://forum.effectivealtruism.org/posts/Spyz3wESZu2eeqhDj/ai-forecasting-in-2026-what-11-analyses-say (also on LessWrong: https://www.lesswrong.com/posts/a82q6yd8zKpYk56cF/ai-forecasting-in-2026-what-11-analyses-say)
source_type: Practitioner meta-analysis (EA Forum / LessWrong), 2026
date_checked: 2026-08-15
status: VERIFIED (as a faithful synthesis of primary sources I independently spot-checked: S07, S08, S09, S16)
confidence: HIGH - every primary claim I checked held up
summary: The single best map of the field's disagreement, and the strongest available statement that retrospective LLM forecasting evaluation is unreliable.
implication: Read this first. It underwrites almost all of Section B4/B5 of BACKTEST_PLAN.md.

---

id: S07
topic: Live forward-looking tournament - the pessimistic strand
claim: Q2 2025 Metaculus AI Benchmark: 348 bot questions, 93 compared; 54 bot-makers, 42 in-house Metac Bots, 10 Pro Forecasters, $30,000 prize pool. Pros beat bots head-to-head by −20.03 (95% CI [−28.63, −11.41]), p=0.00001. All 10 pros in the top 10; best bot (metac-o3) 11th. By type: MC −32.9, numeric −23.2, binary −14.8. Metaculus community prediction averages peer score 12.9. Gap widened across quarters (−11.3 → −8.9 → −17.7 → −20.03).
source: https://www.lesswrong.com/posts/Surnjh8A4WjgtQTkZ/q2-ai-benchmark-results-pros-maintain-clear-lead ; https://forum.effectivealtruism.org/posts/F2stjK9wHSy3HPEC9/q2-ai-benchmark-results-pros-maintain-clear-lead
source_type: Tournament results write-up (Metaculus)
date_checked: 2026-08-15
status: VERIFIED; CONFLICTING with S03/S04
confidence: HIGH
summary: In live, contemporaneous, forward-looking competition, professional humans beat LLM bots decisively and by a widening margin - bots are worst on non-binary question types.
implication: This is the evidence base a skeptical reviewer will cite. Our messaging must not claim LLM superiority.

---

id: S08
topic: Live forward-looking tournament - prior quarter
claim: Q1 2025 Metaculus AIB: 424 questions (15 annulled), 96 compared; 34 bots + 11 template bots vs 10 pros. Head-to-head −17.7 (95% CI [−28.3, −7.0]), p=0.0007. Authors note "large confidence intervals do not let us discern any trend."
source: https://www.lesswrong.com/posts/rDy5z8ZEtMrEGnfBd/q1-ai-benchmark-results-pro-forecasters-crush-bots
source_type: Tournament results write-up (Metaculus), published 2025-06-30
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: Corroborates S07 and shows a 15/424 ≈ 3.5% annulment rate on curated questions.
implication: Annulment is a real category (~3.5% here); pre-declare how we handle it.

---

id: S09
topic: Contamination - THE decisive paper for Section B5
claim: "Simulated Ignorance" (instructing a model to suppress pre-cutoff knowledge) fails to replicate "True Ignorance". Across 477 competition-level forecasting questions and 9 LLMs, cutoff instructions leave a 52% performance gap between SI and TI. Chain-of-thought fails to suppress prior knowledge even when reasoning traces contain no explicit post-cutoff references. Reasoning-optimised models exhibit *worse* SI fidelity despite better traces. Authors conclude prompts "cannot reliably 'rewind' model knowledge", that SI-based benchmarking is "methodologically flawed", and recommend prospective evaluation despite latency.
source: https://arxiv.org/abs/2601.13717 (Li, Wang, El Lahib, Xia, Pi; 2026-01-20)
source_type: arXiv preprint
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH - the finding is mechanistically plausible and corroborated by S06's independent catalogue
summary: You cannot ask a model to forget. Retrospective LLM forecasting evaluation on resolved questions is not measuring forecasting.
implication: Kills the retrospective backtest as evidence. Justifies the live-holdout harness as the primary deliverable.

---

id: S10
topic: Retrieval and ensembling - the canonical system paper
claim: Retrieval-augmented, fine-tuned LM forecasting system. Test: 914 binary questions from 5 platforms resolving ≥ 2023-06-01 (train 3,762 / val 840, all resolved before that date). System Brier 0.179 vs crowd aggregate 0.149 (accuracy 71.5% vs 77.0%) - the system LOST to the crowd overall. Conditional results: crowd in 0.3–0.7 → system 0.238 vs crowd 0.240; ≥5 relevant articles → 0.175 vs 0.143; all conditions jointly → 0.240 vs 0.247. Ablations: no fine-tuning 0.186 (+0.007); no retrieval and no fine-tuning 0.206 (+0.027). Optimal k=15 retrieved summaries. Ensembling: 6 forecasts via trimmed mean (3 base + 3 fine-tuned). Fine-tuning on 13,253 of 73,632 candidate samples. Contamination controls: strict temporal split plus manual verification on 20 recent events.
source: https://arxiv.org/abs/2402.18563 , https://arxiv.org/pdf/2402.18563 , https://proceedings.neurips.cc/paper_files/paper/2024/file/5a5acfd0876c940d81619c1dc60e7748-Paper-Conference.pdf (Halawi et al., NeurIPS 2024)
source_type: Peer-reviewed (NeurIPS 2024)
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: Retrieval is worth ~4× fine-tuning (0.020 vs 0.007 Brier), but the full system still trailed the crowd on average and only reached parity in the narrow band where the crowd was uncertain and retrieval was rich.
implication: Directly supplies our gating rules (market price 0.3–0.7; ≥5 relevant dated articles) and our aggregation default (~5–6 samples, trimmed mean). Also: the title says "approaching human-level"; the numbers say it lost. Read numbers, not titles.

---

id: S11
topic: LLM ensembling vs human crowd
claim: 12 LLMs, 31 binary questions, 3-month Metaculus tournament Oct 2023 – Jan 2024, 925 human forecasters. LLM ensemble Brier 0.20 (SD 0.12) vs human crowd 0.19 (SD 0.19); no statistically significant difference (p=0.850). Study 2: giving GPT-4 the human crowd median improved it 0.17 → 0.14 (p=0.003), Claude 2 0.22 → 0.15 (p<0.001) - but the updated LLM was still less accurate than a simple average of human and machine forecasts. Stated limitations: poor calibration, systematic overconfidence, acquiescence bias (predictions skew above 50% despite balanced outcomes), degradation with temporal distance from training data, reliance on well-curated questions.
source: https://www.science.org/doi/10.1126/sciadv.adp1528 ; https://arxiv.org/html/2402.19379v6
source_type: Peer-reviewed (Science Advances)
date_checked: 2026-08-15
status: VERIFIED
confidence: MEDIUM - N=31 makes the null essentially uninformative (S06 notes the equivalence bound was so wide a constant 50% forecast would pass it)
summary: An LLM ensemble matched a human crowd on 31 questions. Showing the LLM the crowd median helps it, but a mechanical average of human + machine beat the LLM-that-saw-the-crowd.
implication: Two design consequences: (1) elicit blind to the market price, then blend numerically - do not let the LLM do the blending; (2) this paper is our precedent for reporting a null honestly at small N.

---

id: S12
topic: Prompting / scaffolding effects on forecast calibration
claim: 37 prompting approaches × 4 models (Claude 3.5 Sonnet, GPT-4o, Claude 3.5 Haiku, Llama 3.1 405B) on 100 binary ForecastBench questions resolving Dec 2024; Study 2 added o1/o1-mini and composite/auto-generated prompts. Significant improvements: Frequency-Based Reasoning −0.014 to −0.019 Brier; Base Rate First −0.011 to −0.016; Step-Back −0.011 to −0.015. Significant degradation: Propose-Evaluate-Select +0.028 to +0.033; explicit Bayesian Reasoning +0.025 to +0.030. Most others within ±0.009. Conclusion: "In the context of complex tasks like forecasting, basic prompt refinements alone offer limited gains."
source: https://arxiv.org/pdf/2506.01578 (Schoenegger, Jones, Tetlock, Mellers)
source_type: arXiv preprint by established forecasting researchers (Tetlock/Mellers)
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: Reference-class/base-rate and frequency framing help by ~0.01–0.02 Brier; "do Bayesian reasoning" and propose-evaluate-select actively hurt.
implication: Use base-rate-first + frequency framing + step-back. Do not ask for explicit Bayesian reasoning. Do not budget more than a couple of hours on prompt tuning - the ceiling is ~0.02 Brier and it may not replicate (S06 item 7).

---

id: S13
topic: LLMs vs expert forecasters, retrospective with post-cutoff controls
claim: 464 binary Metaculus questions (334 main + 130 hold-out) collected Jul–Dec 2024; 12 models (GPT-4o variants, o3/o3-pro, Claude 3.5/3.6 Sonnet, DeepSeek v3/R1, Qwen3); AskNews summaries; 5 predictions/question averaged. Expert forecasters median Brier 0.0225 (on 157 questions); o3 best LLM at 0.1352; frontier models 0.1352–0.2743; human crowd baseline 0.149 from prior work. Direct prompting beat narrative prompting across all models. News collected using publish dates to prevent leakage. Author explicitly warns Brier scores are "not directly comparable across different question sets due to differences in question difficulty."
source: https://arxiv.org/html/2507.04562v3 (Janna Lu, George Mason University)
source_type: arXiv preprint
date_checked: 2026-08-15
status: VERIFIED
confidence: MEDIUM - the 0.0225 expert figure is on a different 157-question subset and is not comparable to the 464-question LLM figures; the author says so
summary: Best LLM beat the crowd baseline but trailed experts by a very large margin on this question set.
implication: A textbook illustration of why cross-question-set Brier comparison is invalid - cite it when refusing to benchmark our number against a published one.

---

id: S14
topic: Post-hoc calibration of LLM forecasts
claim: Beta-Bernoulli Calibrator (BBC) models event probability as a mixture of Beta distributions; mean = calibrated point estimate, variance = epistemic uncertainty; trains on binary outcomes and human forecast distributions. Data: 11,355 resolved binary questions from Metaculus + Polymarket; train 7,824 / val 1,917 / test 1,614, test resolving after Aug 2025 to prevent leakage. With Claude-Sonnet-4 input: Brier 0.146 → 0.125 (−14.4%), AUC 72.3% → 74.2%. Consistently beat Platt scaling and isotonic regression; generalised out-of-distribution to a Kalshi dataset where traditional methods failed. Robust across 7 input LLMs. The learned uncertainty measure predicted forecasting errors better than verbalized confidence.
source: https://arxiv.org/pdf/2605.27668 (Dai, Teehan, Torabian, Ren; 2026-05-26)
source_type: arXiv preprint
date_checked: 2026-08-15
status: VERIFIED
confidence: MEDIUM-HIGH
summary: Post-hoc recalibration is a larger and more reliable lever than prompting (−14.4% vs ~−0.015 Brier), and sample dispersion beats verbalized confidence as an uncertainty signal.
implication: Build the calibrator slot into the architecture but ship it as identity in v1 - we cannot fit it on an uncontaminated set in 48h. Do use sample dispersion in the no-bet gate; that part is free.

---

id: S15
topic: Contamination-free question generation and auto-resolution
claim: Pipeline seeds questions from news (GDELT, Media Cloud) and stock forecasts, refines via ReAct agents with web search, verifies with multiple verifier agents for ambiguity/resolvability/difficulty, deduplicates by embeddings + DBSCAN; produced 1,499 diverse real-world questions. Resolution by 3 Gemini 3 Pro agents voting with Opus 4.5 as tiebreaker; manual verification showed 4.9% error rate (95% CI 1.6%–9.8%); estimated 3.9% annulment rate vs Metaculus's historical ~8%. Model Brier: Gemini 3 Pro 0.134, GPT-5 0.149, Gemini 2.5 Flash 0.179. Limitations: agents struggle with interactive databases and verifying non-events; news-seeded questions skew to current affairs; human experts rated only 75.2% of sampled questions acceptable.
source: https://arxiv.org/html/2601.22444v2 (Bosse, Mühlbacher, Wildman, Phillips, Schwarz - FutureSearch; 2026-03-09)
source_type: arXiv preprint (industry research lab)
date_checked: 2026-08-15
status: VERIFIED
confidence: MEDIUM
summary: Auto-generating fresh post-cutoff questions is viable but carries a ~5% resolution error rate and ~4% annulment rate, and only ~75% of questions pass human quality review.
implication: Gives us defensible numbers for annulment/ambiguity risk in the no-bet gate and in the attrition table. Out of scope to build in 48h.

---

id: S16
topic: State-of-the-art AI forecaster vs MARKET consensus - MOST DESIGN-RELEVANT RESULT
claim: AIA Forecaster comprises (1) agentic search over quality news sources, (2) a supervisor agent reconciling multiple forecasts for one event, (3) statistical calibration countering LLM behavioural biases, (4) extremizing to address overconfidence. On ForecastBench it "achieves performance equal to human superforecasters, surpassing prior LLM baselines." Critically: it UNDERPERFORMS standalone market consensus, but "an ensemble combining AIA Forecaster with market consensus outperforms consensus alone." Introduces a harder benchmark sourced from liquid prediction markets. Claims to be "the first work that verifiably achieves expert-level forecasting at scale."
source: https://arxiv.org/abs/2511.07678 (Alur et al., led by Jasjeet S. Sekhon; submitted 2025-11-10)
source_type: arXiv technical report (industry)
date_checked: 2026-08-15
status: VERIFIED for the claims above; the fetched abstract did not contain absolute Brier numbers (UNKNOWN) and did not discuss leakage (though S06 reports the authors acknowledged ~1.65% of search results were contaminated, on a retrospective evaluation)
confidence: HIGH for the market-consensus finding, MEDIUM for the superforecaster-parity claim
summary: The best-engineered public AI forecaster loses to market consensus alone, but adds information on top of it.
implication: This is the product thesis. Build "AI adjusts the market price", not "AI replaces the market price". It is also the source of the one positive claim we are permitted to make.

---

id: S17
topic: Prediction market calibration and favourite-longshot bias
claim: 353M trades across 429,000 binary contracts (Kalshi 64.7M trades / 210,608 contracts; Polymarket 288.7M trades / ~218,000 contracts), Jul 2021 – Dec 2025. Favourite–longshot bias present: longshots overpriced, favourites underpriced, prices compressed toward 0.50. Compression intensifies with horizon: universal horizon function rises from 0.99 at 0–1 hour to 1.32 beyond one month. Calibration slopes: politics 0.93–1.83; sports 0.90–1.10 short/medium, 1.74+ long-horizon; weather OVERconfident at short horizons (0.69–0.97); crypto and finance relatively well calibrated. Politics ECE 0.117, "five to fifteen times any other domain." Brier by domain: politics 0.119, finance 0.156, entertainment 0.160, weather 0.172, crypto 0.174, sports 0.185.
source: https://arxiv.org/html/2602.19520v2 (Nam Anh Le, National Economics University; v2 2026-08-04)
source_type: arXiv preprint, single author, not peer-reviewed
date_checked: 2026-08-15
status: VERIFIED as a preprint claim; effect direction corroborated by S18
confidence: MEDIUM for exact slopes, HIGH for the direction (70+ years of favourite-longshot literature agrees)
summary: Market prices are systematically compressed toward 0.50, more so at long horizons; politics has the best Brier and the worst calibration simultaneously.
implication: (a) Never equate low Brier with good calibration in the UI. (b) Any "market is biased" heuristic must be conditioned on domain AND time-to-resolution. (c) Long-horizon disagreement is the most bias-consistent - and therefore most self-serving - kind, so be extra skeptical of it.

---

id: S18
topic: Real returns and execution economics on a prediction market
claim: 313,972 prices across 46,282 contracts from 12,403 Kalshi events, 2021 – Apr 2025. Contracts priced under 10¢ lose over 60% of stake on average; low-price contracts win far less often than break-even after fees, high-price contracts win more often. Makers earn −9.64% average returns; takers −31.46% - a 21.8 pp advantage to making. Overall average return across all contracts ≈ −20%. Even "informed" traders (makers on contracts ≥ 50¢) earn only ~+2.6%. Kalshi fee $0.07·P·(1−P) charged only to takers; at 50¢ that is 1.77% of price and proportionally much larger for cheap contracts.
source: https://www2.gwu.edu/~forcpgm/2026-001.pdf (Bürgi, Deng, Whelan; Jan 2026)
source_type: University working paper
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: The average prediction-market participant loses ~20%, and the maker/taker split says most of that loss is execution rather than forecasting.
implication: Quote the taker price and the fee explicitly in the widget. Ban or heavily flag sub-10¢ contracts. This is the strongest empirical basis for the "no bet" gate.

---

id: S19
topic: Near-expiry calibration reversal and coherence violations
claim: ~23M Kalshi moneyline trades (NBA/NHL/MLB), Mar–May 2026. Contracts are near-perfectly calibrated mid-life but distort sharply near expiry; in the final 10 minutes the calibration curve becomes step-like. Near-expiry weighting shows Prelec α̂ > 1, OPPOSITE to canonical lottery-choice findings, attributed to insurance demand by holders of losing positions. Cross-game parlays are systematically overpriced vs the product of leg prices, growing ~3% per leg; a median 11-leg parlay is ~30% above fair value. Authors note the distortions are "systematic and therefore admit computational correction" but do not address post-fee profitability.
source: https://arxiv.org/html/2607.14430 (Moshrefi, Princeton; 2026-07-15)
source_type: arXiv preprint
date_checked: 2026-08-15
status: VERIFIED as a preprint claim; CONFLICTING with S17 on the direction of the near-expiry bias
confidence: MEDIUM
summary: There is no single global bias - the sign flips near expiry. The most robustly detectable mispricings are coherence violations (products/sums that should be internally consistent), not directional opinions.
implication: (a) Add a "near-expiry sports" reject rule. (b) Coherence checks are the model of a resolution-free, contamination-immune diagnostic - see BACKTEST_PLAN §B7. (c) The paper does not claim post-fee profitability, so neither may we.

---

id: S20
topic: Polymarket order-book microstructure - spreads, depth, liquidity
claim: Median quoted half-spread ~400 bps in the central [0.4, 0.6] range, rising to 1,300–1,800 bps below 0.10 - attributed to inventory risk on conditional-token makers rather than behavioural longshot bias. Depth is layered rather than top-heavy (median top-of-book share 0.137, near the uniform-grid benchmark), with a right tail where top-of-book share approaches 1. Maker liquidity is decentralised: median Herfindahl 0.031 ≈ 32 effective makers. On the top-100-volume stratum the median effective half-spread is ≈ 0 (−0.0003 probability points). Methodology warning: effective half-spread changes sign between WebSocket-feed and on-chain trade direction on 67% of markets. Self-counterparty wash trading: median 0.97%, p90 4.5%, p99 10.6%, max 22.2% - far below crypto-exchange benchmarks of 25–70%.
source: https://arxiv.org/html/2604.24366v1 (Philipp D. Dubach; 2026-08-11)
source_type: arXiv preprint
date_checked: 2026-08-15
status: VERIFIED as reported; the "bps" units for the half-spread are AMBIGUOUS in the fetched text (probability points vs % of price) - CONFLICTING/UNRESOLVED
confidence: HIGH for the qualitative pattern, LOW for the absolute spread numbers
summary: Quoted spreads are wide in the tails and non-trivial mid-range, but the top-volume tail of markets is effectively tight. Public-feed trade classification is unreliable.
implication: Do NOT hardcode a spread constant - read the live book from the API. Strongly supports a volume/liquidity filter: the median market is untradeable, only the top stratum is not. Also a caution that any of our own spread analytics built on the public feed may be wrong.

---

id: S21
topic: LLMs trading on Polymarket with realistic execution
claim: PolyBench - 38,666 binary Polymarket markets across 4,997 events, snapshots collected 6–12 Feb 2026; 5,097 markets with complete data (resolved, with order book and news context). Retrospective but contamination-proof: events had not yet occurred at evaluation time. Introduces Confidence-Weighted Return (CWR) with realistic order-book execution, plus APY, Sharpe, temporal resolution error. At $10 base lot: only 2 of 7 models positive (MiMo-V2-Flash +17.6% CWR, Gemini-3-Flash +6.2%); five models lost money despite high confidence scores. Scaling positions to $1,000 degraded both winners substantially due to liquidity constraints. Limitations: only top 5 order-book levels captured; 6-day collection window.
source: https://arxiv.org/html/2604.14199v1 (Cheng, Liu, Long - Sichuan University; 2026-04-03)
source_type: arXiv preprint
date_checked: 2026-08-15
status: VERIFIED as a preprint claim
confidence: MEDIUM (6-day window, top-5 book levels only)
summary: With realistic order-book execution, most LLMs lose money on Polymarket, and the few winners stop winning as size increases.
implication: EV must be quoted at a stated size, walked through the actual book. Also the clearest available evidence against any profitability claim.

---

id: S22
topic: LLMs trading real capital on live prediction markets
claim: Prediction Arena - six frontier models each given $10,000 real capital, trading autonomously on live Kalshi and Polymarket with decisions every 15–45 minutes, 12 Jan – 9 Mar 2026 (57 days); plus 4 next-gen models in a 3-day paper-trading cohort. Kalshi returns −16.0% to −30.8%; Polymarket cohort-1 average −1.1%. Best settlement win rate 71.4% (Grok-4-20-checkpoint). Best return: Gemini-3.1-pro-preview +6.02% on Polymarket over 3 days (paper). Initial prediction accuracy and capitalising on correct predictions were the primary drivers; research volume showed NO correlation with outcomes.
source: https://arxiv.org/abs/2604.07355 (Zhang, Liu, Johansson, Yitayew, Ohly, Li; 2026-03-28)
source_type: arXiv preprint
date_checked: 2026-08-15
status: VERIFIED as a preprint claim
confidence: MEDIUM-HIGH - real capital, live markets, but short window and small model count
summary: Frontier LLMs lost real money on live prediction markets over 57 days, badly on Kalshi and slightly on Polymarket. Research volume did not predict returns.
implication: The single most quotable fact against "our AI can beat the market." Also conflicts with S06/S10 on whether research/retrieval breadth matters - reconciliation: retrieval improves accuracy, but returns are dominated by execution and sizing.

---

id: S23
topic: Accuracy vs profitability on prediction markets
claim: Paper titled "Beyond Accuracy: Can LLM Forecasters Profit on Prediction Markets?" exists on OpenReview. I could not retrieve its contents - the PDF returned HTTP 403 and the forum page served a bot-verification interstitial through the agent proxy.
source: https://openreview.net/forum?id=TSA5kRUKZv , https://openreview.net/pdf?id=TSA5kRUKZv
source_type: Conference submission (OpenReview)
date_checked: 2026-08-15
status: UNKNOWN - title and existence VERIFIED, contents NOT retrieved
confidence: LOW
summary: Title-level evidence that the accuracy-vs-profit distinction is an active research question. No findings extracted.
implication: The implementing agent should retry this source from a browser. Do not cite any finding from it until read.

---

id: S24
topic: Polymarket fees (global entity) - execution cost inputs
claim: "Makers are never charged fees. Only takers pay fees." Fee = C × feeRate × p × (1 − p), where C = shares and p = share price. feeRate by category: crypto 0.07; sports/economics/culture/weather/other 0.05; finance/politics/mentions/tech 0.04; geopolitical and world events 0 (fee-free). Fees rounded to 5 decimal places, smallest fee 0.00001 USDC; trades near extreme probabilities may incur no fee. "There are no Polymarket fees to deposit or withdraw USDC (though intermediaries like Coinbase or MoonPay may charge their own fees)." Takers can earn a portion back via the tiered Taker Rebate Program. API exposes fee rate (GET fee-rate) and per-market CLOB params including tick size and fees.
source: https://docs.polymarket.com/trading/fees.md ; https://docs.polymarket.com/llms.txt ; https://docs.polymarket.com/api-reference/market-data/get-fee-rate.md
source_type: Official product documentation
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: Taker-only fees, quadratic in price, peaking at p=0.50. At p=0.50 politics: $0.01/share = 2.0% of stake; sports 2.5%; crypto 3.5%; geopolitical 0%.
implication: Break-even true probability is ask + fee + slippage, not ask. Read feeRate from the API per market - do not hardcode.

---

id: S25
topic: Polymarket US fees - conflicting schedule
claim: Fee = Θ × C × p × (1 − p). Taker Θ = 0.06 (max $1.50 per 100 contracts at $0.50); MAKER REBATE Θ = −0.0125 (−$0.31 per 100), applied at point of trade. All fees/rebates rounded to the nearest $0.01 with banker's rounding. Taker volume rebates: 10% at $250K–$999K monthly, 25% at $1M–$9.99M, 50% at $10M+, paid weekly, tier set by prior calendar month. No withdrawal or settlement fees mentioned.
source: https://docs.polymarket.us/fees
source_type: Official product documentation (US regulated entity)
date_checked: 2026-08-15
status: VERIFIED; CONFLICTING with S24 (different coefficient, and makers are paid rather than merely free)
confidence: HIGH
summary: The US entity and the global entity have materially different fee schedules.
implication: The widget must read fees from the API for the entity it is actually connected to. Hardcoding either schedule will produce wrong EV.

---

id: S26
topic: Polymarket resolution mechanics and ambiguity risk
claim: Resolution via the UMA Optimistic Oracle, permissionless proposal and dispute. No dispute: proposer posts a $750 bond, 2-hour challenge period, then automatic resolution. One dispute: 4–6 days. Two disputes: escalation to UMA's Data Verification Mechanism token-holder vote, with a 24–48h debate period (evidence submitted in UMA Discord) plus ~48h voting. Bonds: winner recovers bond plus half the loser's bond. Rare "Unknown/50-50" outcomes exist where neither outcome is applicable; the market resolves 50/50 and each token redeems for $0.50.
source: https://docs.polymarket.com/concepts/resolution.md
source_type: Official product documentation
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: Resolution can take hours (clean) to nearly a week (disputed), and a 50-50 outcome is possible.
implication: (a) A real, quantifiable tail risk that must be disclosed in the widget, not modelled as zero. (b) Ambiguous resolution criteria are a defensible no-bet reason. (c) The eval harness must pre-declare how 50-50 outcomes are scored.

---

id: S27
topic: Kelly criterion - properties, estimation error, fractional Kelly
claim: Good: Kelly asymptotically maximises growth rate, minimises expected time to a wealth goal, never risks ruin, is myopically optimal, and is competitively optimal (no other strategy beats it by a factor t more than 1/t of the time). Bad: bets can be a very large fraction of wealth (a cited real racetrack bet was 64% of wealth); with equal wins and losses over 2n trials wealth ends at W₀(1−f²)ⁿ; the unweighted average return converges to half the arithmetic mean. Estimation error: errors in the MEAN are vastly more damaging than variance/covariance errors - roughly a 20:2:1 importance ratio - and "estimates must be accurate and to be on the safe side, the size of the wagers should be reduced." Fractional Kelly trades growth for security: half-Kelly reduces P(double before halving) from 0.67 to 0.50 while cutting relative growth from 1.00 to 0.75; fractional Kelly is a blend of Kelly and cash producing smoother wealth paths. Betting exactly 2× Kelly yields ZERO excess return above the risk-free rate in continuous time.
source: https://www.stat.berkeley.edu/~aldous/157/Papers/Good_Bad_Kelly.pdf ; https://www.worldscientific.com/doi/abs/10.1142/9789814293501_0039 (MacLean, Thorp & Ziemba)
source_type: Peer-reviewed book chapter / standard reference
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: Kelly assumes a KNOWN probability. With estimated probabilities - and mean error being ~20× more damaging than variance error - the prescription is to shrink the bet. Overbetting is catastrophically asymmetric: 2× Kelly earns nothing.
implication: Default the widget to ¼ Kelly, offer ½, grey out full Kelly with the 2×-Kelly fact as a tooltip. Add a hard per-market cap. For a binary contract at effective price q, f* = (p̂ − q)/(1 − q) - which at q=0.90 with a 5-point edge instructs a 50%-of-bankroll bet, an obviously unacceptable output that makes the point vividly in the demo.

---

id: S28
topic: Sample size and confidence intervals for Brier / Brier skill score
claim: Derives analytical sampling-uncertainty expressions for the Brier score and Brier skill score from sample moments; recommends normal/t-based intervals, with bootstrap (a few hundred to a few thousand resamples) as the nonparametric alternative when assumptions fail. Interval width depends critically on sample size and event frequency: 400+ samples give reliable estimates in most scenarios; below ~300, significant deviations occur for rare events. Concretely, with 50 forecast pairs for a 5%-frequency event, the estimated 95% CI for BSS covers [−0.26, +0.57]. "Verification sample sizes of a few hundred forecast–observation pairs are needed to establish that a forecast is skillful."
source: https://journals.ametsoc.org/view/journals/wefo/23/5/2007waf2007049_1.xml (Bradley, Schwartz & Hashino, Weather and Forecasting 23(5), 2008)
source_type: Peer-reviewed journal (AMS)
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: A few hundred forecast–observation pairs are needed before a skill claim means anything; at N=50 the BSS CI spans "much worse" to "much better."
implication: The governing constraint on the entire deliverable. Any 48-hour result will be underpowered, and the honest move is to state the required N alongside the observed CI. Paired testing helps (most difficulty variance cancels) but the order of magnitude - hundreds - stands.

---

id: S29
topic: Brier score misuse
claim: Five misconceptions: (1) Brier 0 = perfect model - actually signals misspecification; (2) lower Brier always means better model - cross-dataset comparisons with different outcome distributions are misleading; (3) low Brier indicates good calibration - they measure different things, calibration needs dedicated metrics; (4) Brier near ȳ−ȳ² means a useless model; (5) Brier cannot exceed ȳ−ȳ² - it can, by chance. The score simultaneously reflects the true-probability distribution, prediction accuracy, and random Bernoulli variation. Recommends combining metrics (calibration curves, calibration-in-the-large, c-index, net benefit/decision curves, bootstrap CIs) and restricting comparisons to identical populations; explicitly does NOT recommend cross-dataset comparison even with the scaled Brier.
source: https://pmc.ncbi.nlm.nih.gov/articles/PMC12818272/ (Linard Hoessly, Global Epidemiology, 2026-01-07)
source_type: Peer-reviewed journal
date_checked: 2026-08-15
status: VERIFIED
confidence: HIGH
summary: Raw Brier is not comparable across question sets, and low Brier does not mean well calibrated.
implication: Forbids benchmarking our number against any published Brier. Mandates paired, same-question comparison plus a reliability diagram with bin counts. Also explains S17's paradox (politics: best Brier, worst ECE).

---

id: S30
topic: Extremizing aggregated forecasts
claim: Extremizing pushes aggregates away from 0.5 on the theory that experts hold different information. Formulas: ô = (∏oᵢ)^d; Neyman & Roughgarden's log Ô = log O_baseline + d[mean log odds − log O_baseline]. Recommended factor d ≈ √3 ≈ 1.73 for n > 50 forecasters. On 899 resolved Metaculus binary questions: Neyman aggregate with resolution baseline Brier 0.106 (best); extremized mean of log odds (d=1.55) 0.111; Metaculus prediction 0.111; plain mean of log odds 0.116.
source: https://forum.effectivealtruism.org/posts/biL94PKfeHmgHY6qe/principled-extremizing-of-aggregated-forecasts (Dec 2021); related: Satopää et al., https://www2.math.upenn.edu/~pemantle/papers/aggregation.pdf
source_type: Practitioner analysis (EA Forum) with academic underpinning
date_checked: 2026-08-15
status: VERIFIED for the reported numbers; the risk of extremizing few CORRELATED forecasts was not addressed by the source - INFERRED
confidence: MEDIUM
summary: Extremizing buys ~0.005–0.010 Brier when aggregating many genuinely diverse forecasters.
implication: DO NOT extremize a 5-sample self-ensemble from one model. The d ≈ 1.73 recommendation is derived for n > 50 independent forecasters; five samples of one model are heavily correlated and extremizing them will most likely worsen calibration. AIA Forecaster does extremize (S16) - but it aggregates across a much richer agent ensemble.

---

id: S31
topic: Multiple comparisons / backtest overfitting
claim: Performance statistics computed after trying many strategy configurations are inflated by selection. The Deflated Sharpe Ratio corrects a Sharpe ratio for the number of configurations tried, non-normality, and track-record length; the Probability of Backtest Overfitting framework quantifies how likely an in-sample winner is out-of-sample mediocre.
source: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2460551 (Deflated Sharpe Ratio, Bailey & López de Prado) ; https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253 (Probability of Backtest Overfitting) ; https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf ; https://en.wikipedia.org/wiki/Deflated_Sharpe_ratio
source_type: Academic working papers / standard finance references
date_checked: 2026-08-15
status: VERIFIED (that these are the standard references for the correction). UNKNOWN whether any published Brier-score analogue of the deflated Sharpe ratio exists - I could not find one.
confidence: HIGH for the principle, LOW for a ready-made Brier-specific correction
summary: The number of configurations you tried is part of your result. Reporting only the best one is not a result.
implication: For a 48-hour build, do not attempt a formal correction. Instead pre-declare ONE primary metric and ONE primary configuration, and report the count of configurations evaluated. "We tried 1 configuration" is stronger than any p-value.

---

id: S32
topic: Brier decomposition bias at small samples
claim: The standard binned Murphy decomposition (reliability − resolution + uncertainty) is biased at small sample sizes - reliability is biased upward and resolution downward - and additional components and variance estimators have been proposed to address this.
source: https://journals.ametsoc.org/doi/abs/10.1175/2007WAF2006116.1 (Stephenson et al., "Two Extra Components in the Brier Score Decomposition", Weather and Forecasting 2008) ; https://ar5iv.arxiv.org/html/1303.6182 (Variance estimation for Brier score decomposition) ; https://ore.exeter.ac.uk/articles/journal_contribution/Simplifying_and_generalising_Murphy_s_Brier_score_decomposition/29748851/1/files/56771708.pdf
source_type: Peer-reviewed journal articles
date_checked: 2026-08-15
status: VERIFIED that these papers exist and address small-sample bias in the decomposition; INFERRED for the magnitude of the bias at our specific N
confidence: MEDIUM
summary: The reliability/resolution split is a useful diagnostic but is unreliable as a number at small N.
implication: Report the decomposition labelled "directional only" below ~200 resolutions; do not quote reliability or resolution as headline figures.

---

id: S33
topic: Polymarket accuracy - commercial/SEO sources (explicitly rejected)
claim: Numerous commercial sites publish Polymarket "accuracy" and Brier statistics (e.g. claims of "95.2% smart-money verified accuracy").
source: https://keyrock.com/knowledge-hub/prediction-market-accuracy-brier-scores/ ; https://oddsshift.com/accuracy ; https://www.tradetheoutcome.com/polymarket-accuracy-report-data/ ; https://fensory.com/intelligence/predict/polymarket-accuracy-analysis-track-record-2026 ; https://predscope.com/guide/prediction-market-accuracy
source_type: Commercial / affiliate marketing content
date_checked: 2026-08-15
status: UNKNOWN - methodology not disclosed, not independently verifiable
confidence: LOW - do not use
summary: These sites dominate search results for "Polymarket accuracy" but publish no reproducible methodology, no sample definition, and no uncertainty quantification. Headline "accuracy %" figures are trivially inflated by including lopsided markets.
implication: Explicitly excluded from this research. Recorded here so a later agent does not re-discover them and treat them as evidence. Use S17, S18, S20 instead.

---

## Coverage gaps (recorded honestly)

- **UNKNOWN**: current live ForecastBench leaderboard raw Brier values (S01). Client-side rendering + proxy 403 on CSV endpoints. Latest confirmed values are Oct 2025 (superforecasters 0.086, best LLM 0.103) via S05.
- **UNKNOWN**: contents of "Beyond Accuracy: Can LLM Forecasters Profit on Prediction Markets?" (S23). Retry from a browser.
- **UNKNOWN**: a Brier-score analogue of the deflated Sharpe ratio (S31).
- **UNKNOWN**: Polymarket-specific annulment / 50-50 resolution rate. Comparable figures from other platforms: 3.5% (Metaculus AIB Q1 2025, S08), 3.9% and ~8% (S15).
- **NOT VERIFIED**: Satopää et al.'s original extremizing paper - the primary journal source (sas.upenn.edu) was blocked by robots.txt; S30 is a secondary treatment with its own numbers.
- **CONFLICTING, unresolved**: (i) ForecastBench parity claims vs Metaculus live-tournament results (S03/S04 vs S07/S08); (ii) favourite-longshot direction at long horizon vs near expiry (S17 vs S19); (iii) whether research/retrieval breadth predicts outcomes (S06/S10 vs S22); (iv) Polymarket global vs US fee schedules (S24 vs S25); (v) units of the quoted half-spread in S20.

---

*End of SOURCES_STRATEGY.md - 33 source records, checked 2026-08-15.*
