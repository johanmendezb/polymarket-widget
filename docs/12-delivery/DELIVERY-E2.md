# DELIVERY - E2 Domain model and simulation engine

**Branch:** `e2-simulation`
**Staging:** https://polymarket-widget.onrender.com (unchanged — this epic ships no UI)
**Status:** ACCEPTED (auto-merge epic under the hybrid gate; no user-visible surface)

---

## What was delivered

All the arithmetic the product depends on, as pure functions with no framework and no I/O: the
branded primitives, the order-book walk, the fee model, edge and the cost waterfall, Kelly
sizing, and the 11-rule abstention gate.

This is the epic a reviewer can check with a calculator. It has no dependencies, it is never cut,
and it is where the domain understanding either shows or does not.

| Requirement | Status | Where |
|---|---|---|
| T2.1 branded primitives and domain types | done | `src/domain/` |
| T2.2 `walkBook`, `walkBookByBudget` | done | `src/simulation/book-walk.ts` |
| T2.3 `computeFee` | done | `src/simulation/fees.ts` |
| T2.4 `computeEdge` and the cost waterfall | done | `src/simulation/edge.ts` |
| T2.5 `kellyFraction` (P2) | done | `src/simulation/kelly.ts` |
| T2.6 `evaluateGate` | done | `src/simulation/gate.ts` |

## Test evidence

| Suite | Count | Result |
|---|---|---|
| Total | 154 | pass |
| `book-walk` | 20 | pass |
| `gate` | 17 | pass |
| `fees` | 11 | pass |
| `kelly` | 10 | pass |
| `edge` | 5 | pass |
| purity (domain + simulation) | 47 | pass |
| typecheck / lint | — | clean, zero warnings |

**`src/simulation` branch coverage: 100%.** Statements, branches, functions and lines all 100%,
measured with `vitest run --coverage`, which is E2's acceptance criterion 2.

`src/domain/simulation.ts` reports 0% and that is correct: it declares only interfaces and type
aliases, which compile away, so it has no executable statements to cover.

## The things most likely to be wrong, and what was done about them

**The fee.** `fee = C × feeRate × p × (1 − p)`, where `p` is the volume-weighted **average fill
price**, not top of book. The rate is read from `FeeConfig` and hardcoded nowhere. 5dp rounding
with the 0.00001 USDC minimum charge. This is R-03, the highest-likelihood correctness bug in the
project, and ADR-0009 exists because of it.

Worth recording: `ORDER_EXECUTION.md`'s worked example shows `$0.375` for 40 shares at 0.624,
while the document's own 5dp rule gives `0.3754`. The test asserts `0.3754` and carries a comment
explaining that the prose abbreviated. The document was not quietly matched.

**The book walk.** VWAP across three levels matches a hand computation to 6dp. An oversized
request returns a **partial fill** and never throws. An empty book returns zero shares with no
NaN and no division by zero. A property test asserts `avgPrice >= topOfBook` for random books.

One test is there specifically to prevent a future regression: it asserts that **normalization is
the caller's responsibility, not `walkBook`'s**, and proves the boundary by feeding a raw
descending fixture. Without it, someone reading the "asks arrive descending" note could
reasonably "fix" `walkBook` to reverse them — which would double-reverse against E3's mapper and
silently mis-price every fill.

**The gate.** Every threshold constant carries a comment citing `STRATEGY_RESEARCH.md` §C3, and
a reason code that cannot be traced to a cited threshold does not ship.

Rule 3 is deliberately **partially implemented**. It covers the "the book cannot fill it" clause,
and does not implement the "moves the price beyond a threshold" clause, because the research
names no numeric price-impact threshold — only qualitative evidence about order-size degradation.
Inventing a number would have been easy and would have looked complete. It is named in the code
as unimplemented instead.

## What was deliberately not delivered

No I/O, no React, no Next, anywhere in `src/domain` or `src/simulation` — enforced by lint, with
47 purity tests asserting it. No mappers, no routes, no UI: those are E3 and E4. Selling is not
modelled; v1 buys an outcome and nothing else.

`HIGH_DISPERSION_THRESHOLD = 0.15` is named in the code as a value that should be revisited once
there is real dispersion data, rather than presented as settled.

## Known gaps and risks introduced

- **The gate's 11 rules are unit-tested in isolation and against one clean market.** They have
  never run against live data, because nothing upstream is wired yet. The first real test is E5.
- **Kelly is P2 and first in the cut order after E8.** It is implemented and tested, but nothing
  downstream depends on it yet.
- **The dispersion threshold is a placeholder with a stated rationale**, not a measured value.
- **`walkBook` trusts its input ordering.** That is the correct boundary, but it means a bug in
  E3's `mapOrderBook` will surface as wrong prices here rather than as a failure there. E3's
  narrow-spread test is the guard.

## How to verify in 5 minutes

This epic has no UI. Verify it by reading and running, not by clicking.

1. `pnpm test` — expect 154 passing.
2. `pnpm exec vitest run --coverage` — expect `src/simulation` at 100% branch.
3. Open `test/simulation/fees.test.ts` and check the worked examples against
   `docs/03-domain/ORDER_EXECUTION.md` §2 with a calculator.
4. Open `src/simulation/gate.ts` and confirm every threshold names its source.

---

## QA CHECKLIST

- [ ] The stated scope is actually present
- [ ] The arithmetic is checkable and correct
- [ ] Nothing claimed as done is missing
- [ ] The known-gaps list is honest
- [ ] I accept this epic

**Verdict:** ACCEPTED under the hybrid gate agreed 2026-08-16. Recorded in `assumed_accepted`.
