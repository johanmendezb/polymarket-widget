# DELIVERY - Visual system and identity

**PRs:** #17 (token system), #18 (bold rework)
**Staging:** https://polymarket-widget.onrender.com/widget
**Status:** ACCEPTED — owner reviewed and approved both passes.

---

## Why this happened

The product worked and looked like an unstyled prototype, which undersold it. Two passes: a token
system first, then an identity. The second pass exists because the owner's verdict on the first
was correct — "looks better but not enough" — and because the market list, the first thing anyone
sees, had barely changed.

## Two real bugs, found by looking rather than assuming

Screenshots were captured before designing anything. Both of these were invisible in code review:

- **Dark mode did not fill its container.** `.shell` used `min-height: 100%`, which collapses when
  the parent has no height, so the dark surface stopped at the content and left white below.
- **Numbers were formatted inconsistently.** `198,424.23` sat beside `$151830.33` in the same
  table, because `formatShares` used `toLocaleString` and `formatUsd` used `toFixed(2)`. Now
  pinned by tests, including a thousands-separator case, because this is exactly the kind of thing
  that regresses silently.

## The root cause of the inconsistency was structural

**56 distinct hardcoded hex values across 6 CSS modules and zero design tokens.** Every module
invented its own palette inline. Nothing can be consistent when nothing is shared.

There are now ~60 semantically-named tokens in `globals.css` — `--register-model-fg`, not
`--purple-600` — covering surface, border, text, space, radius, a type scale with a display step,
tabular figures, three elevations, an accent ramp with a gradient, motion, and one focus ring.
**No module contains a raw hex.**

## The three registers now carry the thesis visually

The product's whole argument is that a prediction market is three numbers most interfaces blend
into one: what the market believes, what the model estimates, what acting would cost. The UI
stated that in words and contradicted it in styling.

Each register has its own token trio, applied consistently, so a reader can tell which register a
number belongs to **without reading the label**. That is not decoration here: "AI second opinion —
Yes" once read as a verdict of Yes precisely because the registers looked alike.

## The market list

Was: the question truncated mid-sentence, `Yes 75%` at 12px lost among equals, metadata competing
with the question, a thin strip in blank canvas at 1200px.

Is: question leading at display weight across two clean lines, **probability as a ring** parseable
at a glance and comparable down a column, metadata demoted to quiet chips, and cards with hover,
focus and press states.

## Constraints held

Every one of these is correctness rather than taste:

- Container queries only — the widget renders in an iframe and the viewport is not its width.
- Correct at 380px and 1200px, both themes first-class.
- No `localStorage`, `sessionStorage` or cookies.
- AA contrast everywhere, including on new tinted surfaces. Axe stays at zero critical violations,
  asserted by a Playwright test in the CI gate.
- Every animation has a `prefers-reduced-motion` path.
- **No new runtime dependencies.**
- **No copy changed.** Wording is bound by the claims policy in `docs/05-ai/EVALUATION.md` §B8, and
  several phrasings were fixed after real user confusion.
- Truthful `aria-checked`, no-selection-on-mount, the `estimated` fee label at AA contrast, and the
  simulated-vs-real labelling all survive.

## Evidence

464 unit tests, 18 E2E including the axe check, zero lint warnings, zero typecheck errors.
Screenshots captured before and after at 380px and 1200px in both themes.

## Known gaps

- **No visual regression testing.** The before/after screenshots were a design tool, not a
  committed baseline. A future restyle could drift without a test noticing.
- The identity is a first articulation, not a brand system. There is no logo, no illustration
  language, and no motion spec beyond the tokens.
- The wide layout is composed but not dense: with more results, a multi-column grid is the obvious
  next step and was left deliberately unexplored.
