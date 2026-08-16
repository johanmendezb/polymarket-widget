# USER FLOWS

Four widget states, one visible at a time. At 380x600 there is no room for a persistent sidebar. Layout is container-queried, so the same states expand gracefully to full width.

Full annotated information architecture, with the reasoning behind each element, is in `02-research/UX_RESEARCH.md` §4. This document is the flow contract that the E2E test asserts against.

---

## The golden path

This is the canonical scenario. It is the demo, it is the E2E test, and it is the thing that must never break.

```
  A. SEARCH
     user types a query
     debounced 250ms -> /api/polymarket/search
     results render as skeletons -> rows
        |
        v
  B. MARKET DETAIL
     probability, freshness stamp, sparkline
     resolution criteria visible
     outcome selector (YES / NO / N options)
        |
        |--- optional, user-invoked ---> AI SECOND OPINION
        |                                 blind estimate elicited (price never in context)
        |                                 k samples -> median + dispersion
        |                                 evidence with dates
        |                                 blended with market, weight shown
        |                                 gate evaluated
        v
  C. ORDER PREVIEW
     amount in $ or shares, presets
     /api/polymarket/book -> walk -> fill estimate
     five lines: shares / avg price / fee / total cost / payout + net
     cost waterfall (P2)
     CTA carries every blocking state
        |
        v
  D. CONFIRMATION
     restates exactly what was previewed
     simulated position created
     "Simulated. No funds moved."
```

Timing target for the whole path, warm cache, excluding the optional AI step: **under 90 seconds of human time**, no page reload.

---

## State A: Search and discover

**Entry:** widget load.

| Element | Behaviour |
|---|---|
| Search input | `role="combobox"`, debounced 250ms, minimum 2 characters |
| Category chips | Trending, Politics, Crypto, Sports; map to Gamma `tag_id` |
| Result row | Question (2 lines max), probability and price, 24h volume, close date. One tab stop per row via roving tabindex. One action. |
| "Ask AI to help me pick" | P2. Never auto-fires. |

**States:**

- *Loading:* skeleton rows matching the final layout. Never a centred spinner; at 380px it erases all context.
- *Empty query:* trending markets, not a blank panel.
- *No results:* treated as our failure. Offer trending, category chips and a refinement suggestion. Never a bare "No results found".
- *Error:* retryable, with last-known results kept visible under a staleness badge.

**Exit:** selecting a row moves to state B.

---

## State B: Market detail

**Entry:** a market is selected.

| Element | Behaviour |
|---|---|
| Back | returns to A with the query preserved |
| Probability | large, with the cent price alongside; 200 to 300ms transition on change, desaturated colour, never a flash |
| Freshness | "updated 3s ago", always visible |
| Sparkline | from `prices-history`; P1 |
| Wide-spread notice | if spread > $0.10, show last traded price and label why |
| negRisk badge | "only one outcome can resolve YES" |
| Outcome selector | binary as two buttons; multi-outcome as proportional horizontal bars. One tab stop. |
| Resolution criteria | a disclosure in the primary flow, not a footer link |
| Order book | a disclosure. Present, not hidden. |
| AI panel | collapsed by default, distinct visual surface, user-invoked |

**AI panel sub-flow:**

```
idle -> [Get a second opinion] -> searching -> reading sources -> writing
                                     |
                                     +-- sources stream in FIRST, then the estimate
                                     |
        +----------------------------+-----------------------------+
        |                            |                             |
     success                    no usable evidence            failure / timeout
        |                            |                             |
   estimate range               "I could not find             "AI unavailable"
   + dispersion                  sources I trust for           + retry
   + dated evidence              this question"                     |
   + gate verdict                    |                              |
        |                            |                              |
        +----------------------------+------------------------------+
                                     |
                    market data and order preview remain fully usable in ALL branches
```

**Critical rule:** the AI call is on an independent data path. Nothing about states A, B, C or D may block on it.

**Exit:** selecting an outcome moves to state C.

---

## State C: Order preview

**Entry:** an outcome is selected.

An in-place step, not a modal. Modals at 380px trap focus and fight the host page's scroll.

```
Amount [ $ 25 ]  or  [ 40 shares ]     presets: 5 / 25 / 100
-----------------------------------------------------------
Shares                                        40
Avg. price                        62.4c  (best 62c)     <- row hidden if equal
Fee   (Politics, 4% taker)                 $0.375
Total cost                                 $25.34
If YES resolves, you receive               $40.00  (+$14.66)
-----------------------------------------------------------
> How this market resolves
> Cost breakdown                                        <- P2 waterfall
[            Place simulated bet            ]
  Simulated. No funds move.
```

**The CTA is the single error surface.** It carries every blocking state in a ladder:

```
"Enter an amount"
  -> "Minimum is $5 on this market"
  -> "Only 340 shares available at this price"
  -> "Market is not accepting orders"
  -> "Review bet"
  -> "Place simulated bet"
```

**Error classes, never merged:**

| Class | Behaviour |
|---|---|
| Network / API | Retryable. Keep last-known data with a staleness badge. |
| Rate limited | Back off. Show "refreshing paused", not an error. |
| Insufficient depth | A normal state. Cap the input, show max fillable, explain. |
| Market closed or resolved | Terminal. Disable the ticket, show the resolution. |

Errors announce via `aria-live="assertive"`. Routine price ticks announce nothing; re-announcing every refresh makes the widget unusable with a screen reader.

**Exit:** confirming moves to state D.

---

## State D: Confirmation

Restates exactly what was previewed. Same numbers, same order, no new information, no surprises. Shows the entry average price, the fee paid, the payout if it wins, and what happens next (this market resolves via UMA on or after `<date>`).

The simulation label appears here, at the point of commitment, not only in a footer.

**Exit:** "Back to markets" returns to state A. The simulated position remains listed for the session. It is in-memory only; a sandboxed iframe has no storage, and pretending otherwise would be a bug.

---

## Failure flows that must be demonstrated

A reviewer should be able to trigger these deliberately:

1. **Gate fires.** Pick a market with a wide spread or an extreme price. The verdict is NO_BET, the reason code is named, and the citation behind the threshold is one click away.
2. **AI down.** Kill the AI route. The widget still searches, prices and simulates.
3. **Thin book.** Request more shares than the book holds. The input caps, the maximum is shown, nothing throws.
4. **Closed market.** Open a market that is not accepting orders. The ticket disables with an explanation.
