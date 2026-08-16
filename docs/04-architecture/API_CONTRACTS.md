# API CONTRACTS

Our own endpoints. These are the contract between `src/app/api` and `src/ui`, and they are what the integration tests assert.

Upstream Polymarket endpoints are documented in `02-research/POLYMARKET_RESEARCH.md` §2. Nothing in `src/ui` ever calls them directly.

---

## Conventions

- All responses are JSON.
- All successful responses are wrapped: `{ "data": T, "meta": { "fetchedAt": number, "stale": boolean, "cached": boolean } }`.
- All errors are wrapped: `{ "error": { "code": ErrorCode, "message": string, "retryable": boolean } }`.
- `ErrorCode` is a closed union: `UPSTREAM_UNAVAILABLE` · `UPSTREAM_RATE_LIMITED` · `UPSTREAM_SHAPE_CHANGED` · `NOT_FOUND` · `BAD_REQUEST` · `AI_TIMEOUT` · `AI_INVALID_OUTPUT` · `AI_NO_EVIDENCE` · `INTERNAL`.
- `stale: true` means the cache served past its TTL because upstream failed. The UI must badge it.
- HTTP status mirrors the class: 200, 400, 404, 429, 502, 504.

---

## `GET /api/polymarket/search`

| | |
|---|---|
| Query | `q` (string, min 2), `tag` (optional string), `limit` (optional, default 20, max 50) |
| Cache | 15s |
| Upstream | `gamma /public-search`, or `gamma /markets/keyset` when `tag` is present and `q` is empty |

```jsonc
{
  "data": {
    "markets": [ /* Market[] as defined in 03-domain/POLYMARKET_DOMAIN_MODEL.md §1 */ ],
    "hasMore": false
  },
  "meta": { "fetchedAt": 1786000000000, "stale": false, "cached": true }
}
```

Notes:
- Upstream returns events with nested markets. We flatten to markets and carry `eventId` / `eventTitle` on each.
- Markets with `enableOrderBook === false` are filtered out. We cannot price a fill for them, so surfacing them is a dead end.
- Prices on this route are **indicative** (sourced from the Gamma market object). The UI must not use them for a fill preview.

---

## `GET /api/polymarket/market/[id]`

| | |
|---|---|
| Params | `id` (Gamma market id or slug) |
| Cache | 15s |
| Upstream | `gamma /markets/{id}` or `/markets/slug/{slug}` |

Returns a single `Market`. 404 with `NOT_FOUND` if absent.

---

## `GET /api/polymarket/book`

| | |
|---|---|
| Query | `tokenId` (string, required, decimal digits only) |
| Cache | 3s |
| Upstream | `clob /book?token_id=` |

```jsonc
{
  "data": {
    "tokenId": "5385559331142808883888124954625844687291300784542171644256567074739119302904",
    "bids": [ { "price": 0.44, "size": 82 }, { "price": 0.43, "size": 134 } ],
    "asks": [ { "price": 0.45, "size": 210 }, { "price": 0.46, "size": 95 } ],
    "tickSize": 0.01,
    "minOrderSize": 5,
    "negRisk": true,
    "lastTradePrice": 0.56,
    "fetchedAt": 1786000000000,
    "upstreamTimestamp": "1786000000"
  },
  "meta": { "fetchedAt": 1786000000000, "stale": false, "cached": false }
}
```

**Contract guarantee, and the reason this route exists at all:** `asks` is sorted **ascending** by price, so `asks[0]` is the best ask. Upstream sends it descending. The reversal happens in `mapOrderBook()` and is asserted by a mandatory test. See `03-domain/POLYMARKET_DOMAIN_MODEL.md` §2.

`tokenId` must be validated as a digit string and echoed as a string. It exceeds `Number.MAX_SAFE_INTEGER`; parsing it as a number corrupts it silently.

Empty `asks` is a valid response, not an error. It means the outcome cannot currently be bought.

---

## `GET /api/polymarket/history`

| | |
|---|---|
| Query | `tokenId` (required), `interval` (`1h`\|`6h`\|`1d`\|`1w`\|`max`, default `1w`), `fidelity` (minutes, optional) |
| Cache | 60s |
| Upstream | `clob /prices-history` |

```jsonc
{ "data": { "points": [ { "t": 1786000000, "p": 0.61 } ] }, "meta": { } }
```

---

## `POST /api/ai/forecast`

| | |
|---|---|
| Body | `{ "marketId": string, "tokenId": string, "samples"?: number }` |
| Cache | none |
| Timeout | hard 45s server-side; the client aborts at 50s |

Returns a `Recommendation` (see `03-domain/POLYMARKET_DOMAIN_MODEL.md` §5).

```jsonc
{
  "data": {
    "verdict": "NO_BET",
    "reasons": ["SPREAD_TOO_WIDE", "EDGE_BELOW_COST"],
    "estimatedEdge": -0.012,
    "suggestedFractionOfBankroll": null,
    "forecast": {
      "tokenId": "...",
      "outcomeLabel": "Yes",
      "blindProbability": 0.63,
      "dispersion": 0.07,
      "samples": [0.60, 0.62, 0.63, 0.65, 0.70],
      "anchoredProbability": 0.61,
      "blendedProbability": 0.622,
      "blendWeight": 0.35,
      "marketProbability": 0.618,
      "confidence": "medium",
      "evidence": [
        { "claim": "...", "sourceUrl": "https://...", "sourceTitle": "...",
          "publishedAt": "2026-08-02", "supports": "yes" }
      ],
      "risks": ["..."],
      "modelId": "claude-opus-5",
      "promptVersion": "blind-v1",
      "createdAt": "2026-08-15T21:04:00Z"
    },
    "fill": { /* FillEstimate */ }
  },
  "meta": { "fetchedAt": 1786000000000, "stale": false, "cached": false }
}
```

### Hard requirements on this route

1. **The market price must not be reachable from the blind elicitation prompt.** This is architectural, not a convention: the function that builds the blind prompt takes a parameter type that has no price field. Asserted by a test that inspects the assembled prompt string for the price to four decimal places and for the percentage rendering.
2. The model output is constrained by a tool schema. A response that fails schema validation is retried once, then returns `AI_INVALID_OUTPUT`. It never partially renders.
3. Zero usable evidence returns `AI_NO_EVIDENCE` with a 200 and an explicit empty-forecast shape. "I could not find sources I trust for this question" is a correct product output, not a failure.
4. Every error from this route is non-fatal to the rest of the widget.

---

## `GET /api/health`

```jsonc
{ "status": "ok", "commit": "a1b2c3d", "uptimeSeconds": 1234, "upstream": { "gamma": "ok", "clob": "ok" } }
```

Upstream checks are cached for 30s so the health endpoint cannot itself become a rate-limit problem.

---

## Error handling contract

| Situation | Code | HTTP | UI behaviour |
|---|---|---|---|
| Upstream 5xx or network failure | `UPSTREAM_UNAVAILABLE` | 502 | Retry affordance; keep last-known data with a staleness badge |
| Upstream 429 | `UPSTREAM_RATE_LIMITED` | 429 | "Refreshing paused", back off, do not present as an error |
| zod parse failure | `UPSTREAM_SHAPE_CHANGED` | 502 | Generic failure to the user; loud structured log for us |
| Unknown market or token | `NOT_FOUND` | 404 | "This market is no longer available" |
| Bad or missing params | `BAD_REQUEST` | 400 | Should be unreachable from the UI; a bug if seen |
| AI exceeded timeout | `AI_TIMEOUT` | 504 | "AI unavailable", retry offered, rest of widget unaffected |
| AI output failed schema twice | `AI_INVALID_OUTPUT` | 502 | Same |
| AI found no usable sources | `AI_NO_EVIDENCE` | 200 | Explicit "no usable evidence" state, not an error style |
