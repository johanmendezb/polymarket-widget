# DEFINITION OF DONE

## Per task

A task is DONE when all of the following are true. Not "mostly". All.

```
[ ] Every acceptance criterion in the task contract is demonstrably met
[ ] Tests listed under `tests_required` exist and pass
[ ] pnpm typecheck   zero errors
[ ] pnpm lint        zero errors, zero warnings
[ ] pnpm test        green
[ ] No new `any`, no new `@ts-expect-error`, no new eslint-disable without a comment saying why
[ ] No console.log left behind
[ ] No secret, key, or token in any file, fixture, snapshot or log
[ ] CURRENT_STATE.md updated (active_task, last_completed)
[ ] Nothing implemented beyond the task's requirements
```

A task is **not** done if it works but has no test, or if it has a test that asserts only that a component rendered.

## Per epic

An epic has **two gates**. Passing the first is the implementer's job. Passing the second is the owner's decision, and until it happens the epic is not delivered.

### Gate 1 - technical delivery (implementer)

Done to a professional standard, as if handing to a client. "It works on my machine" is not a delivery.

```
[ ] Every task in the epic is DONE
[ ] The epic's acceptance criteria in EPICS.md are met
[ ] Integration between this epic and its dependencies is tested, not assumed
[ ] Any ADR-worthy decision made during the epic has an ADR
[ ] Any new open question is recorded in 02-research/OPEN_QUESTIONS.md
[ ] Branch pushed, PR opened against main, title and description complete
[ ] CI fully green: typecheck, lint, unit, integration, e2e, build, secret-leak
[ ] Deployed and verified on the staging URL, warmed first (Render cold start)
[ ] docs/12-delivery/DELIVERY-E<n>.md written from the template
[ ] The 5-minute verification steps in the delivery note were followed by the
    implementer, against staging, and work exactly as written
[ ] Test evidence in the delivery note contains real numbers, not adjectives
[ ] Known gaps listed honestly. An empty list on a non-trivial epic will be checked.
[ ] CHANGELOG.md updated with what changed and what was cut
```

### Gate 2 - QA acceptance (project owner)

```
[ ] Owner has run the 5-minute verification against staging
[ ] Owner has ticked the QA checklist in the delivery note
[ ] Owner has APPROVED the pull request
```

**The PR approval is the acceptance.** Merging without it is a protocol violation, not a shortcut. Branch protection on `main` enforces this rather than relying on discipline.

Full process, rework budget and the deadline timeout rule: `06-execution/DELIVERY_PROTOCOL.md`. Rationale: ADR-0017.

### While awaiting acceptance

Work does not stop. The implementer moves to the next epic with no dependency on the unaccepted one. 20 percent of each epic's estimate is reserved for rework and is spent before starting anything new when QA returns findings.

## Review criteria

The reviewer may reject. These are the grounds:

| Category | Rejection grounds |
|---|---|
| Correctness | The arithmetic is wrong, or an edge case throws where the spec says it should return a value |
| Domain | Fee hardcoded. Asks not normalized. Token id parsed as a number. Midpoint used to price a fill. |
| Honesty | Simulated action described ambiguously. A metric shown without its sample size. A claim from the forbidden list. |
| Architecture | Import boundary violated. I/O inside `domain` or `simulation`. A secret reachable from the client. |
| Tests | Business logic with no test. A test that would pass against a broken implementation. |
| Scope | Work outside the task contract, however good |
| Maintainability | A function long enough that its edge cases cannot be enumerated |

## Final gate

Before declaring the project delivered. Every line is ticked or explicitly waived in writing in `CHANGELOG.md` with a reason.

### Product
```
[ ] Golden path works end to end on the deployed URL
[ ] Loading states present on every async surface
[ ] Empty states present and helpful, never a bare "no results"
[ ] Error states present, classified, and recoverable where recovery is possible
[ ] Works at 380px and at full width
[ ] Keyboard completable
```

### Polymarket domain
```
[ ] Every API claim in 02-research/POLYMARKET_RESEARCH.md re-verified within the last 7 days
[ ] Order book asks normalized to ascending, with a test proving it
[ ] Fill priced by walking the book, never by midpoint
[ ] Taker fee computed from the per-market rate with the correct formula
[ ] Fee source labelled when it is a category fallback
[ ] negRisk markets identified and labelled
[ ] Resolution criteria surfaced in the primary flow
[ ] Resolution risk disclosed qualitatively, not modelled as zero
[ ] Wide-spread markets show last trade price with the reason stated
[ ] Simulation visibly and unambiguously separated from live trading
```

### AI
```
[ ] Output schema enforced, violations handled
[ ] Blind elicitation proven price-free by test
[ ] Evidence displayed with sources and dates; undated sources labelled
[ ] Uncertainty represented as dispersion, not as model self-report
[ ] Gate fires and names its reasons, each traceable to a citation
[ ] Every AI failure mode handled without breaking the widget
[ ] Provenance shown: timestamp, model, prompt version, k, blend weight
[ ] Claims policy present, linked from README, and not violated anywhere in the UI
[ ] No fabricated source, statistic, or backtest anywhere
```

### Engineering
```
[ ] typecheck, lint, test, build all green in CI
[ ] Unit tests on all simulation arithmetic, 100% branch coverage there
[ ] Integration tests on all four read routes including failure paths
[ ] E2E golden path green and deterministic
[ ] E2E failure paths green
[ ] Production build succeeds
[ ] Secret-leak check passes against the production bundle
```

### Infrastructure
```
[ ] Deployed and publicly reachable
[ ] /api/health returns ok and reports upstream status
[ ] Environment variables documented in 08-operations/ENVIRONMENT.md
[ ] No secret in the repository, in CI logs, or in the client bundle
```

### Delivery and QA
```
[ ] Every epic has a DELIVERY-E<n>.md in docs/12-delivery/
[ ] Every epic has an ACCEPTED verdict recorded, or an explicit written waiver
[ ] Any epic that proceeded under the timeout rule is named in CURRENT_STATE.md
[ ] No PR was merged to main without approval
```

### Prompts
```
[ ] Every runtime prompt exists as a file in prompts/runtime/ and is loaded from
    there by the application, not duplicated as a string literal
[ ] A test asserts the loaded prompt text matches the file
[ ] Every build and orchestration prompt is captured verbatim in prompts/build/
[ ] prompts/README.md indexes all of them with versions and provenance
[ ] promptVersion is recorded on every forecast and matches a file that exists
```

### Documentation
```
[ ] README addresses both a product reviewer and a technical reviewer
[ ] ADR index complete and every ADR has a status
[ ] Research documents present with sources and date-checked labels
[ ] Roadmap and backlog reflect what actually happened, including cuts
[ ] Test strategy documented
[ ] Known limitations documented honestly
[ ] Future roadmap documented
[ ] Deployment and local-run instructions verified from a clean clone
```

### Demo
```
[ ] Five-minute demo rehearsed twice against the deployed URL
[ ] Two specific markets identified: one passing the gate, one rejected
[ ] Fallback markets identified in case either resolves or goes illiquid
[ ] No manual step in the demo that was not rehearsed
[ ] The "AI is down" resilience moment rehearsed
```
