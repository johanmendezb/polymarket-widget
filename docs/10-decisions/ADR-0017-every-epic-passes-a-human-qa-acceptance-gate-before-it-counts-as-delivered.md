# ADR-0017 - Every epic passes a human QA acceptance gate before it counts as delivered

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The original Definition of Done ended at "the reviewer agent approves and it merges". The project owner has asked to be the acceptance authority: **no epic is delivered until he has QA'd and accepted it**, and the handover must be a professional technical delivery rather than a message saying it is done.

## Problem

How do we insert a human gate into a 48-hour plan without the gate becoming the critical path? Nine epics with a synchronous wait after each one could add many hours of dead time to a budget that has two.

## Options considered

1. **Synchronous gate.** Deliver an epic, stop, wait for acceptance, start the next.
2. **Asynchronous gate with a rework budget.** Deliver an epic, immediately start the next epic that does not depend on it, treat QA feedback as an interrupt with a reserved budget.
3. **Gate at the end only.** One acceptance at delivery.

## Evidence

Option 1 makes wall-clock time a function of the reviewer's availability, which is not something the plan can control. On a 48-hour budget with two hours of slack, one four-hour overnight wait ends the project.

Option 3 discards the entire benefit. The reason to accept per epic is to catch a wrong direction at hour 11 rather than hour 40, and a single gate at the end catches nothing in time to act on it.

Option 2 works here specifically because the dependency graph is not a chain. E2 and E3 are independent of each other. E4 can be built against a fixture `Recommendation` while E5 is unbuilt. E8 depends only on E5. There is almost always non-dependent work available.

## Decision

**Option 2.**

- Each epic is delivered as a **GitHub PR against `main`**, CI green, deployed to the staging URL, accompanied by `docs/12-delivery/DELIVERY-E<n>.md`.
- The delivery note contains: scope delivered, scope deliberately excluded, how to verify it in under five minutes, test evidence with actual numbers, known gaps, risks introduced, decisions taken, and a **QA checklist the owner ticks**.
- **Acceptance is the PR approval.** Merging without approval is a protocol violation, not a shortcut.
- Work does **not** stop while awaiting acceptance. The implementer moves to the next epic with no dependency on the unaccepted one.
- **A rework budget of 20 percent of each epic's estimate is reserved** and is spent before starting anything new when QA returns findings.
- If acceptance has not arrived by the epic's checkpoint in `ROADMAP.md`, the implementer proceeds on the assumption of acceptance and records the assumption in `CURRENT_STATE.md`. A 48-hour deadline does not pause.

Because there is one environment and `main` deploys automatically, an unaccepted epic never reaches the staging URL. The PR is the buffer that a production environment would otherwise be.

## Consequences

Positive: a wrong direction surfaces one epic late instead of at delivery; each epic produces a durable artifact that becomes submission material; the PR is a natural review surface; the owner sees the work as a professional handover rather than a status message.

Negative: nine delivery notes cost roughly 15 minutes each, about 2.25 hours total, which is why a skill generates them (see `.claude/skills/epic-delivery/`); the rework budget is reserved whether or not it is used; the proceed-on-timeout rule means an epic can be built on top of an unaccepted one, and any rework then costs more, so the rule is a deadline concession and is documented as one.

## Reversibility

**High.** It is a process, not a structure. Dropping it changes nothing in the code.

## Related tasks

Every epic. See `06-execution/DELIVERY_PROTOCOL.md`.
