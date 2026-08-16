---
name: epic-delivery
description: Package a completed epic for QA acceptance. Use when an epic's tasks are all DONE and it needs to be handed to the project owner - generates docs/12-delivery/DELIVERY-E<n>.md, gathers real test evidence, verifies the Definition of Done gate 1 checklist, warms and verifies the staging URL, and opens the pull request. Triggers on "deliver epic", "hand off E3", "package this epic for QA", "epic is done", "open the delivery PR".
---

# Epic delivery

Turn a finished epic into a professional handover the project owner can accept or reject in five minutes.

Governed by ADR-0017 and `docs/06-execution/DELIVERY_PROTOCOL.md`. Read the protocol if anything here is ambiguous; it wins.

**An epic is not delivered because its tests pass. It is delivered when the owner has approved the PR.**

## Procedure

### 1. Verify gate 1 before writing anything

Run the full local gate and capture the actual output. Do not proceed on a red result and do not write a delivery note describing work that does not build.

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build
```

Then check the epic's acceptance criteria in `docs/06-execution/EPICS.md` one at a time, against the running code. Not against memory of having implemented them.

### 2. Gather real evidence

Numbers, not adjectives. "Comprehensive test coverage" is not evidence. "142 unit tests, 100% branch coverage on src/simulation" is.

```bash
pnpm test -- --reporter=verbose 2>&1 | tail -30      # counts and timing
pnpm test -- --coverage                              # branch coverage, src/simulation
gh run list --limit 1                                # CI run link
```

If the epic touched the read path, also run `pnpm test:live` and say whether fixtures are still current.

### 3. Verify staging yourself, warmed

The Render free tier spins down after ~15 minutes idle. Sending the owner to a cold URL wastes a review cycle on the hosting tier.

```bash
pnpm warm
curl -s "$STAGING_URL/api/health" | jq
```

Then walk your own five-minute verification steps against staging, in order, as written. If a step does not work exactly as written, fix the step or fix the code. Do not ship instructions you have not followed.

### 4. Write the delivery note

Copy the template from `docs/06-execution/DELIVERY_PROTOCOL.md` §Delivery note template to `docs/12-delivery/DELIVERY-E<n>.md` and fill every section.

Rules that matter more than the format:

- **Known gaps must be honest.** An empty gaps list on a non-trivial epic is a claim, and it will be checked. If you cannot think of a gap, you have not looked.
- **Do not present a broken thing as a future enhancement.** If it does not work, write that it does not work.
- **Never write "tested manually".** Say what you did and what you saw.
- **Verification steps are numbered and state what the owner should see.** "Search for a market" is not a step. "Type `election`, expect 5+ results within 1s, each showing a percentage and a close date" is.
- **Nothing in the note may overstate what the system knows.** The claims policy in `docs/05-ai/EVALUATION.md` §B8 binds delivery notes exactly as it binds UI copy.

### 5. Open the PR

```bash
git push -u origin epic/e<n>-<slug>
gh pr create --title "E<n>: <epic name>" --body-file docs/12-delivery/DELIVERY-E<n>.md
```

The delivery note is the PR body. One artifact, not two that can drift.

### 6. Hand over and keep moving

Report to the owner: the PR link, the staging URL, and the single sentence describing what to look at first.

Then **start the next epic that has no dependency on this one**. Do not idle waiting for acceptance. Check `docs/06-execution/ROADMAP.md` §Parallelism for what is safe to start.

Reserve 20 percent of the epic's estimate for rework. When QA returns findings, spend that budget before starting anything new.

If acceptance has not arrived by the epic's checkpoint time in the roadmap, proceed on the assumption of acceptance and record it in `docs/CURRENT_STATE.md`:

```yaml
assumed_accepted: [E<n>]
assumed_at: T0+<h>h
```

## After acceptance

1. Merge the PR. Only after approval.
2. Confirm the automatic deploy from `main` succeeded and `/api/health` is green.
3. Update `CHANGELOG.md`: what changed, what was cut, hours against budget.
4. Update `docs/CURRENT_STATE.md`: `last_completed`, `active_epic`, `active_task`.
5. Regenerate `docs/ACTIVE_CONTEXT.md` for the next task.
6. Mark the delivery note `Status: ACCEPTED`.

## Do not

- Merge your own PR without approval, however obvious acceptance seems.
- Batch two epics into one delivery. The gate's value is granularity.
- Open a PR with red CI.
- Include a secret value, a key prefix, or a key length in the note, the PR body, or any log excerpt you paste.
