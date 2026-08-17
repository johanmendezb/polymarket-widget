# CHANGELOG

Format: what changed, why, what it cost, and what was removed to pay for it.

---

## [T0 + 3h] - Owner feedback round 1

### Changed

- **Deployment target: Railway -> Render.** One environment, staging only, auto-deploying from `main`. The free tier sleeps after ~15 minutes idle; the cold start is disclosed in the README, in `ENVIRONMENT.md`, in every delivery note and as a mandatory warm-up step in the demo script. No keep-alive pinger. ADR-0015, superseding ADR-0013.
- **Definition of Done now has two gates.** Gate 1 is the technical delivery (PR, green CI, staging verified, delivery note). Gate 2 is the project owner's QA acceptance, and **the PR approval is the acceptance**, enforced by branch protection. ADR-0017.
- **Secret handling corrected.** The owner enters every credential directly in the GitHub and Render dashboards. No agent receives a secret value, and nothing is stored in the repository or in a project document. The repository holds names only; CI proves the client bundle is clean. ADR-0016.
- **Prompts promoted to first-class deliverables.** Runtime prompts are files in `prompts/runtime/` that the application loads at build time, so the file a reviewer reads and the string the model receives are the same bytes. Build prompts are captured verbatim in `prompts/build/`. ADR-0018.

### Added

- ADR-0015, ADR-0016, ADR-0017, ADR-0018
- `docs/06-execution/DELIVERY_PROTOCOL.md`, with the delivery note template, the rework budget and the deadline timeout rule
- `docs/08-operations/SECRETS.md`
- `docs/12-delivery/` with a per-epic index
- `prompts/` with 4 runtime files and 4 build prompts
- `.claude/skills/epic-delivery` and `.claude/skills/polymarket-domain`
- Tasks T9.4 (assemble the prompt deliverable); T1.3 and T5.1 rewritten
- `pnpm warm`

### Cost

The QA gate is not free and the budget does not absorb it silently:

| Item | Cost | Paid from |
|---|---|---|
| 9 delivery notes at ~15 min | 2.25h | The epic estimates. The `epic-delivery` skill is what keeps it at 15 minutes. |
| Rework reserve, 20% per epic | up to 5.6h | The 2h slack first, then the cut order |
| Waiting for acceptance | 0h | We do not wait. Work moves to a non-dependent epic. |

Revised shape: **26h feature work, 2.25h delivery, 1.75h slack**, with the cut order paying for anything beyond that.

### Removed

Nothing yet. The rework reserve is a claim on slack, not a cut.

---

## [T0 + 2h] - Knowledge layer complete

**Phase:** research gate closed, PHASE 0 begins.

### Added

- Control layer: `PROJECT_INDEX.md`, `CURRENT_STATE.md`, `ACTIVE_CONTEXT.md`, `PROJECT_CHARTER.md`
- Research: Polymarket domain and API (verified against official docs and live responses), competitive and UX, forecasting strategy and evaluation, technical feasibility, open questions, 91 source records
- Domain: `POLYMARKET_DOMAIN_MODEL.md`, `ORDER_EXECUTION.md`
- Product: `PRD.md` (including a five-concept ideation funnel), `MVP_SCOPE.md`, `USER_FLOWS.md`, `FUTURE_VISION.md`
- Architecture: `ARCHITECTURE.md`, `API_CONTRACTS.md`, `SECURITY.md`
- AI: `AI_SYSTEM.md`, `AI_PROMPT_SPEC.md`, `EVALUATION.md`
- Execution: `ROADMAP.md`, `EPICS.md`, `BACKLOG.md` (33 task contracts), `DEFINITION_OF_DONE.md`
- Testing: `TEST_STRATEGY.md`
- Operations: `ENVIRONMENT.md`, `RISKS.md`
- Demo: `DEMO_SCRIPT.md`, `TRADEOFFS.md`, `EVALUATION_STORY.md`
- Agent system: `AGENT_PROTOCOL.md`
- 14 ADRs, all ACCEPTED (one later superseded)
- `CLAUDE.md` for the implementing agent

### Decisions

Fourteen ADRs. The ones that shaped everything else:

- **ADR-0007** rejected a retrospective backtest as invalid evidence. This removed the most impressive-looking artifact the project could have produced, and it is the decision the whole credibility story rests on.
- **ADR-0002** routed all reads through our own server, which closed the unknown-CORS risk by architecture rather than by investigation.
- **ADR-0006** made blindness structural rather than instructed, because instructing a model to ignore what it knows demonstrably does not work.
- **ADR-0001** rejected a monorepo despite it being a stated stack preference, on the grounds that it buys nothing this project needs.

### Research findings that changed the plan

| Finding | Effect |
|---|---|
| Polymarket read endpoints are fully public, no auth | Made a 48-hour build realistic. Removed an entire auth epic. |
| Order book asks arrive sorted **descending** | Became the highest-priority test in the repository |
| Polymarket charges takers `C × feeRate × p × (1 − p)`, 0 to 7% by category | Turned an assumed-free cost model into the product's spine, and created R-03 |
| Published LLM trading evaluations in 2026 are mostly negative | Reframed the entire product from "AI picks winners" to "AI adjusts the market, and may abstain" |
| Simulated ignorance leaves a measured 52% performance gap | Killed the backtest, produced ADR-0007 |
| Every existing Polymarket embed is display-only | Located the actual product gap |
| `prices-history` supports arbitrary timestamp pinning | Closed OQ-08. Made retrospective evaluation mechanically possible and left it methodologically invalid. |

### Cut

Nothing yet. Scope was set rather than reduced. The cut order is pre-written in `docs/01-product/MVP_SCOPE.md` so that reduction under time pressure is mechanical rather than improvised.

### Cost

Approximately 2 hours of the 48-hour budget, including three parallel research streams.

---

## Template for future entries

```
## [T0 + Nh] - <what happened>

### Added / Changed / Removed

### Decisions
   ADR references

### Cut
   what was removed, and what it paid for

### Cost
   hours against budget
```

## Scope change protocol

Any addition to challenge scope must answer, here, in writing:

1. What changed?
2. Why now, rather than in the MVP?
3. Time cost in hours?
4. **What is being removed to pay for it?**
5. Which documents change?

An addition with no corresponding removal is refused by default.

## 2026-08-17 — all nine epics delivered

Nine epics merged to `main`. Staging live at https://polymarket-widget.onrender.com and verified
with a real model call, not a mock.

**Gate:** 455 unit tests, 14 E2E, 12 live contract assertions, zero lint warnings, zero typecheck
errors, `src/simulation` at 100% branch coverage, no secret in the deployed client bundle.

**Five written claims the live API disproved**, all caught before the read path was written:
bids arrive ascending (not descending, as the domain model said); the specified secret-leak grep
could not have caught the leak it was written for; `Python-urllib/<version>` is blocklisted rather
than a missing User-Agent; both hosts do send permissive CORS, but only when an `Origin` header is
present; per-market fee fields are usually absent, so the category fallback is the common path.
Two of the five were the orchestrator's own errors, caught by workers who checked rather than
complied.

**Three failures that only appear in the packaged build**, each found before it mattered: the
first deploy bound to the container hostname and served 502s while reporting itself healthy; the
runtime prompts would not have survived a standalone build; and the E2E suite had been red since
E4 landed because Playwright was in neither `pnpm test` nor CI. The last is now in the aggregate
`ci` gate that branch protection requires.

**One bug the first live model calls found:** the sampler offered `web_search` alongside the
forced `submit_forecast` tool on a one-shot request, so on thin-coverage markets the model opened
with a search that nothing fulfilled and the forecast never arrived. Fixed by removing the tool;
re-enabling it means implementing the tool loop.

**Cost:** a forecast was six `claude-opus-5` calls with no cache. Added a route-level forecast
cache plus `ANTHROPIC_MODEL`, `AI_SAMPLES` and `AI_ANCHORED` controls. Staging runs the cheap
configuration, which is why `dispersion` reads 0 there.

**Not done, deliberately:** the timed twice-through demo rehearsal and a pre-identified
gate-passing market, both of which cost API credit to establish. `prompts/build/00` keeps its
placeholder because only the owner holds that text.
