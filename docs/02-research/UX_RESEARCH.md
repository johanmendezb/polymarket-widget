# UX Research - Polymarket Widget

**Prepared:** 2026-08-15
**Scope:** Items 5–6 of the brief (order/execution preview patterns; accessibility & embeddability), plus concrete interaction recommendations for the widget.
**Companion doc:** `COMPETITIVE_RESEARCH.md` (items 1–4). Cross-references below use its section numbers.
**Status labels:** `VERIFIED` / `INFERRED` / `UNKNOWN` / `CONFLICTING`.

---

## 1. Order-Preview & Execution-Preview Patterns

### 1.1 The vocabulary problem: price impact ≠ slippage

Getting these two words right is the difference between an honest preview and a misleading one.

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 1.1a | **Price impact** = "the change in token price caused by your own trade… the difference between the current market price and how your trade impacts the total liquidity in a pool." | VERIFIED | https://support.uniswap.org/hc/en-us/articles/8643794102669-Price-Impact-vs-Price-Slippage | 2026-08-15 |
| 1.1b | **Slippage** = "the difference between the price you *expect* to receive after swapping and what you *actually* receive after the swap is complete." | VERIFIED | same | 2026-08-15 |
| 1.1c | "Minimum received" and "slippage" are **two sides of the same coin** - do not present them as two independent line items. | VERIFIED (recommendation) | https://ethereum.org/developers/docs/design-and-ux/dex-design-best-practice/ | 2026-08-15 |
| 1.1d | Uniswap's specific UI warning thresholds (percentages at which a price-impact warning turns yellow/red) | **UNKNOWN** - not stated in the fetched support articles. Do not cite a number we cannot source. | https://support.uniswap.org/... ; https://blog.uniswap.org/what-is-slippage-crypto | 2026-08-15 |

**Applied to a prediction-market widget:** price impact is the concept that transfers. Walking a Polymarket order book to fill N shares moves your *average* fill price away from the best ask - that is price impact, and it is deterministic and previewable from public data (see COMPETITIVE §1.5d). Slippage in the DEX sense (drift between quote and settlement) is largely **not applicable to a simulated bet**, and we should not invent a slippage-tolerance control we do not need.

### 1.2 What good previews show

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 1.2a | Uniswap-family main form should carry four things in its corners: **wallet balance, Max button, fiat equivalent, price impact on received amount.** | VERIFIED (recommendation) | https://ethereum.org/developers/docs/design-and-ux/dex-design-best-practice/ | 2026-08-15 |
| 1.2b | Price impact is "often shown in brackets next to the fiat equivalent." Showing it in main form *and* details panel *and* preview screen is "useful but possibly overkill" - beware redundancy. | VERIFIED | same | 2026-08-15 |
| 1.2c | Slippage should be **directly editable from the details panel** as an "accelerator" for experienced users. | VERIFIED (recommendation) | same | 2026-08-15 |
| 1.2d | A preview screen creates **beneficial friction** - it forces users to reconsider - but risks showing redundant information. Decide deliberately whether the details panel is always visible or click-to-expand. | VERIFIED | same | 2026-08-15 |
| 1.2e | **Use the primary CTA button as the error surface.** It should render contextual states ("switch network", "connect wallet") and, when clicked, *perform* the fix rather than merely alerting. | VERIFIED (recommendation) | same | 2026-08-15 |
| 1.2f | Jupiter's swap quote surfaces: **estimated output, price impact, minimum received (after slippage tolerance), route composition** (which DEXs), and fee breakdown. | VERIFIED | https://uwuu.ai/blog/jupiter-swap | 2026-08-15 |
| 1.2g | Jupiter charges "0% protocol fee to retail users"; costs are underlying pool fees (0.01–0.30%), network fees, optional priority tips. Fee transparency is itemised by *origin*, not lumped. | VERIFIED | same | 2026-08-15 |
| 1.2h | Jupiter's slippage tolerance sits behind a **settings gear**, with guidance by asset liquidity: 0.1–0.5% liquid pairs, 0.5–1.5% established memecoins, 2–10%+ fresh launches. | VERIFIED | same | 2026-08-15 |
| 1.2i | Jupiter quotes **"update continuously until you sign."** Exact refresh interval not published. | VERIFIED (behaviour) / UNKNOWN (interval) | same | 2026-08-15 |
| 1.2j | Uniswap's auto-slippage is "usually between 0.1% and 5%, based on live gas fees and your swap size." Presets offered: 0.5%, 1%, 5%, or custom. | VERIFIED | https://blog.uniswap.org/what-is-slippage-crypto | 2026-08-15 |
| 1.2k | If price moves beyond tolerance the swap fails and **"you will still pay the network cost."** Failure is not free - say so. | VERIFIED | same | 2026-08-15 |
| 1.2l | Sandwich/MEV is named as a slippage cause: "Searchers may front-run or sandwich large swaps." | VERIFIED | same | 2026-08-15 |
| 1.2m | Manifold's order ticket already does the prediction-market version: it **"show[s] bet amount, payout, and price impact before execution."** | VERIFIED | https://cryptoslate.com/prediction-markets/manifold-predictions-review/ | 2026-08-15 |
| 1.2n | Manifold makes cost legible as price impact rather than fees: "M0 on trades… cost comes from AMM price impact and available limit-order liquidity." | VERIFIED | same | 2026-08-15 |
| 1.2o | Kalshi deducts fees automatically and transparently per contract - "no surprises, but it does eat into thin-edge positions." | VERIFIED | https://pillarlabai.com/blog/kalshi-vs-polymarket-2026/ | 2026-08-15 |

### 1.3 The order-preview pattern we should adopt

Synthesised from 1.1–1.2 plus COMPETITIVE §1.3a, §1.4b–c, §1.5d. **Status: INFERRED (a design recommendation built on verified inputs).**

**Five lines, in this order, always visible above the confirm button:**

| Line | Label | Value | Derivation |
|---|---|---|---|
| 1 | **Shares** | `N` shares of {Outcome} | user input (or derived from a $ input) |
| 2 | **Avg. price** | `p̄` ¢ *(best ask `p₀`¢ → shown alongside if different)* | walk the book: `p̄ = Σ(pᵢ·sᵢ)/Σsᵢ` (COMPETITIVE §1.5d) |
| 3 | **Fee** | `C × feeRate × p̄ × (1 − p̄)` USDC, with the category rate named | Polymarket official formula (COMPETITIVE §1.4b–c) |
| 4 | **Total cost** | `N·p̄ + fee` | - |
| 5 | **If it resolves YES you receive** | `$N` → **net profit `$N − total cost`** | $1 per winning share (COMPETITIVE §3.1) |

**Rules attached to the pattern:**

- **Show fee-inclusive cost by default, not as a disclosure.** Kalshi's "no surprises" automatic deduction (1.2o) is the bar. Most of the web still believes Polymarket is fee-free (COMPETITIVE §1.4h) - an accurate fee line is itself a differentiator.
- **Name the category rate in-line** ("Politics - 4% taker rate"), because it varies 0–7% and Geopolitics is genuinely free.
- **Show price impact only when it is non-trivial.** If `p̄` equals the best ask (order fills entirely at the top of book), suppress the line. Redundancy is a named risk (1.2b).
- **Do not ship a slippage-tolerance control.** We are simulating; there is no settlement drift. Adding one would be cargo-culting DEX chrome (1.1d, 1.2h).
- **Do not repeat price impact in three places.** Main form corner *or* preview - pick one (1.2b).
- **Primary CTA carries all blocking state** (1.2e): "Enter an amount" → "Insufficient liquidity for 1,200 shares" → "Review bet" → "Place simulated bet".
- **Quote freshness must be visible.** Jupiter quotes update until sign (1.2i); the avark guidance recommends "Updated 3s ago" timestamps to build trust in fast-moving markets (§3.1c below). Show a last-updated indicator and re-quote on a timer.
- **Thin-book honesty:** if bid-ask spread > $0.10, display last traded price rather than midpoint - Polymarket's own documented rule (COMPETITIVE §1.3a) - and label it ("wide spread; showing last trade").
- **Insufficient depth is a first-class state,** not an error. If the book cannot fill N shares, cap the input, show the max fillable, and explain why.

---

## 2. Accessibility & Embeddability Constraints

### 2.1 Iframe embedding: what a widget provider must live with

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 2.1a | Best practice for *hosts* is to embed third-party widgets in a **sandboxed iframe** (`sandbox="allow-scripts allow-forms"`), never via a direct `<script src>` tag. | VERIFIED (recommendation) | https://medium.com/aveva-tech/building-secure-widget-systems-with-javascript-iframes-4efd1e7963cc | 2026-08-15 |
| 2.1b | **Without `allow-same-origin`, the iframe runs in a "null" origin context** - it cannot access parent DOM, **localStorage, or cookies**. Adding `allow-same-origin` "completely defeats isolation." | VERIFIED | same | 2026-08-15 |
| 2.1c | Widget↔host communication should be **postMessage-only**, with a message bus that validates `event.source` against known iframe windows and validates message structure. | VERIFIED (recommendation) | same | 2026-08-15 |
| 2.1d | **Dynamic resizing pattern:** widget runs `ResizeObserver` on `document.body`, posts `{type:'resize', height: document.body.scrollHeight}` to parent; host sets `iframe.style.height`. | VERIFIED (code pattern) | same | 2026-08-15 |
| 2.1e | Sandboxing **inherently isolates CSS** - widget styles cannot leak out, host styles cannot leak in. Therefore **theme coordination must be passed explicitly via postMessage (or URL params), not inherited.** | VERIFIED | same | 2026-08-15 |
| 2.1f | Security caveats: never `eval()` message content; validate structure before processing; rate-limit message handlers; **do not pass auth tokens through postMessage**. | VERIFIED | same | 2026-08-15 |
| 2.1g | Each iframe can carry its **own CSP**, independent of the host's headers (e.g. `script-src 'self'`, `connect-src 'self' https://api...`, `object-src 'none'`). | VERIFIED | same | 2026-08-15 |
| 2.1h | Practical concurrency guidance: 10–100 concurrent widgets per page before memory overhead bites. | VERIFIED (as stated) | same | 2026-08-15 |
| 2.1i | `frame-ancestors` (host-side CSP) controls *who may frame you*; `frame-src` controls *what you may frame*. These are distinct directives. | VERIFIED | https://www.codegenes.net/blog/content-security-policy-for-frame-frame-src-vs-frame-ancestors/ | 2026-08-15 |
| 2.1j | Partitioned third-party storage (CHIPS) has known edge cases - e.g. an embedded third-party iframe opening a new tab to the same third-party site does not straightforwardly share partitioned cookies with its opener. | VERIFIED (open issue) | https://github.com/privacycg/CHIPS/issues/82 | 2026-08-15 |
| 2.1k | Whether Polymarket's public API endpoints set permissive CORS for browser-origin `fetch` from an arbitrary embedding origin. | **UNKNOWN - must be tested first thing.** If CORS is restrictive, the widget needs a thin proxy. This is the highest-priority unknown for implementation. | - | 2026-08-15 |
| 2.1l | Whether `embed.polymarket.com` sets `X-Frame-Options`/`frame-ancestors` restricting who may frame it. | **UNKNOWN** (COMPETITIVE §1.1l). Only relevant if we ever iframe *their* embed; not relevant if we build our own. | - | 2026-08-15 |

**Design consequences (INFERRED from 2.1a–2.1k):**

1. **Assume no persistent storage.** A conscientious host will sandbox us without `allow-same-origin` (2.1b), killing `localStorage`, `sessionStorage`, and cookies. Keep all widget state in memory; if state must survive, hand it to the host via postMessage and let the host persist it. **Never make a core flow depend on storage.**
2. **Assume no third-party cookies** even when storage exists - partitioning plus CHIPS edge cases (2.1j) make cookie-based session assumptions fragile.
3. **Theme must be an explicit input**, via URL param (`?theme=dark`) *and* a postMessage channel for live switching (2.1e). Do not rely on CSS inheritance; it cannot cross the frame boundary.
4. **Ship the resize protocol on day one** (2.1d) - a fixed-height iframe with internal scrolling is the #1 embed complaint, and 400×400 is the official embed's own default (COMPETITIVE §1.1d), which is smaller than our 380×600 target.
5. **Define the postMessage contract as a versioned API** - `{v:1, type, payload}` - with origin validation on both ends (2.1c, 2.1f).
6. **Provide a copy-paste snippet plus an optional loader script.** The official Polymarket embed hands users a raw `<iframe>` (COMPETITIVE §1.1d); PredictWidget hands users "two lines" (COMPETITIVE §2.1a). Match that ceremony level or lose adoption.

### 2.2 Keyboard navigation & ARIA

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 2.2a | **Core model: Tab/Shift+Tab moves *between* widgets; arrow keys navigate *within* them.** | VERIFIED | https://www.uxpin.com/studio/blog/keyboard-navigation-patterns-complex-widgets/ | 2026-08-15 |
| 2.2b | **Roving tabindex:** exactly one item has `tabindex="0"`, all siblings `tabindex="-1"`; arrows move focus and update the values. The composite widget is a **single tab stop**. | VERIFIED | same | 2026-08-15 |
| 2.2c | **Editable combobox with autocomplete** (our market search): type to filter; **Down** moves focus into suggestions; **Up/Down** navigate without committing; **Enter** confirms highlighted; **Escape** dismisses suggestions *and preserves the typed text*. | VERIFIED | same | 2026-08-15 |
| 2.2d | Required ARIA: `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"`/`role="option"`, `aria-selected`, `aria-activedescendant` for focus within dynamic containers. | VERIFIED | same | 2026-08-15 |
| 2.2e | **Modal dialogs:** focus moves to first meaningful element on open; Tab cycles **within the modal only**; background becomes **inert**; **Escape** closes and **returns focus to the triggering element** (store the reference before opening). | VERIFIED | same | 2026-08-15 |
| 2.2f | Listbox extras: **Home/End** jump to first/last; Page Up/Down for long lists; arrows move focus **without** changing selection. | VERIFIED | same | 2026-08-15 |
| 2.2g | **Visible focus indicators must meet minimum 3:1 contrast.** | VERIFIED | same | 2026-08-15 |
| 2.2h | DOM order must match visual layout; no keyboard traps; always provide a keyboard escape route. | VERIFIED | same | 2026-08-15 |
| 2.2i | Live regions are needed so screen readers announce dynamically changing values. | VERIFIED (listed among patterns) | same | 2026-08-15 |
| 2.2j | Manual keyboard-only testing must verify: logical tab order, visible focus at every step, no traps, documented widget keys work, screen reader announces roles/states/shortcuts. | VERIFIED (checklist) | same | 2026-08-15 |

**Widget-specific consequences (INFERRED):**

- Market search is an **editable combobox**, not a text input plus a div list. Implement 2.2c/2.2d exactly.
- The results list and the outcome selector are each **one tab stop** with roving tabindex (2.2b) - critical at 380px where a 20-item list would otherwise mean 20 tab presses to reach the CTA.
- The confirm step, if modal, needs full focus-trap discipline (2.2e). At 380×600, prefer an **in-place step change over a modal** - fewer focus hazards, no backdrop, no scroll-lock fights with the host page.
- **Live-updating prices must not be a naive `aria-live="polite"` region.** A price that re-announces every few seconds is a screen-reader denial-of-service. Recommendation: prices are `aria-live="off"` with a visible "Updated Ns ago" control, and announce **only** on the events that matter - quote refresh at the confirm step, and validation failures via `aria-live="assertive"`.
- Focus rings must survive our own theming (2.2g) - check 3:1 in both light and dark.

### 2.3 Small viewport, responsive layout, theming

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 2.3a | **Container queries are the correct tool for embeddable widgets**: "when component sizes vary independently of the viewport, media queries alone cannot solve the problem." Components "flow naturally in any layout, whether narrow or wide." | VERIFIED | https://blog.logrocket.com/container-queries-2026/ | 2026-08-15 |
| 2.3b | Container **size** queries have **baseline support across all major browsers since 2023**; container query length units fully supported. Container **style** queries are not complete (Firefox pending); scroll-state queries are Chrome/Edge/Opera only. | VERIFIED | same | 2026-08-15 |
| 2.3c | Syntax: `container-type: inline-size` (or shorthand `container: card / inline-size`), then `@container (min-width: 400px) { … }`. | VERIFIED | same | 2026-08-15 |
| 2.3d | Units: `cqi` (1% container inline size), `cqb`, `cqmin`, `cqmax`. Example fluid type: `font-size: clamp(14px, 10px + 1.33cqi, 20px);` | VERIFIED | same | 2026-08-15 |
| 2.3e | Gotchas: **a container cannot query itself** (only children can); flex items need explicit sizing or content collapses; **custom properties do not work in query conditions** (`@container (min-width: var(--bp))` fails); avoid using grid items as containers - add a wrapper; containment is performance opt-in. | VERIFIED | same | 2026-08-15 |
| 2.3f | Adoption is still modest - ~41% of developers have used container size queries. | VERIFIED | same | 2026-08-15 |
| 2.3g | `light-dark(a, b)` returns `a` in light schemes, `b` in dark; it responds to the **computed `color-scheme` property**, which is more powerful than a `prefers-color-scheme` media query. | VERIFIED | https://una.im/modern-css-theming | 2026-08-15 |
| 2.3h | `color-scheme: light dark` on root respects OS preference; can be **overridden at any level** (`.dark-section { color-scheme: dark; }`). | VERIFIED | same | 2026-08-15 |
| 2.3i | `contrast-color(c)` auto-selects black or white for best WCAG contrast against `c`. | VERIFIED | same | 2026-08-15 |
| 2.3j | This theming set is **"Baseline Newly Available… stable in all browser engines as of May 2026."** (`@function` for cleaner syntax is Chrome 139+ only.) | VERIFIED | same | 2026-08-15 |
| 2.3k | Adaptive elevation: swap shadow mechanisms via `light-dark()` - real shadows in light mode, glowing borders in dark. | VERIFIED (technique) | same | 2026-08-15 |
| 2.3l | Card lists must "degrade gracefully on mobile, showing only event, probability, and a single action button." | VERIFIED (recommendation) | https://avark.agency/learn/prediction-market-design-patterns | 2026-08-15 |
| 2.3m | Mobile guidance: ruthless information hierarchy, **thumb-zone optimisation for trade buttons**, real-time updates that communicate liveness without noise. | VERIFIED | same | 2026-08-15 |

**Consequences for 380×600 (INFERRED):**

- **Use `container-type: inline-size` on the widget root, and express every breakpoint as a container query** (2.3a–2.3c). The widget's width is *not* the viewport width - that is the whole point. Media queries would key off the host page's viewport and produce wrong layouts (a 380px widget inside a 1440px desktop page would get desktop styles).
- Watch the self-query gotcha (2.3e): the root sets `container-type`; an inner wrapper does the querying.
- Use `cqi`-based `clamp()` for headline probability type so it scales with the widget, not the page (2.3d).
- **Theme with `light-dark()` + `color-scheme`** (2.3g–2.3j) - Baseline as of May 2026, so it is safe. Set `color-scheme` from the host-provided theme param, falling back to `light dark` (OS preference). This gives host-override *and* OS-respect from one mechanism.
- Use `contrast-color()` (2.3i) for text on outcome-colour chips so YES/NO badges stay legible in both schemes without hand-tuned pairs.
- 380×600 is roughly **one card + one action** of vertical room once chrome is accounted for. Follow 2.3l: at the narrowest container, each result row shows **question, probability, one action** and nothing else.
- Put the primary action in the **thumb zone** - bottom of the frame (2.3m) - and make it sticky within the widget rather than requiring a scroll to reach.

---

## 3. Presenting Probability, Uncertainty and Price Without Misleading

### 3.1 Evidence base

| # | Claim | Status | Source | Checked |
|---|---|---|---|---|
| 3.1a | **Dual-format probability** (cents *and* percent together) is recommended; Robinhood's "72¢" cited as exemplary. | VERIFIED | https://avark.agency/learn/prediction-market-design-patterns | 2026-08-15 |
| 3.1b | "Choose chart types that communicate **uncertainty, not just price history**." Probability timeline charts communicate evolving consensus. | VERIFIED | same | 2026-08-15 |
| 3.1c | Animate probability changes over **200–300ms**: "Sudden number changes feel jarring and trigger anxiety." Green/red directional indicators should be **subtle and desaturated** to avoid "stock ticker anxiety." Timestamps ("Updated 3s ago") build trust. | VERIFIED | same | 2026-08-15 |
| 3.1d | Multi-outcome markets: **horizontal proportional bars, colour-coded per outcome**, are "the emerging standard." | VERIFIED | same | 2026-08-15 |
| 3.1e | **Three-layer progressive disclosure** for market detail (L1 event/probability/action; L2 chart/recent trades/resolution criteria/sizing; L3 order book/depth/specs/portfolio). | VERIFIED | same | 2026-08-15 |
| 3.1f | **"Make resolution criteria prominent, not buried. If users do not trust that resolution will be fair and transparent, nothing else in the interface matters."** | VERIFIED | same | 2026-08-15 |
| 3.1g | Show **"market probability beside AI forecast context, making disagreement visible."** | VERIFIED (as product description) | https://www.alphascope.app/blog/best-ai-tools-prediction-markets | 2026-08-15 |
| 3.1h | Metaculus AIB **requires** bots to "post a comment explaining reasoning alongside each forecast," and benchmarks them against the human community prediction. | VERIFIED | https://www.metaculus.com/aib/2026/spring/ | 2026-08-15 |
| 3.1i | AI forecasters are **beaten by pros in every measured comparison** (8.9–20.03 peer-score points); AI-**assisted humans** improve **24–28%**. | VERIFIED (as reported) | https://forum.effectivealtruism.org/posts/Spyz3wESZu2eeqhDj/ai-forecasting-in-2026-what-11-analyses-say | 2026-08-15 |
| 3.1j | Overconfidence is the dominant failure mode; practitioners **cap extreme predictions** because one high-confidence error "can erase a season of gains." | VERIFIED (as reported) | same | 2026-08-15 |
| 3.1k | Manifold ships a **calibration chart by probability bucket** in user profiles. | VERIFIED | https://news.manifold.markets/p/manifold-2026-new-year-new-stuff | 2026-08-15 |
| 3.1l | Citation UI: inline numbered citations with hover preview; source-card sidebar; **claim-level attribution** (paragraph-level lets unsourced inference blend in); confidence/citation-strength badges (strong/mixed/weak/unsupported) to defeat the "equal-weighting illusion"; **explicit missing-source disclosure**. | VERIFIED (recommendations) | https://www.aydesign.ai/blog/ai-citation-source-ui-patterns-2026 | 2026-08-15 |
| 3.1m | Perplexity shows **sources first, then streams the answer**; phase indicators Searching/Reading/Writing; source panel perpetually visible; ambiguous queries trigger refinement rather than weak answers; chunked (not per-character) streaming. | VERIFIED (design analysis) | https://blakecrosley.com/guides/design/perplexity | 2026-08-15 |

### 3.2 The three numbers - and how to keep them separate

The widget shows **three different probabilities/prices** that users will conflate unless we design against it.

| Number | What it is | Visual treatment | Never do |
|---|---|---|---|
| **Market probability** | Consensus implied by the book. Shown dual-format: `62% · 62¢` (3.1a). Use last trade if spread > $0.10 (COMPETITIVE §1.3a). | **Primary.** Largest type. Neutral colour. Owns the top of the card. | Never show it to more precision than the tick size implies. |
| **AI estimate** | Our model's forecast. Always rendered as a **range or interval**, never a bare point estimate. Always adjacent to the market number so disagreement is the visible artifact (3.1g, 3.1h). | **Secondary.** Visually subordinate - smaller, distinct container, explicitly labelled "AI estimate". Different colour family from market data. Always accompanied by reasoning + citations (3.1h, 3.1l). | Never render it in the same style as market data. Never omit the reasoning. Never let it exceed a clamp (3.1j). |
| **Execution price** | Your average fill `p̄` for *this* size, from walking the book. Differs from market probability whenever the order is larger than the top of book. | **Tertiary, but non-negotiable in the preview.** Appears only in the order-preview block, labelled "Avg. price", with best-ask shown alongside when they diverge. | Never present avg. fill as "the market price". Never let the CTA say a price the preview did not show. |

**Concrete anti-conflation rules (INFERRED, built on 3.1a–3.1m):**

1. **Three distinct visual registers.** Market data = neutral/primary; AI = a bordered "assistant" surface with its own accent; execution = monospace numerals in the preview block. A user must be able to tell which is which at a glance without reading labels.
2. **Never average or blend AI and market into one headline number.** Show both; show the delta explicitly ("AI: 55–65% · market: 62% · broadly agrees").
3. **Express disagreement in words, not just arithmetic.** "AI estimate is meaningfully above the market" beats "+9pp" for a non-trading audience (the "data dumps without natural language" anti-pattern, COMPETITIVE §6.5).
4. **Clamp AI output and disclose the clamp** (3.1j). E.g. never display an AI estimate outside 3–97%, with a footnote saying extreme confidence is capped by design. This is a credibility asset.
5. **Sources before answer** (3.1m). Render the evidence cards as they arrive, then stream the reasoning. This is the pattern that makes an AI feel like a researcher rather than an oracle.
6. **Claim-level citations** (3.1l). Each factual assertion in the AI rationale carries its own marker. Anything the model asserts without a source gets an explicit "no source" badge - the "citation graveyard" pattern.
7. **Confidence badge with a stated basis** (3.1l): strong / mixed / weak / unsupported, derived from source count and agreement - never from the model's self-reported confidence.
8. **Never claim accuracy we have not measured.** No backtested win-rates (COMPETITIVE §6.10), no "beats the market" (§6.11). If we want a track-record surface later, Manifold's calibration-by-bucket chart (3.1k) is the honest form.
9. **Never let AI pre-select an outcome.** It may rank, explain and highlight; the human commits. This preserves the 24–28% assisted-improvement framing (3.1i) rather than the automation framing the evidence does not support.
10. **Resolution criteria before confirm** (3.1f). The user should see how the market resolves before they simulate the bet - this is the highest-leverage trust element in the entire flow, per the source's unusually emphatic phrasing.

---

## 4. Recommended Widget Information Architecture

**Status: INFERRED** - a design proposal derived from the verified findings above and in COMPETITIVE §1–4. Target frame: 380×600, container-queried so it also works wider.

```
┌─ WIDGET ROOT (container-type: inline-size; color-scheme from host param) ─┐
│                                                                          │
│  STATE A - SEARCH / DISCOVER                                             │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ [ combobox: search markets…            ]  ← role=combobox (2.2c/d) │ │
│  │ ─ chips: Trending · Politics · Crypto · Sports  (Gamma tag filter) │ │
│  │ ┌ result row (roving tabindex, ONE tab stop) ────────────────────┐ │ │
│  │ │ Question (2 lines max)                                         │ │ │
│  │ │ 62% · 62¢          $1.2m vol · closes Nov 4    → one action    │ │ │  ← 2.3l
│  │ └────────────────────────────────────────────────────────────────┘ │ │
│  │ [ Ask AI to help me pick ]  ← optional, never auto-fires          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  STATE B - MARKET DETAIL (L1 + L2 of 3.1e; L3 behind a disclosure)      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ ← back      Question                                               │ │
│  │ ┌ MARKET ────────────────────────────────────────────────────────┐ │ │
│  │ │  62%  ·  62¢     ▲ subtle, desaturated, 200–300ms animation    │ │ │  ← 3.1a,c
│  │ │  sparkline / probability timeline        Updated 3s ago         │ │ │  ← 3.1b,c
│  │ │  multi-outcome → horizontal proportional bars                  │ │ │  ← 3.1d
│  │ └────────────────────────────────────────────────────────────────┘ │ │
│  │ ┌ AI ASSIST (collapsed by default; distinct surface) ────────────┐ │ │
│  │ │  AI estimate  55–65%   vs market 62% - broadly agrees          │ │ │  ← 3.1g
│  │ │  ▸ sources render first, then reasoning streams                │ │ │  ← 3.1m
│  │ │  ▸ claim-level citations [1][2]; unsourced claims badged       │ │ │  ← 3.1l
│  │ │  ▸ confidence: mixed (4 sources, partial agreement)            │ │ │
│  │ └────────────────────────────────────────────────────────────────┘ │ │
│  │ [ Outcome selector - YES / NO or N options, one tab stop ]        │ │
│  │ ▸ Resolution criteria  ← surfaced, NOT buried                     │ │  ← 3.1f
│  │ ▸ Order book depth (L3 disclosure - present, not hidden)          │ │  ← §6.3 comp.
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  STATE C - ORDER PREVIEW (in-place step, NOT a modal at 380px)          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Amount [ $  25 ]  or  [ 40 shares ]     presets: 5 / 25 / 100      │ │
│  │ ──────────────────────────────────────────────────────────────     │ │
│  │ Shares                                     40                      │ │
│  │ Avg. price                        62.4¢  (best 62¢)                │ │  ← price impact only if ≠
│  │ Fee  (Politics · 4% taker)                $0.037                   │ │  ← COMPETITIVE §1.4b
│  │ Total cost                                $25.00                   │ │
│  │ If YES resolves, you receive              $40.00  (+$14.96)        │ │
│  │ ──────────────────────────────────────────────────────────────     │ │
│  │ ▸ How this market resolves                                         │ │
│  │ [        Place simulated bet        ]  ← CTA carries all errors    │ │  ← 1.2e
│  │   "Simulated - no funds move"                                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  STATE D - CONFIRMATION                                                  │
│  Restates exactly what was previewed + entry price + what happens next.  │
└──────────────────────────────────────────────────────────────────────────┘
```

**IA principles applied:**
- Four states, one visible at a time. At 380×600 there is no room for a persistent sidebar.
- **AI is collapsed by default and user-invoked.** It never fires on load (cost, latency, and the "assist not oracle" framing of 3.1i).
- Progressive disclosure follows the verified three-layer model (3.1e), with the order book *available* rather than hidden (COMPETITIVE §6.3).
- The simulation label appears at the point of commitment, not only in a footer.

---

## 5. Loading, Empty and Error States

**Status: INFERRED** from 1.2e, 1.2k, 2.2i, 3.1c, 3.1m and COMPETITIVE §6.5.

### Loading
- **Skeletons that match final layout**, not spinners - at 380px a centred spinner erases all context.
- **Phase indicators for AI work** (3.1m): Searching → Reading → Writing. Users tolerate latency they can see the shape of.
- **Sources stream in before the AI answer** (3.1m). Staggered fade-in.
- **Chunked text streaming**, not per-character (3.1m).
- **Never block the market data on the AI call.** Market probability and the order preview must render fully while AI is still thinking. They are independent data paths.
- **Price refresh is not a loading state.** Update in place with a 200–300ms transition (3.1c) and a "Updated Ns ago" stamp. Never flash a skeleton over a price the user is reading.

### Empty
- **No search results:** treat as *our* failure, not the user's (3.1m) - offer trending markets, category chips, and a spelling/refinement suggestion. Never a bare "No results found."
- **Market has no liquidity:** show the market with an explicit "No orders on this side - cannot price a bet" state rather than rendering a misleading 50%.
- **AI has no usable evidence:** say so and stop. "I could not find sources I trust for this question" is a correct output. Do not emit an unsourced probability - that is the exact failure the citation-graveyard pattern exists to prevent (3.1l).

### Error
- **The CTA is the error surface** (1.2e). It states the problem and, where possible, fixes it on click. Ladder: `Enter an amount` → `Only 340 shares available at this price` → `Market closed` → `Review bet`.
- **Distinguish four error classes and never merge them:**
  1. *Network/API* - retryable, offer retry, keep last-known data visible with a staleness badge.
  2. *Rate-limited* - back off; published limits are UNKNOWN (COMPETITIVE §1.5g) so assume they exist. Show "refreshing paused" rather than an error.
  3. *Insufficient depth* - a normal state, not an error; cap and explain.
  4. *Market closed/resolved* - terminal; disable the ticket, show the resolution.
- **Errors must be announced** via `aria-live="assertive"` (2.2i) while routine price ticks are not announced at all.
- **Never silently substitute a fallback number.** If the midpoint is unavailable and we fall back to last trade, label it (COMPETITIVE §1.3a).
- **Failure is not free** is the DEX lesson (1.2k). Our analogue: if a simulated bet cannot be priced, say precisely why rather than failing generically.

---

## 6. UI Anti-Patterns to Avoid

Short list, each with a source.

| # | Anti-pattern | Why | Source |
|---|---|---|---|
| 6.1 | **Bare AI point estimate with no range, reasoning or sources** | Overconfidence is the dominant AI-forecasting failure mode; one high-confidence error erases a season of gains. Metaculus *requires* reasoning alongside every bot forecast. | EA Forum synthesis; Metaculus AIB |
| 6.2 | **Rendering the AI number in the same visual register as the market number** | Guarantees conflation. The whole value is making disagreement visible. | Alphascope description |
| 6.3 | **Showing cost without the taker fee** | Polymarket charges `C×feeRate×p×(1−p)`, 0–7% by category, since 2026. Most of the web still says "0% fees." | Polymarket Trading Fees help article |
| 6.4 | **Presenting best-ask as your price for a size the top of book cannot fill** | Price impact is the difference between quoted and achieved price; Polymarket's own guidance is to walk the book to estimate it. | Uniswap price-impact doc; Polymarket agent-skills |
| 6.5 | **Duplicating price impact in three places** | Named as "useful but possibly overkill"; at 380px it is pure noise. | ethereum.org DEX best practice |
| 6.6 | **Hiding order-book depth and volume to look clean** | Removes trust signals; explicitly named as an anti-pattern despite simplifying the UI. | avark prediction-market patterns |
| 6.7 | **Flashing colours / abrupt number jumps** | "Stock ticker anxiety." Animate 200–300ms; keep green/red desaturated. | avark |
| 6.8 | **Data dumps with no natural-language explanation** | Named anti-pattern; confuses users unfamiliar with trading. | avark |
| 6.9 | **Onboarding before exploration** | Named anti-pattern; fatal in a 380×600 frame. | avark |
| 6.10 | **Burying resolution criteria** | "If users do not trust that resolution will be fair and transparent, nothing else in the interface matters." | avark |
| 6.11 | **Paragraph-level-only citations** | Lets unsourced model inference blend invisibly with sourced claims. | AY Design citation patterns |
| 6.12 | **Media queries for widget layout** | The widget's width is not the viewport's width; media queries key off the host page and produce wrong layouts. Container queries are Baseline. | LogRocket container queries 2026 |
| 6.13 | **Depending on localStorage / cookies** | A properly sandboxed iframe has a null origin: no localStorage, no cookies. Storage partitioning adds further edge cases. | AVEVA widget security; CHIPS issue #82 |
| 6.14 | **Inheriting theme from the host via CSS** | Sandbox isolates CSS in both directions; theme must be passed explicitly by param or postMessage. | AVEVA widget security |
| 6.15 | **`aria-live` on a continuously ticking price** | Re-announcing every refresh makes the widget unusable with a screen reader. Announce only meaningful events. | Derived from UXPin live-region guidance |
| 6.16 | **A modal confirm step at 380×600** | Focus-trap hazards, scroll-lock conflicts with the host page, and no room. Use an in-place step. | Derived from UXPin modal focus requirements + small-viewport constraint |
| 6.17 | **A slippage-tolerance control on a simulated bet** | Slippage is quote-to-settlement drift; there is no settlement here. Copying DEX chrome we do not need adds a decision the user cannot answer. | Uniswap price-impact-vs-slippage definitions |
| 6.18 | **Fixed-height iframe with internal scrolling** | Official Polymarket embed defaults to 400×400 with a "Fit container" option; hosts expect height negotiation. Ship the ResizeObserver/postMessage protocol. | embed.polymarket.com; AVEVA resize pattern |

---

## Sources

All URLs checked **2026-08-15**.

**Order preview / DEX patterns**
- https://ethereum.org/developers/docs/design-and-ux/dex-design-best-practice/
- https://support.uniswap.org/hc/en-us/articles/8643794102669-Price-Impact-vs-Price-Slippage
- https://blog.uniswap.org/what-is-slippage-crypto
- https://support.uniswap.org/hc/en-us/articles/8643879653261-How-to-change-slippage-on-the-Uniswap-Web-app
- https://uwuu.ai/blog/jupiter-swap
- https://cryptoslate.com/prediction-markets/manifold-predictions-review/
- https://pillarlabai.com/blog/kalshi-vs-polymarket-2026/
- https://sailgp.com/prediction-markets/kalshi/fees

**Polymarket mechanics feeding the preview**
- https://help.polymarket.com/en/articles/13364478-trading-fees
- https://github.com/Polymarket/agent-skills/blob/main/market-data.md
- https://embed.polymarket.com/
- https://polymarket.com/event

**Accessibility & embeddability**
- https://www.uxpin.com/studio/blog/keyboard-navigation-patterns-complex-widgets/
- https://www.uxpin.com/studio/blog/wcag-211-keyboard-accessibility-explained/
- https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/
- https://medium.com/aveva-tech/building-secure-widget-systems-with-javascript-iframes-4efd1e7963cc
- https://www.codegenes.net/blog/content-security-policy-for-frame-frame-src-vs-frame-ancestors/
- https://github.com/privacycg/CHIPS/issues/82
- https://blog.logrocket.com/container-queries-2026/
- https://una.im/modern-css-theming

**Probability / AI presentation**
- https://avark.agency/learn/prediction-market-design-patterns
- https://www.aydesign.ai/blog/ai-citation-source-ui-patterns-2026
- https://blakecrosley.com/guides/design/perplexity
- https://www.metaculus.com/aib/2026/spring/
- https://forum.effectivealtruism.org/posts/Spyz3wESZu2eeqhDj/ai-forecasting-in-2026-what-11-analyses-say
- https://www.alphascope.app/blog/best-ai-tools-prediction-markets
- https://news.manifold.markets/p/manifold-2026-new-year-new-stuff
