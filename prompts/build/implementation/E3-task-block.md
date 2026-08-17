## Scope: the whole read path, T3.1 through T3.4, in order

You own four contracts. They are serial. Commit each separately and read each from `BACKLOG.md` as
you reach it.

- **T3.1** zod schemas for upstream
- **T3.2** mappers to domain types
- **T3.3** cache and upstream client
- **T3.4** the four read routes

Read `docs/04-architecture/API_CONTRACTS.md` in full — it is the contract you are implementing.
The fixtures recorded by T1.4 are in `test/fixtures/`; test against those, not against the network.

## `mapOrderBook` is the most important function you will write

Upstream orders **both** sides worst-price-first. Reverse both, so `asks[0]` is the best (lowest)
ask and `bids[0]` is the best (highest) bid. The asks half is loud when wrong. The bids half is
silent: an unreversed `bids[0]` is the worst bid, the spread reads as enormous, the gate rejects
healthy markets, and the crossed-book invariant still passes because `0.008 >= 0.001`. Write a
narrow-spread test — that is the one that actually catches it.

Guarantee in the route contract: `asks` is ascending in **every** response from
`/api/polymarket/book`. Assert it.

## The other boundary rules

- **zod at the upstream boundary and nowhere else.** This is the single place untrusted shapes
  become typed values. A malformed payload produces `UPSTREAM_SHAPE_CHANGED` and a loud structured
  log **naming the offending field** — never a crash, and never a generic message to the user.
- **`tokenId` round-trips as a string.** Validate `/^\d+$/`. A `z.coerce.number()` anywhere near a
  token id silently corrupts 77 digits. `clobTokenIds`, `outcomes` and `outcomePrices` arrive as
  **JSON-encoded strings** and need `JSON.parse` first; assert all three are equal length and fail
  loudly if not.
- **Send an explicit, honest `User-Agent`** on every upstream request and never fall back to a
  library default. A missing UA is fine; a scraper-pattern UA is blocklisted (`Python-urllib/3.9`
  gets 403 where `curl/8.7.1` and an omitted header both get 200). See OQ-10.
- The error taxonomy is a **closed union of codes**, never strings.
- Empty `asks` is a valid response, not an error.
- Markets with `enableOrderBook === false` are filtered out of search results.
- Search-route prices are **indicative only** and must never feed a fill preview.

## Cache behaviour is part of the contract, not an optimisation

In-memory LRU with per-route TTL (search 15s, market 15s, book 3s, history 60s), request
coalescing, and backoff. Two concurrent identical requests must produce **one** upstream call —
assert it. On upstream failure with a warm entry, serve stale data with `stale: true` so the UI
can badge it. A 429 produces `UPSTREAM_RATE_LIMITED` and is presented as "refreshing paused",
not as an error.

## Acceptance criteria

1. Every route matches its documented contract exactly, asserted against MSW fixtures.
2. `asks` is ascending in every `/api/polymarket/book` response.
3. `tokenId` round-trips as a string with no precision loss.
4. A malformed upstream payload produces `UPSTREAM_SHAPE_CHANGED`, not a crash.
5. Two concurrent identical requests produce one upstream call.
6. Upstream 429 produces `UPSTREAM_RATE_LIMITED` and serves stale data when available.
7. All six integration scenarios per route from `TEST_STRATEGY.md` pass.
