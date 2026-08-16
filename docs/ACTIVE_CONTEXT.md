# ACTIVE_CONTEXT

> Disposable. Regenerate this file whenever the active task changes.
> This file exists to keep agent context windows small. Do not append history to it.

**Generated:** T0 + 2h
**Active epic:** E1 - Foundation & live-API contract
**Active task:** T1.1 - Scaffold Next.js app with typecheck, lint, test and CI

---

## Current objective

Get a repository that builds, typechecks, lints and runs tests in one command, deployable to Render, before any feature work begins. Then prove the live Polymarket read path with contract tests.

## Constraints that apply right now

- Node 22, pnpm. TypeScript strict mode, no `any` in `src/domain` or `src/simulation`.
- No Polymarket authentication is needed for anything in this project (VERIFIED, `03-domain/POLYMARKET_DOMAIN_MODEL.md` §2).
- The Anthropic key is server-side only. If it can appear in a client bundle, the task fails review.
- Every module under `src/domain` and `src/simulation` must be pure and framework-free so it is trivially unit-testable.

## Relevant architecture

```
src/
  app/
    api/polymarket/[...path]/route.ts   proxy + cache + normalize
    api/ai/forecast/route.ts            Anthropic call, server-only
    widget/page.tsx                     the embeddable surface
  domain/        pure types + guards, no I/O            <- TDD here
  polymarket/    typed client + zod schemas + mappers
  simulation/    order-book walk, fees, edge, Kelly     <- TDD here
  ai/            prompt assembly, schema, gate
  ui/            components
```

Import rule enforced by ESLint: `domain` imports nothing. `simulation` imports only `domain`. `polymarket` imports only `domain`. `ai` imports `domain` and `simulation`. `ui` imports anything except `app/api`.

## Linked requirements

- PRD FR-0 (widget must build and deploy as a standalone embeddable page)
- `08-operations/ENVIRONMENT.md` for the required env vars

## Relevant ADRs

- ADR-0001 single app, not a monorepo
- ADR-0002 server-side proxy for all Polymarket reads
- ADR-0011 Vitest + MSW + Playwright
- ADR-0015 Render, one staging environment, documented cold start
- ADR-0016 secrets are entered by a human, never handled by an agent
- ADR-0017 per-epic QA acceptance gate

## Acceptance criteria for T1.1

1. `pnpm install && pnpm build` succeeds from a clean clone.
2. `pnpm typecheck`, `pnpm lint`, `pnpm test` all exist and pass with zero warnings.
3. ESLint enforces the import-boundary rule above and a deliberate violation fails the lint run.
4. A GitHub Actions workflow runs typecheck, lint, test and build on push.
5. `/api/health` returns `{ "status": "ok", "commit": "<sha>" }`.
6. `README.md` documents how to run it in under five lines.

## Tests required

- One trivial unit test proving Vitest is wired.
- One test asserting the ESLint boundary rule rejects `import ... from '@/polymarket'` inside `src/domain`.

## Blockers

None.

## Delivery for this task

T1.1 is a task, not an epic, so it does not get its own delivery note. E1 as a whole does, once T1.1 to T1.4 are all DONE. Use the `epic-delivery` skill then.

Two things in T1.3 need the project owner, not you: entering `ANTHROPIC_API_KEY` in the Render dashboard, and enabling branch protection on `main`. Ask for those to be done. Never ask for the key value.

## Do not do yet

Do not build UI. Do not call the Anthropic API. Do not write the order-book walk. Those are T2.x and T3.x.
