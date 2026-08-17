## Scope: the rest of the widget, T4.2 through T4.5

T4.1 is done and on your branch: the container-queried shell, theming, and the layout system.
Build inside it; do not rework it.

**Build in the order T4.2, T4.3, T4.4, T4.5** — that is state A, then C, then B, then D. It is
deliberate: the two highest-value screens land first, so an overrun costs the least valuable
screen rather than the most. See EPICS.md E4.

- **T4.2 State A** — search and discovery
- **T4.3 State C** — order preview (the highest-value screen, 90 min, the one reviewers look at)
- **T4.4 State B** — market detail
- **T4.5 State D** — confirmation and position list

Read `docs/01-product/USER_FLOWS.md` in full. Every state in it must be reachable and rendered,
including the loading, empty and error states — those are not polish, they are acceptance criteria.

## The honesty requirements outrank the visual ones

`docs/06-execution/DEFINITION_OF_DONE.md` lists honesty above architecture in review order, and
these are the specific ways this epic can fail it:

- **Simulation must be visibly and unambiguously separated from live trading.** A user must never
  be able to think they placed a real bet. There is no wallet, no signing, no on-chain anything
  (ADR-0004), and the UI must say so where the action happens, not in a footer.
- **Three registers, kept apart.** The market price, the model's estimate, and what it would cost
  to act are three different numbers, and the entire product thesis is that they do not get
  blended into one. They must render in visibly different registers.
- **A fee sourced from the category fallback must be labelled estimated.** `FeeConfig.source`
  tells you. Checked live: the upstream fee fields are usually absent, so this label is the common
  case, not an edge case. Never show a bare `$0.00` fee.
- **Never state or imply the system beats the market.** The claims policy in
  `docs/05-ai/EVALUATION.md` §B8 binds UI copy.
- **Wide spread (> $0.10):** show the last traded price rather than a midpoint, and say why.
- **Resolution criteria belong in the primary flow**, not hidden behind a disclosure at the bottom.

## Interaction requirements

- Search: debounced, with combobox semantics. Result rows use a roving tabindex.
- **The golden path must be completable by keyboard alone.** Build focus management now; do not
  leave it for T7.1's accessibility pass.
- Price updates transition over 200–300ms and must never flash or jump.
- The order preview's CTA has an error ladder — disabled states must say *why*, specifically.
- `acceptingOrders === false` is terminal: disable the ticket and explain.
- Loading skeletons match the final layout's dimensions, or every load shifts the page.

## Data

Consume the four read routes from E3 through typed hooks. Prices for a fill preview always come
from a fresh `/book` call — the search route's prices are indicative only and must never price a
fill. Show the freshness stamp; the widget polls, and ADR-0012 requires the staleness to be
visible rather than hidden.

## Testing

Do **not** write tests asserting that a component rendered. Test the states that matter: empty,
error, insufficient depth, gate fired, closed market. `src/ui` has no coverage target, and
test-first on JSX is ceremony — write the component, then test the behaviour worth protecting.

## Acceptance criteria

1. Golden path clickable end to end with no reload.
2. Every state in `USER_FLOWS.md` reachable and rendered.
3. Correct at 380px and 1200px, driven by container queries.
4. Golden path completable by keyboard alone.
5. No `localStorage`, `sessionStorage` or cookies anywhere — grep and show the result.
6. Price updates transition over 200–300ms and never flash.
