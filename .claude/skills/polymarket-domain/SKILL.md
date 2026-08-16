---
name: polymarket-domain
description: The Polymarket API traps and domain rules that silently corrupt results if missed. Use whenever writing or reviewing code that touches Polymarket data - order books, prices, fills, fees, token ids, market metadata, negRisk markets, or the read-path mappers and schemas. Triggers on "order book", "walk the book", "best ask", "clobTokenIds", "token id", "taker fee", "feeRate", "midpoint", "spread", "negRisk", "gamma api", "clob api", "market object", "fill price", "price impact".
---

# Polymarket domain rules

Everything here was verified against `docs.polymarket.com` and against live responses on **2026-08-15**. Full evidence with sources in `docs/02-research/POLYMARKET_RESEARCH.md`.

**Do not trust a tutorial or an older SDK example.** The API surface changed materially before 2026-08: the SDK was unified, collateral is pUSD, taker fees exist, and there is a whole perpetuals product. Date-check anything you did not read here.

## The five traps

### 1. Order book asks arrive sorted DESCENDING

A live `GET /book` returns **both** `bids` and `asks` descending by price:

```
asks: [{"price":"0.99"}, {"price":"0.98"}, ... , {"price":"0.45"}]
```

The best ask is the **last** element upstream. Reading `asks[0]` prices a buy at 99 cents instead of 45.

`mapOrderBook()` reverses asks so that inside our domain `asks[0]` is always the best ask. This is the single most important line in the read path and it has the highest-priority test in the repository. If any fill price comes out near the top of the 0 to 1 range, check this first.

### 2. Token ids are strings, always

`clobTokenIds` values are 77-digit decimals that exceed `Number.MAX_SAFE_INTEGER`. `Number()`, `parseInt`, or a zod `.coerce.number()` on one silently corrupts it. Validate as `/^\d+$/` and carry it as a string everywhere.

### 3. Takers pay a fee, and most of the internet says otherwise

```
fee = C × feeRate × p × (1 − p)
```

`C` is shares, `p` is the **volume-weighted average fill price**, not top of book. Takers pay; makers never do. Rounded to 5dp, minimum charge 0.00001 USDC. The fee peaks at p = 0.50 and vanishes toward both extremes.

Rates run 0 to 0.07 by category. Geopolitics is genuinely free; crypto is 7 percent. At p = 0.50 in politics the fee is about **2 percent of stake**.

**Never hardcode the rate.** Read it per market from `feesEnabled`, `feeType`, `feeSchedule`, `takerBaseFee` on the market object, or from the CLOB fee-rate endpoints. When falling back to a category table, set `FeeConfig.source = 'category-fallback'` and the UI must label the fee as estimated. See ADR-0009.

### 4. Gamma prices are indicative, not executable

`bestBid`, `bestAsk`, `spread` and `outcomePrices` on the Gamma market object are fine for rendering a list. They are **not** good enough to price a fill. Anything the user is about to act on comes from a fresh `GET /book`.

Never price a fill at the midpoint. Walk the book. See ADR-0008.

### 5. Index correspondence in the market object

`outcomes[i]` pairs with `clobTokenIds[i]` and `outcomePrices[i]`. Fail loudly if the arrays differ in length rather than reading past the end.

## Authentication

**Every read endpoint this project uses is public.** No API key, no L1, no L2, no wallet.

The host-level summary table in the docs marks `clob.polymarket.com` as auth-required. That is a coarse summary of the host as a whole. The per-endpoint reference and a live unauthenticated request both confirm reads are open. Only order placement and account endpoints need credentials, and this project has neither.

If a task appears to need a Polymarket credential, the task is out of scope.

## Endpoints in use

| Purpose | Endpoint |
|---|---|
| Search | `GET gamma /public-search?q=` |
| List by tag | `GET gamma /markets/keyset?tag_id=&closed=false&after_cursor=` |
| Market detail | `GET gamma /markets/{id}` |
| Order book | `GET clob /book?token_id=` |
| Best price | `GET clob /price?token_id=&side=BUY` |
| Midpoint / spread | `GET clob /midpoint`, `GET clob /spread` |
| Last trade | `GET clob /last-trade-price?token_id=` |
| History | `GET clob /prices-history?market=&interval=&fidelity=` (also accepts `startTs`/`endTs`) |

One `public-search` call returns nested markets carrying almost everything the list *and* detail views need. Use it before reaching for the CLOB.

## Display rules from Polymarket itself

- **Spread wider than $0.10: show the last traded price, not the midpoint**, and label why.
- Resolution criteria belong in the primary flow, not a footer. If users do not trust how a market resolves, nothing else on screen matters.

## Other domain facts worth carrying

- **negRisk** marks a mutually exclusive group where only one market resolves YES, and a NO share converts to a YES share in every other market. We do not implement conversion. We label the market and use groups for the coherence diagnostic. Never present an unnamed placeholder outcome as bettable.
- **`acceptingOrders === false`** means no fill can be priced, independent of `active`. Terminal state, disable the ticket.
- **`orderPriceMinTickSize` and `orderMinSize` are per market.** Read them, never assume.
- **Resolution runs through the UMA optimistic oracle.** Disputes add days; a rare "unknown" outcome pays 0.50 to both sides. The annulment rate is UNKNOWN, so disclose the risk qualitatively and never model it as zero.
- **Rate limits are undocumented.** Assume they exist. Cache at the proxy, coalesce identical requests, back off on 429, and surface "refreshing paused" rather than an error.
- **39 countries are restricted, including the United States**, and VPN circumvention is prohibited. Build no mechanism that detects, circumvents or works around this. Simulation makes it moot.

## Vocabulary that must not be conflated

| Term | Meaning |
|---|---|
| **Price impact** | Your own order size moving your own fill away from top of book. We model this. |
| **Slippage** | Drift between quote time and settlement time. There is no settlement in a simulation, so we do **not** model it and we ship no slippage tolerance control. |
| **Market probability** | The price. What the crowd believes. |
| **Estimated probability** | The model's output. A different number, in a different visual register, never blended into the price. |
| **Effective cost** | Average fill price plus fee per share. The number that actually decides whether an edge exists. |
