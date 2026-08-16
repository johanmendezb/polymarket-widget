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
