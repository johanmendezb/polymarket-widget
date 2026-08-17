## Scope: E6 — integration and E2E, T6.1 then T6.2

Prove the system works, **including when it fails**. The failure paths matter more here than the
happy path, because the happy path is already covered by unit and integration tests.

Read `docs/07-testing/TEST_STRATEGY.md` and `docs/01-product/USER_FLOWS.md` §Failure flows.

## T6.1 — the golden path

Playwright, Chromium only, against MSW-backed fixtures. **Fully deterministic, no live network,
ever.** A flaky demo-day test is worse than no test.

The golden path asserts the five preview values **against numbers computed from the fixture
book** — actual values, not element presence. A test that only checks a number rendered would
pass against a broken book walk, and that is explicitly grounds for review rejection.

## T6.2 — the six failure paths

Each needs a passing test:

1. **Gate fires** — a wide-spread fixture produces NO_BET with its reason visible.
2. **AI route 500** — the golden path still completes to a simulated position. This is the
   resilience claim the whole architecture rests on; if it fails, that is a real finding.
3. **Thin book** — the input caps and the maximum is shown, rather than erroring.
4. **Closed market** — `acceptingOrders: false` disables the ticket **with an explanation**.
5. **Upstream 429** — renders as "refreshing paused", not as an error state.
6. **Upstream shape change** — degrades gracefully, no white screen.

## Playwright in CI

T1.2 deliberately left Playwright out of CI, noting that browsers in CI were E6's problem. It is
now your problem: add the job, cache the browser download, and keep the whole suite under two
minutes. If it cannot be made reliable in CI, say so plainly in the handoff rather than
committing a flaky job — a red-by-default job on `main` teaches people to ignore CI.

## Acceptance criteria

1. Golden path E2E green in CI, deterministic, no live network.
2. All six failure paths have passing tests.
3. The five preview values are asserted as computed numbers, not as "something rendered".
4. The full suite runs in under two minutes.
