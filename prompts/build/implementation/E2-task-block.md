## Scope: the whole simulation engine, T2.2 through T2.6, in order

You own five contracts, not one. They are serial — T2.4 needs T2.2 and T2.3; T2.6 needs T2.4 — so
work them in order and commit each separately. Read each contract from `BACKLOG.md` as you reach
it, not all five up front.

- **T2.2 `walkBook`** and `walkBookByBudget`
- **T2.3 `computeFee`**
- **T2.4 `computeEdge`** and the cost waterfall
- **T2.5 `kellyFraction`** (priority P2 — if you are running long, say so and stop before it)
- **T2.6 `evaluateGate`**

Also read `docs/03-domain/ORDER_EXECUTION.md` §2. Its worked examples are **literal test cases
with the stated outputs**, not illustrations. Reproduce them exactly, to the stated precision.

## This is the epic a reviewer checks with a calculator

It is the component with no dependencies, it is never cut, and it is where the domain
understanding is demonstrated. Two things follow.

**Strict TDD, no exceptions.** These are pure functions with hand-computable outputs. Write the
failing test, watch it fail, then implement. `CLAUDE.md` rule 2 is not negotiable here.

**100% branch coverage on `src/simulation`**, and it must be real. A test that would also pass
against a broken implementation is grounds for review rejection.

## The things that go wrong

- **Never hardcode a fee rate.** `fee = C × feeRate × p × (1 − p)` where `p` is the
  volume-weighted **average fill price**, not top of book. Read the rate per market; on fallback
  set `FeeConfig.source = 'category-fallback'`. An absent upstream field is not a zero rate. This
  is the single highest-likelihood correctness bug in the project (ADR-0009).
- **Price fills by walking the book, never by midpoint** (ADR-0008).
- **Nothing throws.** Empty book, thin book, and an oversized request must all return valid
  values. Empty asks → zero shares, no NaN, no division by zero. An oversized order returns a
  **partial fill**, never an exception.
- Every invariant I1 through I12 from the domain model gets a passing test. Include a property
  test that `avgPrice >= topOfBook` for randomly generated books.
- Each gate threshold constant carries a source comment naming where the number came from. A
  threshold with no provenance is a number someone made up.

## Acceptance criteria

1. Every invariant I1–I12 has a passing test.
2. 100% branch coverage on `src/simulation`, shown with real `--coverage` output.
3. The `ORDER_EXECUTION.md` §2 worked examples pass as literal test cases.
4. No React, Next, or I/O anywhere in `src/domain` or `src/simulation`, enforced by lint.
5. Empty, thin and oversized inputs all return valid values and never throw.
6. `evaluateGate` fires on a fixture market and names its reason codes.
