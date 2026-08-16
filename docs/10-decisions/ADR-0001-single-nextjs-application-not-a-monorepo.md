# ADR-0001 - Single Next.js application, not a monorepo

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The stated stack preference includes a monorepo. The project needs clear domain boundaries, testability, room for a future live execution provider, AI isolation and a deployment target, all inside 48 hours.

## Problem

Does a monorepo earn its setup cost here, or do directory boundaries plus a lint rule achieve the same architectural goals for a fraction of the time?

## Options considered

1. **pnpm workspace monorepo** with `packages/domain`, `packages/simulation`, `packages/polymarket`, `packages/ui` and `apps/web`.
2. **Single Next.js app** with `src/domain`, `src/simulation`, `src/polymarket`, `src/ai`, `src/ui` and an enforced ESLint import-boundary rule.
3. Single app with no enforced boundaries at all.

## Evidence

A monorepo is justified by multiple deployables, multiple consumers of shared packages, or independent release cycles. This project has none of the three. Its concrete cost is workspace configuration, build orchestration, TypeScript project references and the debugging that comes with them, estimated at roughly two hours. Its concrete benefit over option 2 is boundary enforcement, which `import/no-restricted-paths` already provides.

## Decision

**Option 2.** One Next.js app. Boundaries are directories, enforced by ESLint, with a deliberate violation failing CI.

## Consequences

Positive: two hours returned to feature work; one build, one deploy, one dependency tree; a reviewer can read the whole repository quickly.
Negative: a reviewer expecting a monorepo may read this as unsophisticated, so the reasoning is surfaced in `09-demo/TRADEOFFS.md`; nothing physically prevents someone from bypassing the lint rule with a disable comment.

## Reversibility

**High.** `domain`, `simulation` and `polymarket` import nothing upward by construction, so extracting them into workspace packages later is a mechanical move plus a `package.json` each.

## Related tasks

T1.1
