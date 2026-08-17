# Build prompt 04 - Implementation orchestration

**Sent:** 2026-08-16 to 2026-08-17
**Model:** claude-fable-5 orchestrating, workers on claude-sonnet-5 (initially claude-opus-5)
**Produced:** every line of application code in this repository

Prompts `00` through `03` produced the planning phase — the docs, the ADRs, the backlog. This
file records the prompts that produced the **implementation**, so the record runs from the first
research question to the deployed widget without a gap.

ADR-0018 makes prompts first-class deliverables. That has to include the ones that wrote the code,
or the record stops exactly where the interesting part begins.

---

## How the work was dispatched

Implementation ran as **Orca worktrees with one Claude worker per task**, coordinated from a
single orchestrator session. Each worker got its own git worktree, its own terminal, and a
dispatch prompt. The orchestrator never wrote application code beyond small cross-cutting fixes;
it decomposed, dispatched, verified, and merged.

The central constraint was context. `AGENT_PROTOCOL.md` §3 says loading the minimum is the single
largest lever on how far the budget goes, so **no dispatch prompt ever pasted a task contract into
itself**. Each prompt told the worker which contract to read from `docs/06-execution/BACKLOG.md`
and which two or three documents that contract pointed at, and stopped there.

Every dispatch is therefore two parts:

1. **`implementation/00-dispatch-template.md`** — the standing rules, identical for every task.
2. **A task-specific block** — the scope, the traps, the acceptance criteria for that one task.

Both are reproduced verbatim in `implementation/`.

## The dispatch prompts

| File | Dispatched | Produced |
|---|---|---|
| `00-dispatch-template.md` | every task | the standing rules |
| `T1.1-scaffold.md` | E1 | Next.js scaffold, module barrels, import-boundary rule, `/api/health` |
| `T1.2-ci-pipeline.md` | E1 | GitHub Actions gate and the secret-leak scan |
| `T1.4-contract-spike.md` | E1 | live fixtures, `pnpm test:live`, four corrections to the docs |
| `T2.1-domain-types.md` | E2 | opaque branded primitives, domain types |
| `E2-task-block.md` | E2 | book walk, fees, edge, Kelly, the abstention gate |
| `E3-task-block.md` | E3 | zod schemas, mappers, cache, four read routes |
| `T4.1-task-block.md` | E4 | container-queried shell and theming |
| `E4rest-task-block.md` | E4 | states A, C, B, D |
| `T5.1-task-block.md` | E5 | prompt assembly with structural blindness |
| `T5.2-task-block.md` | E5 | Anthropic client, k-sampling, median-of-log-odds |
| `T5.3-task-block.md` | E5 | blend, gate wiring, forecast route |
| `T5.4-task-block.md` | E5 | the AI panel |
| `E6-task-block.md` | E6 | golden path, six failure paths, Playwright in CI |
| `T7.1-task-block.md` | E7 | accessibility and copy pass |
| `E8cli-task-block.md` | E8 | `pnpm freeze`, `pnpm resolve` |
| `T8.2-task-block.md` | E8 | resolution-free diagnostics |
| `E9docs-task-block.md` | E9 | prompt deliverable, README |

## Where the prompts were wrong, and the work said so

The same pattern that makes `00` worth reading applies here: the interesting part is not what the
prompt asked for, it is where the work pushed back. Every case below was a worker refusing to
encode something the orchestrator had asserted.

| The orchestrator briefed | What happened |
|---|---|
| "A request with no `User-Agent` gets 403 from CLOB" | Did not reproduce across five clients. Three attempts to pin down. The real rule is that `Python-urllib/<version>` specifically is blocked and no UA at all is fine. The orchestrator had varied the header's *presence* and never its *value*. |
| "Both hosts send no CORS headers" | Wrong in the other direction. Both send `Access-Control-Allow-Origin: *` — but only when an `Origin` header is present, which the orchestrator's probe had omitted. |
| "Grep `.next/static` for `ANTHROPIC` to catch a leak" | Cannot work. Next inlines `NEXT_PUBLIC_*` as its *value*, so the name never reaches the bundle, and in CI with no key set it inlines as `undefined`. The check was widened to scan source and build environment too. |
| "Both book sides arrive descending" (from the domain model) | Asks descending, **bids ascending**. Corrected before any mapper was written. |
| The T1.1 contract's `files_expected` listed `tailwind.config.ts` | Tailwind v4 is CSS-first and has no such file. Contract corrected in the same commit as the code. |

Two of those five were the orchestrator's own errors, produced by generalising from a single
observation. They were caught because the dispatch template told workers that refusing a task with
insufficient context is correct behaviour, and that a finding contradicting the orchestrator is the
most valuable thing they can return.

## What the prompts got right by being specific

Three instructions in the template earned their place repeatedly:

- **"Install every dependency the project will ever need, now."** Given to T1.1 so that four
  workers building `simulation`, `polymarket`, `ui` and `ai` in parallel never collided on
  `package.json` — otherwise the one file all four would have touched.
- **"Do not edit `docs/CURRENT_STATE.md`."** Added after four branches editing one state file
  produced a merge conflict on every single epic merge. The orchestrator owns project state.
- **"A brand written as `number & { __brand }` does not do its job."** Naming the *failure mode*
  rather than the requirement produced genuinely opaque primitives where `probability * price` is
  a compile error, with thirteen `@ts-expect-error` assertions proving it.

## What is deliberately not here

The orchestrator's own conversation is not reproduced. It is a session transcript, not a prompt,
and `AGENT_PROTOCOL.md` §5 is explicit that the orchestrator consumes summaries rather than
transcripts. What is reproduced is what was actually *sent* to the agents that wrote the code.

`00-master-orchestrator.md` still carries its placeholder. Only the project owner holds that text,
and the file explains why a re-typed copy would be the wrong artifact for a deliverable whose whole
point is that the prompt and the artifact are the same bytes. That has not changed.
