# ROADMAP - 48 HOURS

**T0 = 2026-08-15.** All times are hours from T0.

The 48 hours are wall clock. Realistic effective working time is about 30 hours. The plan below budgets 28 hours of work and holds 2 hours of unallocated slack, because a plan with no slack is a plan that fails on its first surprise.

---

## Macro plan

| Window | Block | Hours | Output |
|---|---|---|---|
| H0 – H2 | **Research** | 2 | ✅ DONE. Knowledge layer complete. |
| H2 – H5 | **E1 Foundation** | 3 | Repo, CI, deploy pipeline, live-API contract spike |
| H5 – H11 | **E2 Domain + simulation** | 6 | Book walk, fees, edge, gate arithmetic. TDD. All pure. |
| H11 – H14 | **E3 Read path** | 3 | Proxy routes, zod schemas, mappers, caching, fixtures |
| H14 – H22 | **Sleep / buffer** | – | Non-negotiable. Tired decisions are the expensive kind. |
| H22 – H29 | **E4 Widget UI** | 7 | States A through D, all loading/empty/error states |
| H29 – H34 | **E5 AI layer** | 5 | Blind elicitation, sampling, blend, gate, AI panel |
| H34 – H37 | **E6 Integration + E2E** | 3 | Playwright golden path, failure-path tests |
| H37 – H40 | **E7 Polish + deploy** | 3 | Container queries, theming, a11y pass, Render staging verified |
| H40 – H43 | **Sleep / buffer** | – | |
| H43 – H46 | **E8 Credibility layer** | 3 | Manifest CLI, resolution-free diagnostics. First to be cut. |
| H46 – H48 | **E9 Demo + docs** | 2 | README, demo rehearsal, CHANGELOG, final gate |

Total budgeted work: **28h**. Slack: **2h**.

---

## The delivery overhead, and where it is paid from

Every epic now passes a human QA acceptance gate (ADR-0017). That is not free and the budget above does not absorb it silently.

| Item | Cost |
|---|---|
| 9 delivery notes, ~15 min each | **2.25h** |
| Rework reserve, 20% of each epic estimate | **up to 5.6h** |

Where it comes from:

- **The delivery notes come out of the epic estimates.** Each epic's budget now includes writing its handover. The `epic-delivery` skill exists specifically to make this 15 minutes rather than 40, and much of a delivery note is material the submission needs anyway.
- **The rework reserve is not additional time. It is the first claim on the 2h slack, and after that on the cut order.** If QA returns findings worth more than 2 hours, we cut. That is what the cut order is for and it is why it is written down in advance.
- **Waiting is not budgeted, because we do not wait.** Work continues on a non-dependent epic while acceptance is pending.

Realistic revised shape: **26h of feature work, 2.25h of delivery, 1.75h of slack, and the cut order paying for anything beyond that.**

## QA acceptance flow

```
epic tasks DONE
   -> technical delivery: PR + green CI + staging verified + DELIVERY-E<n>.md
   -> owner QA: verify in 5 min, tick the checklist, APPROVE the PR
   -> merge -> main auto-deploys to Render staging
```

**Work does not stop at the gate.** The dependency graph is not a chain, which is what makes an asynchronous gate viable here:

| While awaiting acceptance of | Start |
|---|---|
| E2 | E3 (different directories, both depend only on domain types) |
| E3 | E4 shell (builds against fixtures) |
| E4 | E5 (independent data path) |
| E5 | E6 test scaffolding |
| E7 | E9 documentation |

If acceptance has not arrived by the epic's checkpoint below, proceed on the assumption of acceptance and record it in `CURRENT_STATE.md`. A 48-hour deadline does not pause for a review cycle. The cost of that concession is documented in `DELIVERY_PROTOCOL.md`.

---

## Checkpoints

Hard decision points. At each one, compare actual against plan and apply the cut order if behind.

| Checkpoint | Must be true | If not |
|---|---|---|
| **H5** | CI green, deployed skeleton reachable, live API contract tests passing | Stop. Fix the foundation. Everything downstream depends on it and a broken deploy at H40 is fatal. |
| **H11** | `walkBook`, `computeFee`, `computeEdge` fully unit tested and correct | Cut E8 now, not later. The simulation layer is never cut. |
| **H14** | Read path serving real data through the proxy | Cut E8 and FR-4.8/4.9. |
| **H29** | Golden path clickable end to end with mock AI | Cut E5 to a single unsampled call (k=1, no anchored diagnostic). |
| **H34** | AI panel working against the live model | Cut E8 entirely and simplify the gate to 3 rules. |
| **H37** | E2E golden path green | Stop feature work. Ship what is green. |
| **H40** | **Deployed and demoable.** | This is the point of no return. If the staging URL does not work here, everything after this is spent making it work. Warm it first: a cold Render instance takes tens of seconds and that is not a failure. |

---

## The cut order

Reproduced from `01-product/MVP_SCOPE.md`. Apply in sequence, do not improvise.

```
1. E8 credibility layer (manifest + diagnostics)
2. FR-4.9 Kelly sizing panel
3. FR-4.8 cost waterfall view
4. FR-3.8 blind-vs-anchored display (still computed)
5. FR-1.5 AI market ranking
6. FR-2.5 sparkline
7. FR-1.3 category chips
8. Gate simplified from 11 rules to 3
```

**Never cut:** the golden path, the correct fee, the book walk, the simulated-not-real labelling, error and empty states on the golden path, the E2E test, the claims policy.

---

## Parallelism

Where two things can genuinely run at once without touching the same files:

| Can run in parallel | Why it is safe |
|---|---|
| E2 (`src/simulation`) and E3 (`src/polymarket`) | Different directories; both depend only on `src/domain` types which land first |
| E4 UI shell and E5 AI route | The UI consumes a typed `Recommendation`; build against a fixture first |
| Test writing and implementation | TDD means the tests are written first anyway |
| Docs and polish | Different files entirely |

Where parallelism is a trap: anything touching `src/domain`, and anything touching the shared UI layout. Serialize those.

---

## Sequencing rationale

**Why the simulation layer comes before the UI.** It is the component a reviewer can check arithmetically, it has no dependencies, and it is the one thing that is never cut. Building it first means that even a badly overrunning project has a correct, tested core.

**Why the AI layer comes after the UI.** The UI can be built against a fixture `Recommendation` in minutes. The AI layer cannot be built against a fixture UI. Also, the AI is the component most likely to eat unbounded time, so it goes where its overrun does the least damage.

**Why deployment happens at H5, not H40.** A deployment problem discovered at H40 is a project-ending problem. Discovered at H5 it is an inconvenience. Deploy an empty skeleton on day one and keep it green. With one environment and auto-deploy from `main`, the staging URL is also the QA surface for every epic, so it has to work from the start.

**Why the QA gate is asynchronous.** A synchronous gate makes wall-clock time a function of the reviewer's availability, which the plan cannot control. One overnight wait would end the project. The dependency graph almost always leaves non-dependent work available, so the gate costs rework rather than idle time.

**Why the credibility layer is last and first to be cut.** It is the highest-value differentiator per unit of reviewer attention, and the lowest-value per unit of risk. It only makes sense on top of a product that works.
