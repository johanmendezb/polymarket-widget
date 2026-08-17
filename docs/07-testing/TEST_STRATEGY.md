# TEST STRATEGY

## Principle

Test where correctness is checkable and failure is expensive. That is the simulation arithmetic and the upstream boundary. Do not write tests that assert a component rendered; they cost time and prove nothing.

The distribution is deliberately unbalanced:

```
       /\          E2E              1 golden path + 6 failure paths
      /  \
     /    \        Integration      4 routes x 6 scenarios, MSW-backed
    /      \
   /        \      Unit             everything in domain + simulation, exhaustively
  /__________\
```

`src/simulation` targets 100% branch coverage. `src/ui` has no coverage target at all.

## TDD, where it actually applies

Strict red-green-refactor for `src/domain` and `src/simulation`. These are pure functions with hand-computable expected outputs, which is exactly the situation TDD is good at. Write the failing test, watch it fail, implement.

For UI, write the component, then write tests for the states that matter (empty, error, insufficient depth, gate fired). Test-first on JSX is ceremony.

## The tests that matter most

If time collapses and only a handful survive, these are they. Each one guards a failure that would silently corrupt everything downstream.

| # | Test | Guards against |
|---|---|---|
| 1 | `mapOrderBook` reverses upstream descending asks so `asks[0]` is the best ask | Pricing every buy at 99c instead of 45c. Verified live on 2026-08-15 that upstream sends asks descending. |
| 2 | `walkBook` VWAP across three levels matches a hand computation to 6dp | Silently wrong fill prices |
| 3 | `computeFee` reproduces both worked examples exactly | Shipping a fee-free preview, which most of the ecosystem does |
| 4 | Token id round-trips as a string with no precision loss | Corrupting a 77-digit id via `Number()` |
| 5 | The blind prompt contains no rendering of the market price | Anchoring collapse, which invalidates every edge number |
| 6 | Killing the AI route leaves the golden path fully functional | The AI becoming a single point of failure |
| 7 | An oversized order request returns a partial fill and never throws | The most common real-world state becoming a crash |
| 8 | Empty asks returns zero shares with no NaN and no division by zero | Illiquid markets breaking the widget |

## Unit tests

### `src/domain`
Branded constructors reject out-of-range values. Token id string handling. Type-level tests where useful.

### `src/simulation`
Every invariant I1 to I12 from `03-domain/POLYMARKET_DOMAIN_MODEL.md` §6 has a test. Plus:

**`walkBook`**
```
fill within top level         -> averagePrice === topOfBookPrice, priceImpact === 0
fill across three levels      -> hand-computed VWAP
request exceeds total depth   -> partial, maxFillableShares correct, no throw
empty asks                    -> 0 shares, no NaN
single level exactly consumed -> no off-by-one
budget request splits a level -> fractional shares correct
property: avgPrice >= topOfBook for random books
```

**`computeFee`**
```
politics 40 shares @ 0.624    -> $0.375
politics 100 shares @ 0.50    -> $1.00   (the fee maximum)
geopolitics rate 0            -> exactly $0
p = 0.01 and p = 0.99         -> near zero, symmetric
5dp rounding boundary
feesEnabled false             -> $0
```

**`evaluateGate`**
```
one test per rule, firing it in isolation   (11 tests)
clean market                                -> CONSIDER, empty reasons
three rules trip                            -> all three returned
each threshold constant carries a source comment   (asserted by a lint rule or reviewed manually)
```

**`kellyFraction`**
```
q=0.90 p=0.95 -> full 0.5, quarter 0.125, both capped to 0.02
p <= q        -> null
```

**AI aggregation**
```
median of log-odds for k=1, k=5, with an outlier
samples at 0.01 and 0.99 (where an arithmetic mean would misbehave)
IQR dispersion on known inputs
logit blend at w=0.35, including boundary probabilities
```

## Integration tests

MSW intercepts upstream. Fixtures are real recorded responses from `test/fixtures/`, dated.

Per route, six scenarios:

| Scenario | Expected |
|---|---|
| Happy path | 200, documented envelope |
| Upstream 500 | 502 `UPSTREAM_UNAVAILABLE`, retryable |
| Upstream 429 | 429 `UPSTREAM_RATE_LIMITED`, stale served if warm |
| Malformed payload | 502 `UPSTREAM_SHAPE_CHANGED`, field named in the log |
| Unknown id | 404 `NOT_FOUND` |
| Invalid input | 400 `BAD_REQUEST` |

Plus cache behaviour: two concurrent identical requests produce one upstream call; an expired entry refetches; a failed upstream with a warm entry serves `stale: true`.

For `/api/ai/forecast`, additionally: schema violation retries once then `AI_INVALID_OUTPUT`; timeout yields `AI_TIMEOUT`; `insufficient_evidence: true` yields `AI_NO_EVIDENCE` with a 200.

## E2E

Playwright, Chromium only, fully deterministic against MSW. No live network in CI, ever, because a flaky demo-day test is worse than no test. (Mechanism decided at T6.1: `page.route()` intercepting the browser's own calls to this app's `/api/*` contract, not the `msw` package — see ADR-0011's implementation note for why.)

**Golden path** (`01-product/USER_FLOWS.md`): search, select, detail, request AI, choose outcome, enter amount, assert the five preview values against numbers computed from the fixture book, confirm, assert the position. Asserts on values, not just element presence.

**Failure paths:**
1. Gate fires: a fixture market with a wide spread yields NO_BET with the reason visible.
2. AI route returns 500: the golden path still completes to a simulated position.
3. Thin book: requesting more than depth caps the input and shows the maximum.
4. Closed market: `acceptingOrders: false` disables the ticket with an explanation.
5. Upstream 429: "refreshing paused", not an error state.
6. Upstream shape change: graceful failure, no white screen.

## Live contract tests

A separate suite, excluded from CI, run manually against production Polymarket. It asserts the documented behaviour still holds and re-records fixtures.

Run it at the start of the build and once before the demo. If it fails, the fixtures are stale and something upstream changed, which is exactly what we want to know before a reviewer finds out.

## What is deliberately not tested

Stated so a reviewer sees the decision.

| Not tested | Why |
|---|---|
| Visual regression | No baseline, no time, and the layout will change until the last hour |
| Cross-browser | Chromium only. A widget should be tested broadly; in 48 hours it is not. Named as a limitation. |
| Load and performance | No meaningful traffic model exists for a demo |
| The model's forecast quality | Not testable. It is *evaluated*, separately and honestly, per `05-ai/EVALUATION.md`. Conflating the two would be the exact dishonesty this project is arguing against. |
| Component render snapshots | They break on every layout change and catch nothing |
