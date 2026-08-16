# CLAUDE.md

Instructions for Claude Code working in this repository.

## Read this first, then stop reading

```
docs/PROJECT_INDEX.md      what this project is           (90 seconds)
docs/CURRENT_STATE.md      where it is right now
docs/ACTIVE_CONTEXT.md     what you are doing next
```

Then read **only** the task contract for the active task in `docs/06-execution/BACKLOG.md`, plus whatever that contract points you at.

**Do not read the whole `docs/` tree.** It is written to be loaded selectively. Loading all of it wastes context you will need for the code.

## What you are doing

Executing task contracts in order from `docs/06-execution/BACKLOG.md`. The research, product, architecture and testing decisions are already made and written down. Your job is implementation, not design.

If you believe a decision is wrong, say so and stop. Do not implement around it.

## Rules that are not negotiable

1. **Do not implement beyond the task contract.** If something seems missing, add a task rather than expanding the current one.
2. **Tests first for `src/domain` and `src/simulation`.** These are pure functions with hand-computable outputs. Write the failing test, watch it fail, then implement.
3. **Never hardcode a fee rate.** Read it per market from the API. See ADR-0009. This is the highest-likelihood correctness bug in the project.
4. **Order book asks arrive sorted DESCENDING.** `mapOrderBook` must reverse them so `asks[0]` is the best ask. Getting this wrong prices every buy at 99 cents instead of 45. See `docs/03-domain/POLYMARKET_DOMAIN_MODEL.md` §2.
5. **Token ids are strings, always.** They exceed `Number.MAX_SAFE_INTEGER`.
6. **The market price must never reach the blind AI prompt.** The input type has no price field. Keep it that way.
7. **The Anthropic key is server-side only.** Never `NEXT_PUBLIC_`. CI greps the bundle and fails on a match.
8. **Never write code that places a real order.** There is no signing code in this repository and there will not be.
9. **Never claim the system beats the market.** The claims policy is in `docs/05-ai/EVALUATION.md` §B8 and it is binding on UI copy, README text and commit messages.
10. **Update `docs/CURRENT_STATE.md`** when a task passes.
11. **Never ask for, receive, or print a secret value.** The owner enters credentials in the GitHub and Render dashboards. You handle names only. See `docs/08-operations/SECRETS.md`.
12. **An epic is not done when its tests pass.** It is done when the owner has QA'd it and approved the PR. Use the `epic-delivery` skill. See `docs/06-execution/DELIVERY_PROTOCOL.md`.
13. **Runtime prompts live in `prompts/runtime/` and are loaded from there.** Never duplicate prompt text as a string literal. Changing a prompt means a new versioned file, not an edit.

## Skills

Two repo-local skills in `.claude/skills/`. Use them; they exist so these things are consistent across nine epics.

| Skill | When |
|---|---|
| `epic-delivery` | An epic's tasks are all DONE and it needs handing to the owner for QA |
| `polymarket-domain` | Writing or reviewing anything that touches order books, prices, fills, fees, token ids or market metadata |

## Environment

**One environment: Render staging**, auto-deployed from `main`. There is no production.

The free tier **sleeps after ~15 minutes idle** and the next request takes tens of seconds. This is documented, not a defect. Run `pnpm warm` before sending anyone to the URL. Do not add a keep-alive pinger.

## Commands

```bash
pnpm dev              # dev server, widget at /widget
pnpm typecheck        # must be clean
pnpm lint             # must be clean, zero warnings
pnpm test             # unit + integration
pnpm test:e2e         # Playwright, fixture-backed
pnpm test:live        # live Polymarket contract suite, NOT in CI
pnpm record-fixtures  # re-record test/fixtures from live responses
```

Before declaring any task done: `pnpm typecheck && pnpm lint && pnpm test` all green.

## Import boundaries

Enforced by ESLint. A violation fails CI.

| Module | May import |
|---|---|
| `src/domain` | nothing internal |
| `src/polymarket` | `domain` |
| `src/simulation` | `domain` |
| `src/ai` | `domain`, `simulation` |
| `src/ui` | `domain`, `simulation`, `lib` |
| `src/app/api` | everything |

`src/domain` and `src/simulation` must stay pure: no React, no Next, no I/O, no `any`.

## Code style

- TypeScript strict. Branded primitives for `Probability`, `Price`, `Shares`, `Usdc`; they exist to stop you multiplying a probability by a price.
- zod at every upstream boundary. Nowhere else.
- No `dangerouslySetInnerHTML`. Model output is text.
- Container queries only in widget CSS. Media queries key off the host page and produce wrong layouts.
- No `localStorage`, `sessionStorage` or cookies. A sandboxed iframe has none of them.
- Errors are a closed union of codes, not strings.

## Where things live

```
src/
  app/api/          route handlers (the only place with I/O to the outside world)
  domain/           pure types, branded primitives, guards
  polymarket/       zod schemas, upstream client, mappers, cache
  simulation/       book walk, fees, edge, Kelly, gate
  ai/               prompt assembly, tool schema, sampling, blending
  ui/               components and hooks
docs/               the knowledge layer; read selectively
docs/12-delivery/   one DELIVERY-E<n>.md per epic, written at handover
prompts/runtime/    the prompt files the app loads. Not string literals.
prompts/build/      the prompts that produced this repo, verbatim
.claude/skills/     epic-delivery, polymarket-domain
test/fixtures/      real recorded upstream responses, dated
```

## When you are blocked

Stop after 15 minutes. Record the blocker in `docs/CURRENT_STATE.md` under `blocked_by` and report it. Do not improvise around a missing decision.

## When something in the docs is wrong

The docs were written before any code existed and some of it will turn out to be wrong. That is expected. Fix the document in the same commit as the code, and if it was a decision of consequence, write or supersede an ADR. Do not leave the code and the docs disagreeing.
