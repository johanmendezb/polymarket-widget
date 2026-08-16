# Build prompt 01 - Polymarket domain and API research

**Sent:** 2026-08-15, research phase
**Model:** claude-opus-5, orchestrator session (not delegated)
**Produced:** `docs/02-research/POLYMARKET_RESEARCH.md`, `docs/03-domain/POLYMARKET_DOMAIN_MODEL.md`, `docs/03-domain/ORDER_EXECUTION.md`

## Why this one is different from 02 and 03

Streams 02 and 03 were delegated to subagents and their prompts are captured verbatim. This stream was **run inline by the orchestrator rather than delegated**, and it is recorded honestly as such rather than reverse-engineered into a prompt that was never sent.

The reason for the difference: this stream produced the facts the architecture would be built on, and a summarised handoff would have lost the exact endpoint shapes, field names and response quirks that the domain model needed. Delegation trades detail for context economy, and here the detail was the point. The judgment turned out to be right for a specific reason: the highest-value finding of the entire research phase (asks arrive sorted descending) came from reading a raw live response, and it is the kind of detail a summarising agent drops.

## The method actually followed

1. **Start from the machine-readable index, not from search.** `docs.polymarket.com/llms.txt` returned the complete documentation map in one request. This is what surfaced that the platform now has a unified SDK, pUSD collateral, perpetuals, combos and a builder programme, none of which appear in the tutorials that dominate search results.
2. **Read the per-endpoint reference, not the summary tables.** The host-level table marks the CLOB as auth-required; the per-endpoint pages say reads are public. The conflict was resolved by experiment, not by preference.
3. **Call the live endpoints and read raw responses.** `gamma /public-search`, `gamma /markets/{id}`, `clob /book`. This is where the descending-asks trap, the 77-digit token ids, and the full set of per-market fee fields came from.
4. **Label every claim** VERIFIED, INFERRED, UNKNOWN or CONFLICTING, with the source URL and the date checked.
5. **Record conflicts rather than resolving them by preference.** Two were found and both are documented: the CLOB auth question (resolved by live request) and the global versus US fee schedule (unresolved, tracked as OQ-04).

## The instruction, if this stream were delegated

Written for reuse. It is what the prompt would have been.

---

You are the POLYMARKET DOMAIN RESEARCH AGENT. Your job is RESEARCH ONLY. Do not write application code.

Establish what the Polymarket API currently does, as of today, distinguishing verified fact from inference and from tutorial folklore. Assume any blog post, Medium article or SDK example you find is describing a version of the platform that no longer exists unless you can date-check it.

Start from `https://docs.polymarket.com/llms.txt`, which is the complete machine-readable documentation index. Read the per-endpoint API reference rather than the host-level summary tables, because they disagree. Where they disagree, resolve it by making a live unauthenticated request and recording what actually happened.

Verify at minimum: the Gamma API, the Data API, the CLOB API, the current official TypeScript SDK and which packages it deprecates, authentication requirements per endpoint, market discovery and full-text search, order book, prices, midpoint, spread, last trade price, price history and whether it supports arbitrary timestamp ranges, order types, fees including the exact formula and how the rate is obtained per market, tick size, minimum order size, negative risk markets, the wallet and collateral model, resolution mechanics, geographic restrictions, rate limits, and WebSocket channels.

Then call the live endpoints. Fetch a search response, a market object and an order book, and read the raw JSON rather than a description of it. Record: the exact field names, the sort order of every array, the numeric ranges of every identifier, and anything that would silently corrupt a downstream calculation if assumed rather than checked.

For every claim record the claim, the source URL, the date checked, and a label from VERIFIED / INFERRED / UNKNOWN / CONFLICTING. Never state an API capability as fact without either official documentation or a live response. Where sources conflict, record the conflict and how you resolved it, or that you did not.

Produce: a research document with the above, a typed domain model naming every trap explicitly, and an order-execution document containing the fill algorithm, the fee formula with worked examples, and an explicit list of what is deliberately not modelled.

---

## What it found that changed the plan

| Finding | Effect |
|---|---|
| Every read endpoint is public, no auth | Removed an entire authentication epic and made a 48-hour build realistic |
| Order book asks arrive sorted **descending** | Became the highest-priority test in the repository |
| Takers pay `C × feeRate × p × (1 − p)`, 0 to 7% by category | Turned an assumed-free cost model into the product's spine, and produced ADR-0009 |
| `clobTokenIds` exceed `Number.MAX_SAFE_INTEGER` | String handling enforced throughout |
| One `public-search` call returns nearly the whole detail view | Simplified the read path from four calls to two |
| `prices-history` accepts arbitrary `startTs`/`endTs` | Closed OQ-08. Retrospective evaluation is mechanically possible and still methodologically invalid. |
| Three SDK packages are deprecated in favour of `@polymarket/client` | Stopped us building against a dead surface |
| 39 countries restricted, VPN circumvention prohibited | Made simulation-only the compliant default rather than merely the cheap one |
