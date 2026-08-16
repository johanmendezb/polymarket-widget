# POLYMARKET RESEARCH

**All claims checked:** 2026-08-15
**Method:** official documentation at `docs.polymarket.com` (including the machine-readable index at `/llms.txt`), plus live responses from the public REST hosts. Where a live response contradicted or extended the docs, the live response is noted as such.
**Labels:** VERIFIED (confirmed against official docs or a live response) · INFERRED (reasoned from verified inputs) · UNKNOWN · CONFLICTING · DEPRECATED

> **Warning to any agent reading a tutorial instead of this file.** The Polymarket API surface changed materially before 2026-08. Blog posts, Medium articles and older SDK examples describe a platform that no longer matches production in at least four important ways: the SDK was unified, collateral is pUSD, taker fees exist, and there is a whole perpetuals product. Do not trust an example you did not date-check.

---

## 1. Hosts

| Host | Purpose | Auth for our use |
|---|---|---|
| `https://gamma-api.polymarket.com` | Event and market discovery, metadata, full-text search | None. VERIFIED |
| `https://clob.polymarket.com` | Order books, prices, midpoint, spread, last trade, price history, tick size, fee rate | None for reads. VERIFIED |
| `https://data-api.polymarket.com` | Positions, activity, participation | L2 required. Not used by this project. |
| `https://relayer-v2.polymarket.com` | Gasless wallet transactions | L2 required. Not used. |
| `wss://ws-subscriptions-clob.polymarket.com/ws/market` | Public order book and price stream | None. VERIFIED |
| `wss://ws-live-data.polymarket.com` | Public reference prices, comments, trade activity | None. VERIFIED |

**Source:** https://docs.polymarket.com/getting-started/api · checked 2026-08-15

**CONFLICTING, resolved.** The host summary table on that page marks `clob.polymarket.com` as "L1 & L2 Required". The per-endpoint reference at https://docs.polymarket.com/market-data/prices-order-books states "Authentication: Not required" for `/book`, `/books`, `/price`, `/prices`, `/midpoint`, `/midpoints`, `/spread`, `/spreads`, `/last-trade-price`, `/prices-history`. A live unauthenticated `GET /book?token_id=...` returned a full order book. **Resolution: the host-level table is a coarse summary of the host as a whole. Reads are public; only order placement and account endpoints need auth.** Status: VERIFIED by live response.

---

## 2. Read endpoints we will use

All VERIFIED against the per-endpoint docs, and the starred ones additionally against live responses.

### Discovery (Gamma)

| Endpoint | Notes |
|---|---|
| `GET /public-search?q=<query>` ★ | Full-text search. Returns `{ events, tags, profiles, pagination }`. Events carry a nested `markets` array with the full market object. Supports `pageSize`. |
| `GET /events/keyset?closed=false&limit=20&tag_id=<id>&after_cursor=<c>` | Cursor pagination. Returns `events`, `next_cursor`, `hasMore`. |
| `GET /markets/keyset?tag_id=<id>&closed=false&limit=20` | Same pagination shape for markets. |
| `GET /events/slug/<slug>`, `GET /markets/<id>` | Direct lookup. |

**The single most useful finding for this build:** one `public-search` call returns everything the market list *and* most of the market detail view need, including `clobTokenIds`, `bestBid`, `bestAsk`, `spread`, `lastTradePrice`, `outcomes`, `outcomePrices`, `negRisk`, `acceptingOrders`, `orderPriceMinTickSize`, `orderMinSize`, `feesEnabled`, `feeType`, `feeSchedule`, `makerBaseFee`, `takerBaseFee`, `volume24hr`, `liquidityClob`, `endDateIso` and `resolutionSource`. Status: VERIFIED by live response 2026-08-15.

This means the search screen and the market detail screen can be served from a single upstream call, and the CLOB is only needed once the user picks an outcome and wants a real fill estimate.

### Pricing and books (CLOB)

| Endpoint | Response |
|---|---|
| `GET /book?token_id=<id>` ★ | `{ market, asset_id, timestamp, hash, bids, asks, min_order_size, tick_size, neg_risk, last_trade_price }` |
| `POST /books` | Batch, max 500 token ids |
| `GET /price?token_id=<id>&side=BUY\|SELL` | `{ "price": "0.08" }` |
| `GET /midpoint?token_id=<id>` | `{ "mid": "0.085" }` |
| `GET /spread?token_id=<id>` | `{ "spread": "0.01" }` |
| `GET /last-trade-price?token_id=<id>` | `{ "price": "0.08", "side": "SELL" }`, or `{ "price": "0.5", "side": "" }` if never traded |
| `GET /prices-history?market=<token_id>&interval=1d&fidelity=60` | `{ "history": [ { "t": <unix_s>, "p": <number> } ] }`. Accepts either `interval` (`1h`,`6h`,`1d`,`1w`,`max`) **or** `startTs`/`endTs` in Unix seconds, plus `fidelity` in minutes. |

**Source:** https://docs.polymarket.com/market-data/prices-order-books · checked 2026-08-15

**This resolves a previously open research question.** `prices-history` accepts arbitrary `startTs`/`endTs` with minute-level `fidelity`, so a historical price *can* be pinned to a chosen timestamp. Retrospective evaluation is therefore mechanically possible. It remains methodologically invalid for a different reason (training-data contamination, see `05-ai/EVALUATION.md` §B5), and we still do not do it.

### ★ The order book trap

A live `GET /book` response returned:

```
bids: [{"price":"0.44","size":"82"}, {"price":"0.43","size":"134"}, {"price":"0.38","size":"30"}, ...]
asks: [{"price":"0.99","size":"870.94"}, {"price":"0.98","size":"456"}, {"price":"0.97","size":"5.69"}, ...]
```

**Both arrays are sorted descending by price.** Bids descending means the best bid is `bids[0]`. Asks descending means **the best ask is the LAST element**, not the first.

An implementation that reads `asks[0]` as the best ask will price a buy at 99 cents instead of 45 cents and every downstream number, edge included, will be wrong by an order of magnitude. Sort asks ascending before walking. Status: VERIFIED by live response. This is enshrined as a mandatory unit test in `07-testing/TEST_STRATEGY.md`.

`min_order_size` was `"5"` and `tick_size` `"0.01"` on the sampled market; both are per-market and must be read, not assumed.

---

## 3. Fees

**VERIFIED**, https://docs.polymarket.com/trading/fees · checked 2026-08-15.

```
fee = C × feeRate × p × (1 − p)
```

where `C` is the number of shares traded and `p` is the share price.

- **Takers pay. Makers are never charged.** Quoted: "Makers are never charged fees. Only takers pay fees."
- Fees peak at p = 0.50 and fall symmetrically toward both extremes.
- Rounded to five decimal places; minimum charged is 0.00001 USDC.

Published rates by category:

| Category | Rate |
|---|---|
| Crypto | 0.07 |
| Sports | 0.05 |
| Economics, Culture, Weather, Other/General | 0.05 |
| Finance, Politics, Mentions, Tech | 0.04 |
| Geopolitics | 0 |

**Consequence.** At p = 0.50 in a politics market, the fee is `1 × 0.04 × 0.25 = 0.01` per share, that is 1 cent on a 50 cent share, roughly **2% of stake**. You need at least one full probability point of edge before you have earned anything. A widget that omits this is not merely imprecise, it is telling the user something false.

**Risk, and why ADR-0009 exists.** A large amount of public writing still describes Polymarket as fee-free, including material dated 2026. An implementer working from general knowledge will get this wrong. The rate must be read per-market. The live market object exposes `feesEnabled`, `feeType`, `feeSchedule`, `makerBaseFee` and `takerBaseFee`, and the CLOB exposes `/fee-rate` endpoints. Treat the category table above as a fallback for display copy only, never as the arithmetic input.

**CONFLICTING, unresolved.** Polymarket operates a separate US-facing documentation site (`docs.polymarket.us`) and secondary sources report differing global and US fee schedules. We do not attempt to reconcile them. We read the schedule from the API for the market in front of us and label which entity's data we are showing as UNKNOWN if it is not stated. Status: UNKNOWN, tracked as OQ-04.

---

## 4. Market and event model

**VERIFIED**, https://docs.polymarket.com/market-data/market-details and live response.

- An **event** groups one or more **markets**. Events carry `title`, `slug`, `negRisk`, `liquidity`, `volume`, `markets[]`.
- A **market** has three identifiers: Gamma numeric `id`, human-readable `slug`, and `conditionId` (the onchain identifier used for analytics and trading).
- A market has `outcomes` (e.g. `["Yes","No"]`) and `clobTokenIds`, a parallel array of the CLOB token ids. **Index correspondence matters**: `outcomes[i]` pairs with `clobTokenIds[i]` and `outcomePrices[i]`.
- State flags: `active`, `closed`, `archived`, `acceptingOrders`, `ready`, `funded`, `approved`. Treat `acceptingOrders === false` as "cannot price a bet", independent of `active`.
- Constraints: `orderPriceMinTickSize` (0.1 down to 0.0001) and `orderMinSize` (a USDC notional floor).
- `negRisk` marks membership in a mutually exclusive group.

### Negative risk

**VERIFIED**, https://docs.polymarket.com/concepts/negative-risk.

In a negative-risk group only one market resolves YES. A NO share in any one market can be converted to one YES share in every other market via the Neg Risk Adapter contract. Prices across the group are therefore linked, and a group may contain placeholder or "Other" outcomes that can later be named.

**What this means for us.** We do not implement conversion. We must (a) label negRisk markets in the UI so the user understands the outcomes are mutually exclusive, (b) use them for the multi-outcome coherence diagnostic in `05-ai/EVALUATION.md` §B7, and (c) never present an unnamed placeholder outcome as bettable.

---

## 5. Resolution

Polymarket resolves through the UMA optimistic oracle. Undisputed proposals post a bond and auto-resolve after a challenge window; a dispute extends resolution by days; a second dispute escalates to a token-holder vote. A rare "unknown / 50-50" outcome pays 0.50 to both sides.

Status: VERIFIED for the mechanism (see `02-research/RESEARCH_SOURCES.md` record S26). The **rate** of annulment on Polymarket specifically is UNKNOWN; comparable platforms report roughly 4% to 8%.

**Product consequence:** resolution risk is real, non-zero and unquantified. It must be disclosed in the widget rather than modelled as zero, and resolution criteria must be surfaced rather than buried (see `02-research/UX_RESEARCH.md` §6.10).

---

## 6. SDKs

**VERIFIED**, https://docs.polymarket.com/getting-started/sdks-apis and the migration guide, checked 2026-08-15.

- **Current:** `@polymarket/client` (TypeScript), `polymarket-client` (Python).
- **DEPRECATED:** `@polymarket/clob-client-v2`, `@polymarket/builder-relayer-client`, `@polymarket/builder-signing-sdk`, and their Python equivalents. The migration guide explicitly instructs uninstalling them.
- The unified SDK splits into `PublicClient` / `AsyncPublicClient` for unauthenticated reads and `SecureClient` / `AsyncSecureClient` for trading.

```ts
import { createPublicClient } from "@polymarket/client";
const client = createPublicClient();
const pages = client.listMarkets({ closed: false, pageSize: 5 });
```

**Decision input for ADR-0002.** We do not depend on the SDK for the read path. Reasons: the endpoints we need are a handful of plain GETs; we want our own zod-validated boundary so an upstream shape change fails loudly in one place; and the SDK is oriented toward the authenticated trading flow we are deliberately not building. We reference the SDK in the docs as the migration path for a future live provider.

---

## 7. Real-time data

**VERIFIED**, https://docs.polymarket.com/market-data/realtime-data.

Market channel: `wss://ws-subscriptions-clob.polymarket.com/ws/market`, no auth for public data.

Subscribe:
```json
{ "assets_ids": ["<token_id>"], "type": "market" }
```
Subscribe or unsubscribe mid-connection:
```json
{ "assets_ids": ["<token_id>"], "operation": "subscribe" }
```

Message types: `book`, `price_change`, `last_trade_price`, `tick_size_change`; with `custom_feature_enabled: true` also `best_bid_ask`, `new_market`, `market_resolved`.

Keepalive: send the text frame `PING` every 10 seconds, server replies `PONG`. The RTDS host wants `PING` every 5 seconds.

**Decision (ADR-0012).** Not in v1. A WebSocket adds reconnection, backpressure and keepalive handling for a demo that lasts five minutes, and polling with a visible "updated Ns ago" stamp is both cheaper and more honest about staleness. Documented as the first thing to add post-challenge.

---

## 8. Rate limits

**UNKNOWN.** The builder tier page names a "Standard" and a "Highest" tier for API rate limits but publishes no numbers. Relayer transaction caps are published (100/day unverified, 10,000/day verified) but those are irrelevant to us.

**Source:** https://docs.polymarket.com/programs/builders/tiers · checked 2026-08-15

**INFERRED mitigation.** Assume limits exist and are not generous. Our proxy (ADR-0002) is the single choke point: cache search results for 15 seconds and order books for 3 seconds, coalesce concurrent identical requests, and on HTTP 429 back off and surface "refreshing paused" rather than an error. Tracked as OQ-02.

---

## 9. Geographic restrictions

**VERIFIED**, https://help.polymarket.com/en/articles/13364163-geographic-restrictions · checked 2026-08-15.

- 39 countries are fully restricted, including the United States, United Kingdom, Australia, Japan, Singapore and Brazil, along with OFAC-sanctioned jurisdictions.
- Sub-national restrictions exist, for example Ontario.
- Some jurisdictions are "close-only": existing positions may be closed, new ones may not be opened. Germany permits holding to resolution but not new trading.
- Polymarket "strictly prohibits the use of VPNs or similar tools to bypass geographic restrictions," and doing so breaches the Terms of Service.

**Project position.** Geographic eligibility is a first-class domain constraint, not an afterthought. We build no mechanism to detect, circumvent or work around it. Because the widget is simulation-only and never touches an order endpoint, it is usable as a decision-support and educational tool anywhere without implicating these restrictions. If a live execution provider is ever built, geo eligibility is the first gate in `04-architecture/SECURITY.md` §Live trading gate, before wallet and before signing.

This is also a practical point in our favour: the challenge reviewer may well be in a restricted jurisdiction. A simulation-only widget is the only version of this product they can actually use.

---

## 10. Things we deliberately did not research

Scoped out because they cannot affect a 48-hour simulation-only widget: perpetual futures, combo/RFQ markets, the bridge, maker/taker rebate programmes, liquidity rewards, the relayer, builder fee attribution, pUSD mechanics beyond "collateral is pUSD", and Chainlink TWAP feeds. Each is a documented API surface should the project ever need it.
