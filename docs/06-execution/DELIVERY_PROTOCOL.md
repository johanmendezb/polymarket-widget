# DELIVERY PROTOCOL

How an epic gets from "the code works" to "accepted". Governed by ADR-0017.

**Nothing is delivered until the project owner has QA'd it and approved the PR.** "Tests pass" is a precondition, not a delivery.

---

## The flow

```
epic tasks DONE
      |
      v
[1] TECHNICAL DELIVERY          the implementer's job, done to a professional standard
      branch  ->  PR against main
      CI green: typecheck, lint, unit, integration, e2e, build, secret-leak
      staging deploy verified from the PR (see note on cold start)
      docs/12-delivery/DELIVERY-E<n>.md written
      |
      v
[2] QA ACCEPTANCE               the owner's job
      verifies against the delivery note in under 5 minutes
      ticks the QA checklist
      approves the PR   ->  ACCEPTED
      or requests changes  ->  REWORK
      |
      v
[3] MERGE                       only after approval
      main deploys automatically to staging
      CHANGELOG.md updated
      CURRENT_STATE.md updated
```

**Work does not stop at step 2.** The implementer immediately starts the next epic that has no dependency on the unaccepted one. See ADR-0017 for why, and `06-execution/ROADMAP.md` for which epics are independent.

---

## Rework budget

**20 percent of each epic's estimate is reserved for QA rework**, and it is spent before any new work is started. If QA returns nothing, the budget returns to slack.

| Epic | Estimate | Rework reserve |
|---|---|---|
| E1 | 3h | 36m |
| E2 | 6h | 72m |
| E3 | 3h | 36m |
| E4 | 7h | 84m |
| E5 | 5h | 60m |
| E6 | 3h | 36m |
| E7 | 3h | 36m |
| E8 | 3h | 36m |
| E9 | 2h | 24m |

---

## The timeout rule

If acceptance has not arrived by the epic's checkpoint time in `ROADMAP.md`, the implementer **proceeds on the assumption of acceptance** and records it in `CURRENT_STATE.md`:

```yaml
assumed_accepted: [E3]
assumed_at: T0+14h
```

A 48-hour deadline does not pause for a review cycle. This is a deliberate concession to the constraint and it has a cost: an epic built on top of an unaccepted one makes any subsequent rework more expensive. Recorded here so the cost is visible rather than discovered.

---

## Delivery note template

Copy to `docs/12-delivery/DELIVERY-E<n>.md`. The `epic-delivery` skill generates it.

```markdown
# DELIVERY - E<n> <epic name>

**PR:** #<n>
**Branch:** epic/e<n>-<slug>
**Staging:** <url>
**Submitted:** T0 + <h>h
**Status:** AWAITING QA | ACCEPTED | REWORK REQUESTED

---

## What was delivered

One paragraph in plain language, written for someone who has not read the code.

| Requirement | Status | Where |
|---|---|---|
| FR-x.y | done | `src/...` |

## What was deliberately not delivered

Scope excluded, and why. Cut-order items taken, if any.

## How to verify in 5 minutes

Numbered steps against the staging URL. Each step states what you should see.
If the service has been idle, step 1 is always: open the URL and wait for the
cold start (see the note at the bottom).

1. ...
2. ...

## Test evidence

Actual numbers, not adjectives.

| Suite | Count | Result | Time |
|---|---|---|---|
| Unit | | pass | |
| Integration | | pass | |
| E2E | | pass | |
| Coverage, src/simulation | | % branch | |

CI run: <link>
Secret-leak check: pass

## Decisions taken during this epic

ADRs written or superseded. Judgment calls that were not ADR-worthy but that
you would want to know about.

## Known gaps and risks introduced

Honest list. An empty list here on a non-trivial epic is a claim, and it will
be checked.

## Open questions for you

Anything where a decision would change the next epic.

---

## QA CHECKLIST

Tick each or reject with a note.

- [ ] The stated scope is actually present
- [ ] The 5-minute verification steps work as written
- [ ] Nothing claimed as done is missing
- [ ] Error and empty states behave as described
- [ ] Nothing in the UI overstates what the system knows
- [ ] The known-gaps list is honest
- [ ] I accept this epic

**Verdict:** ACCEPTED / REWORK
**Notes:**

---

> **Staging cold start.** The Render free tier spins the service down after
> ~15 minutes of inactivity. The first request after idle takes tens of seconds.
> This is expected, documented in ADR-0015, and is not a defect. `/api/health`
> reports `uptimeSeconds`; a low value means the instance just woke.
```

---

## Rules for the implementer

1. **Do not open a PR with red CI.** A delivery that does not build is not a delivery.
2. **Do not write "tested manually".** Give the numbers.
3. **Do not present a known gap as a future enhancement.** If it does not work, say it does not work.
4. **Do not merge your own PR without approval**, even when acceptance seems obvious.
5. **Do not batch two epics into one delivery.** The point of the gate is granularity.
6. **Verify the staging URL yourself before submitting**, warming it first. Sending the owner to a cold URL that times out wastes a review cycle on the hosting tier.

## Rules for QA

1. Verify against the delivery note, not against your memory of the plan.
2. If a verification step does not work as written, that alone is a rework, even if the feature works another way.
3. Reject on honesty before rejecting on polish. An overstated claim is more expensive than a rough edge.
4. Rework requests name the acceptance criterion that was missed, so the fix is bounded.
