# ORDER EXECUTION, FEES AND THE COST WATERFALL

This is the technical heart of the project. It is also the part a reviewer can check arithmetically on screen, which makes it the highest-credibility component per hour spent.

Everything here is a pure function in `src/simulation/`. No I/O, no React, no framework. Fully unit-tested before any UI consumes it.

---

## 1. Walking the book

### The algorithm

To buy `N` shares of an outcome, you consume ask levels from best price upward until `N` is filled.

```
normalize:        asks sorted ASCENDING by price   (see DOMAIN_MODEL §2, upstream sends DESCENDING)
remaining := N
legs := []
for level in asks:
    take := min(remaining, level.size)
    if take > 0: legs.push({ price: level.price, shares: take })
    remaining -= take
    if remaining == 0: break

sharesFilled := N - remaining
averagePrice := Σ(leg.price × leg.shares) / sharesFilled
topOfBookPrice := asks[0].price
priceImpact := averagePrice − topOfBookPrice
partial := remaining > 0
```

### Dollar-denominated requests

When the user enters a dollar amount rather than a share count, the share count is not known in advance because the average price depends on it. Solve it in the same single pass:

```
budget := requestedUsdc
for level in asks:
    levelCost := level.price × level.size
    if budget >= levelCost:  take whole level;  budget -= levelCost
    else:                    take := budget / level.price;  budget := 0;  break
```

Then compute the fee on the resulting `sharesFilled` and `averagePrice`, and note that the fee makes the *total* cost exceed the entered budget. Two defensible behaviours:

- **Chosen for v1:** treat the entered dollar amount as the **cost of shares**, and show the fee as an additional line, so `totalCost = entered + fee`. This matches how the preview reads top to bottom and keeps the arithmetic checkable.
- Rejected: solving for shares such that `grossCost + fee = entered`. It requires a fixed-point iteration for a number the user cannot verify by eye, and the research on order previews favours legibility over precision here.

Whichever is implemented, the preview must be self-consistent and the label must say which it is.

### Edge cases that are behaviour, not errors

| Case | Required behaviour |
|---|---|
| Empty asks array | `sharesFilled = 0`, `partial = true`, no throw, no NaN. UI shows "No orders on this side, cannot price a bet". |
| Book cannot fill the request | Fill what is available, set `partial`, expose `maxFillableShares`, and have the UI cap the input and explain why. This is a normal state, not an error. |
| Request below `minOrderSize` | Block at the CTA with the actual minimum named. |
| Price not a multiple of `tickSize` | Only relevant for limit orders. v1 simulates market buys only, so tick size is display metadata. Do not invent tick rounding we do not need. |
| Market `acceptingOrders === false` | Terminal state. Disable the ticket, show why. |
| Spread wider than $0.10 | Display last traded price rather than midpoint, and label it "wide spread, showing last trade". This is Polymarket's own documented display rule. |

---

## 2. Fees

**The formula, verbatim from official documentation, checked 2026-08-15:**

```
fee = C × feeRate × p × (1 − p)
```

`C` is shares traded, `p` is share price. Takers pay; makers never do. Rounded to five decimal places, minimum charge 0.00001 USDC.

Implementation notes:

- `p` is the **volume-weighted average fill price**, not the top of book, because that is the price the shares actually traded at.
- `feeRate` comes from the market object or the CLOB fee-rate endpoint. Never a constant. See ADR-0009.
- The quadratic shape matters and should be visible in the UI copy: the fee is largest at 50/50 and vanishes near certainty.

**Worked example.** 40 shares of a politics market at an average fill of 62.4 cents:

```
fee = 40 × 0.04 × 0.624 × 0.376 = 0.3753984  →  rounds to $0.37540 at the stated 5dp
gross = 40 × 0.624 = $24.96
total = $25.3354  →  $25.34 to the cent
payout if it resolves YES = $40.00
net profit = $14.6646  →  $14.66 to the cent
```

> **Corrected during T2.3.** This example originally showed the fee step as `= 0.37536 →
> $0.375`. `0.624 × 0.376 = 0.234624`, so `40 × 0.04 × 0.234624 = 0.3753984`, which rounds to
> `0.37540` under this section's own 5dp rule - not `0.37536` and not `$0.375`. The `gross`,
> `total`, `payout` and `net profit` lines were unaffected (they already matched, to the cent,
> the more precise figure). `computeFee`'s test suite asserts the corrected `0.3754` value.

**Worked example at the fee maximum.** 100 shares of a politics market at 50 cents:

```
fee = 100 × 0.04 × 0.5 × 0.5 = $1.00   on a $50 stake  →  2.0% of stake
```

That 2% is the number that governs the whole product. It is the reason the abstention gate exists.

---

## 3. The cost waterfall

This is what the widget renders, and what the demo walks through. Every step is arithmetic on live data, checkable on screen. Nothing here requires trusting a model.

```
  market midpoint            0.610      what the market believes
+ half-spread to the ask     0.620      what you can actually buy at right now
+ price impact at your size  0.624      what your size does to your own fill
+ fee per share              0.0094     0.04 × 0.624 × 0.376
= effective cost per share   0.6334
                             ------
  AI blended estimate        0.680
− effective cost per share   0.6334
= surviving edge per share   0.0466     4.7 probability points
```

Rules for rendering it:

- Show the whole chain, not the endpoints. The chain is the argument.
- If `surviving edge <= 0`, the correct product answer is **no bet**, and the waterfall itself is the explanation.
- Suppress the price-impact row when `averagePrice === topOfBookPrice`. Redundant rows are noise at 380px.
- Never show a single blended "you could make X%" number. That is the thing every other tool does and it is the thing we are arguing against.

---

## 4. Position sizing

Kelly for a binary contract bought at price `q` with estimated probability `p`:

```
f* = (p − q) / (1 − q)
```

**Full Kelly is wrong here and we do not offer it as a default.** With `q = 0.90` and `p = 0.95`, full Kelly says stake 50% of bankroll. Estimation error in the mean is roughly twenty times more damaging than error in the variance, and our `p` is a model output with measurable dispersion.

Shipped behaviour:

- Default **quarter Kelly**.
- Half Kelly selectable.
- Full Kelly shown but disabled, with the note that betting at 2x Kelly drives expected excess return to zero.
- Hard cap of 2% of a notional bankroll regardless of what the formula says.
- Sizing is suppressed entirely on a `NO_BET` verdict.

The bankroll is a user-entered notional in the widget. There is no real balance because there are no real funds.

---

## 5. What we explicitly do not model

Stated so a reviewer knows it is a decision rather than an oversight.

| Not modelled | Why |
|---|---|
| Settlement slippage | There is no settlement in a simulation. Modelling it would be theatre. |
| Maker orders and rebates | v1 simulates taker market buys only. Maker simulation needs queue-position modelling we cannot validate in 48 hours. |
| Selling or closing a position | Post-challenge. Doubles the UI surface for little demo value. |
| Negative-risk conversion arbitrage | Real and interesting; requires multi-market state and the Neg Risk Adapter. Documented in `01-product/FUTURE_VISION.md`. |
| Resolution tail risk as a number | The annulment rate for Polymarket is UNKNOWN. We disclose it qualitatively rather than invent a figure. |
| Gas and bridging costs | No onchain interaction occurs. |
| Order queue and partial-fill timing | No orders are placed. |
