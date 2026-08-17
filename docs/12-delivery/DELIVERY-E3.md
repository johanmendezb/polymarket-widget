# DELIVERY - E3 Polymarket read path

**Branch:** `e3-readpath`
**Staging:** https://polymarket-widget.onrender.com
**Status:** ACCEPTED (auto-merge epic under the hybrid gate; no user-visible surface)

---

## What was delivered

Four proxy routes serving validated, cached, normalized market data, and the single boundary
where an untrusted upstream shape becomes a typed domain value.

| Requirement | Status | Where |
|---|---|---|
| T3.1 zod schemas for upstream | done | `src/polymarket/schemas.ts` |
| T3.2 mappers to domain types | done | `src/polymarket/mappers.ts` |
| T3.3 cache and upstream client | done | `src/polymarket/cache.ts`, `client.ts` |
| T3.4 the four read routes | done | `src/app/api/polymarket/*` |

## Test evidence

| Suite | Count | Result |
|---|---|---|
| Total (with E1 + E2 merged in) | 261 | pass |
| E3's own additions | 179 → 261 | pass |
| typecheck / lint | — | clean, zero warnings |

Every route covers the six documented integration scenarios against MSW fixtures: happy path,
upstream 500, upstream 429, malformed payload, unknown id, invalid input.

## `mapOrderBook` is the function this epic exists for

It reverses **both** sides, so `asks[0]` is the best ask and `bids[0]` is the best bid. Upstream
sends each side worst-price-first.

Two tests guard it, and the second matters more than the first:

1. A narrow-spread assertion on the recorded liquid book. An unreversed bids array puts the
   spread near 0.74 instead of 0.01.
2. An explicit regression test proving that mapping the raw un-normalized array **would fail**
   that narrow-spread test.

The crossed-book invariant I1 cannot catch an unreversed bids array, because `0.008 >= 0.001` is
true. Only the spread test catches it. That is why it is written down twice.

## What the live API forced, that the plan did not anticipate

- **`clobTokenIds`, `outcomes` and `outcomePrices` arrive as JSON-encoded strings**, not arrays.
  They are parsed, then each token id is validated as `/^\d+$/` and carried as a string. A
  `z.coerce.number()` anywhere near a 77-digit id silently corrupts it, so there is a test
  asserting a non-digit token id is a `400 BAD_REQUEST` and is **never coerced**.
- **The CLOB book is snake_case on the wire.** The mapper owns the rename; nothing downstream
  sees an upstream field name.
- **Fee fields are usually absent.** `feesEnabled: false` with a null rate is the common case, so
  the mapper never treats an absent field as a zero rate — it marks the config
  `category-fallback` so the UI is obliged to label the fee estimated.

## Cache behaviour is contract, not optimisation

Per-route TTL (search 15s, market 15s, book 3s, history 60s), request coalescing, and
stale-on-error. Two concurrent identical requests produce exactly **one** upstream call, asserted
with a call counter rather than by inspection. On upstream failure with a warm entry, stale data
is served with `stale: true` so the UI can badge it. A 429 becomes `UPSTREAM_RATE_LIMITED` and is
presented as "refreshing paused", not as an error.

## Known gaps and risks introduced

- **Nothing here has been exercised against the live API in a deployed environment.** The tests
  run against MSW fixtures recorded 2026-08-16. `pnpm test:live` re-records them; run it before
  the demo, because fixtures drift.
- **Rate limits are still unknown (OQ-02).** The cache, coalescing and backoff are precautionary,
  sized against an assumption rather than a published number.
- **Empty `asks` is a valid 200 response**, not an error. Downstream must handle a zero-depth
  book, and E2's `walkBook` does.
- **The routes have no live smoke test on staging yet.** That happens in E7/T7.2.

## How to verify in 5 minutes

1. `pnpm test` — expect 261 passing.
2. Open `test/polymarket/mappers.test.ts` and read the two spread tests.
3. `pnpm test:live` — hits production Polymarket, excluded from CI, confirms the fixtures still
   match reality.

---

## QA CHECKLIST

- [ ] The stated scope is actually present
- [ ] Every route matches its documented contract
- [ ] Nothing claimed as done is missing
- [ ] The known-gaps list is honest
- [ ] I accept this epic

**Verdict:** ACCEPTED under the hybrid gate agreed 2026-08-16. Recorded in `assumed_accepted`.
