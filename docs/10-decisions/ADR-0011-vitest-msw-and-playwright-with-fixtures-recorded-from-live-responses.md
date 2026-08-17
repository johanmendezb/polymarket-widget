# ADR-0011 - Vitest, MSW and Playwright, with fixtures recorded from live responses

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The project needs unit, integration and E2E coverage inside a 48-hour budget, and the demo must not depend on a flaky test suite.

## Problem

What is the smallest test architecture that actually proves correctness?

## Options considered

1. Unit tests only.
2. Unit plus integration, no E2E.
3. Unit plus integration plus E2E, all fixture-backed, with a separate live contract suite excluded from CI.

## Evidence

The highest-value tests are on pure arithmetic and on the upstream boundary. E2E against live APIs would be flaky and would fail for reasons unrelated to our code. Fixtures recorded from real responses give determinism without giving up realism, and a separate live suite catches upstream drift when we choose to look.

## Decision

**Option 3.** Vitest for unit and integration. MSW with dated fixtures recorded from production. Playwright, Chromium only, fully deterministic. A `test:live` suite run manually at build start and before the demo.

## Consequences

Positive: deterministic CI; realistic fixtures; upstream drift is detectable on demand.
Negative: fixtures go stale, so re-recording is an explicit demo-day step; Chromium-only is a named limitation.

## Reversibility

**High.**

## Related tasks

T1.4, T6.1, T6.2

## Implementation note, added at T6.1/T6.2

"MSW" in this ADR's title describes the unit/integration layer precisely:
`msw/node` intercepts the server's outbound `fetch` to Gamma/CLOB in
`test/polymarket/msw-helpers.ts`, exercising the real parser, mapper and
cache code against real recorded fixture bytes.

At the E2E layer the mechanism is deliberately different, and is not the
`msw` package: `e2e/fixtures/mockApi.ts` uses Playwright's own
`page.route()` to intercept the browser's `fetch` calls to this
application's own `/api/polymarket/*` and `/api/ai/forecast` — the
documented contract in `04-architecture/API_CONTRACTS.md` — before they
leave the browser at all. The upstream-boundary integration (parsing,
mapping, the descending-asks normalization) is already proven at the
integration layer above; re-proving it at the E2E layer would test the same
thing twice while adding a live-network-shaped dependency (a running server
process actually reaching Gamma/CLOB, even if stubbed) to the one suite this
ADR requires to never have one. E2E's job is the widget's own user-facing
wiring, and mocking at its actual network boundary is the smallest thing
that proves that.

The mock response bodies are still built from the real recorded fixtures in
`test/fixtures/` (`e2e/fixtures/rawFixtures.ts` reads and JSON-decodes them
exactly as `src/polymarket/schemas.ts` does), so "fixtures recorded from
live responses" still holds at this layer — only the interception point
moved.
