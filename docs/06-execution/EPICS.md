# EPICS

Nine epics. Each has an objective, value, scope, dependencies, risks, acceptance criteria and a time budget. Task-level contracts are in `BACKLOG.md`.

Priority model: **P0** challenge-critical · **P1** high-impact · **P2** differentiator · **P3** future.

**Every epic ends with a QA acceptance gate.** The acceptance criteria below are gate 1, the technical delivery. Gate 2 is the project owner running the 5-minute verification, ticking the checklist and approving the pull request. An epic whose tests pass is not delivered. See `DELIVERY_PROTOCOL.md` and ADR-0017. Each epic's estimate includes writing its delivery note; 20 percent of it is additionally reserved for rework.

---

## E1 - Foundation and live-API contract

```yaml
priority: P0
estimated_hours: 3
minimum_viable_hours: 2
maximum_hours: 4
risk: low
value: high
dependencies: []
```

**Objective.** A repository that builds, typechecks, lints, tests and deploys in one command, plus proof that the live Polymarket read path behaves as documented.

**Business value.** Every hour after this depends on it. A deployment problem found on day two is fatal; found in hour three it is an inconvenience.

**Scope.** Next.js 15 + TypeScript strict scaffold. pnpm. ESLint with the import-boundary rule. Vitest. Playwright. GitHub Actions running typecheck, lint, test, build, secret-leak. `/api/health`. Render deployment of the empty skeleton, auto-deploying from `main`. Branch protection requiring CI and one approval. Contract tests hitting the live Gamma and CLOB endpoints and recording their responses as fixtures.

**Risks.** Render build configuration for Next standalone output, and binding `process.env.PORT`. Mitigate by deploying before writing any features.

**Acceptance criteria.**
1. Clean clone to green build in one command.
2. A deliberate import-boundary violation fails lint.
3. CI green on push.
4. Deployed URL returns `{ status: "ok" }` from `/api/health`.
5. Contract tests pass against live endpoints and write fixtures to `test/fixtures/`.
6. The recorded order-book fixture demonstrates descending asks, which is what E2 will be tested against.

---

## E2 - Domain model and simulation engine

```yaml
priority: P0
estimated_hours: 6
minimum_viable_hours: 4
maximum_hours: 7
risk: low
value: very_high
dependencies: [E1]
```

**Objective.** Pure, framework-free, fully tested arithmetic for order-book walking, fees, edge and sizing.

**Business value.** The component a reviewer can verify with a calculator. It is never cut, it has no dependencies, and it is where the domain understanding is demonstrated.

**Scope.** Branded primitives. `Market`, `OrderBook`, `FillEstimate`, `SimulatedPosition`, `Forecast`, `Recommendation`. `walkBook`, `walkBookByBudget`, `computeFee`, `computeEdge`, `kellyFraction`, `evaluateGate`. Invariants I1 to I12 from the domain model as property tests.

**Risks.** The descending-asks trap. Mitigated by making it the first test written.

**Acceptance criteria.**
1. Every invariant I1 to I12 has a passing test.
2. 100% branch coverage on `src/simulation`.
3. The worked examples in `03-domain/ORDER_EXECUTION.md` §2 are literal test cases with the stated outputs.
4. No import of React, Next or any I/O anywhere in `src/domain` or `src/simulation`, enforced by lint.
5. Empty book, thin book and oversized request all return valid values and never throw.

---

## E3 - Polymarket read path

```yaml
priority: P0
estimated_hours: 3
minimum_viable_hours: 2
maximum_hours: 4
risk: medium
value: high
dependencies: [E1, E2]
```

**Objective.** Four proxy routes serving validated, cached, normalized market data.

**Scope.** zod schemas for the Gamma market object and the CLOB book. Mappers to domain types. In-memory LRU cache with TTL and request coalescing. Error taxonomy. The four routes in `04-architecture/API_CONTRACTS.md`.

**Risks.** Upstream shape drift; unknown rate limits. Mitigated by the single zod boundary and by caching plus backoff.

**Acceptance criteria.**
1. Every route matches its documented contract exactly, asserted by integration tests against MSW fixtures.
2. `asks` is ascending in every response from `/api/polymarket/book`.
3. `tokenId` round-trips as a string with no precision loss.
4. A malformed upstream payload produces `UPSTREAM_SHAPE_CHANGED`, not a crash.
5. Two concurrent identical requests produce one upstream call.
6. Upstream 429 produces `UPSTREAM_RATE_LIMITED` and serves stale data if available.

---

## E4 - Widget UI

```yaml
priority: P0
estimated_hours: 7
minimum_viable_hours: 5
maximum_hours: 9
risk: medium
value: very_high
dependencies: [E2, E3]
```

**Objective.** The four states of the golden path, finished, including every loading, empty and error state.

**Scope.** Search with debounce and combobox semantics. Result rows with roving tabindex. Market detail with freshness stamp, resolution disclosure, outcome selector, order book disclosure. Order preview with the five lines and the CTA error ladder. Confirmation. Container-queried layout at 380x600 and full width. Light and dark via explicit theme parameter.

**Risks.** Time overrun on polish. Mitigated by building states in the order A, C, B, D so the two highest-value screens land first.

**Acceptance criteria.**
1. Golden path clickable end to end with no reload.
2. Every state in `01-product/USER_FLOWS.md` is reachable and rendered.
3. Layout correct at 380px and at 1200px, driven by container queries not media queries.
4. Keyboard-only completion of the golden path is possible.
5. No `localStorage`, `sessionStorage` or cookie usage anywhere.
6. Price updates transition over 200 to 300ms and never flash.

---

## E5 - AI layer

```yaml
priority: P0
estimated_hours: 5
minimum_viable_hours: 3
maximum_hours: 7
risk: high
value: high
dependencies: [E2, E3]
```

**Objective.** Blind, sampled, schema-enforced forecasting with a working abstention gate.

**Scope.** `buildBlindPrompt` with a price-free input type. k parallel calls. Median of log-odds, IQR dispersion. Anchored diagnostic call. Blend at the pre-registered weight. Gate evaluation. The AI panel UI with streaming states, evidence rendering and the three-register separation of market, model and cost.

**Risks.** Highest-variance epic. Latency, cost, schema violations, anchoring leakage. Mitigated by the hard timeout, the retry-once policy, the independent data path, and the k=1 degradation in the cut order.

**Acceptance criteria.**
1. The assembled blind prompt provably contains no market price, asserted by test.
2. Output conforms to the tool schema; a violation retries once then returns a handled error.
3. The gate fires on a fixture market and names its reason codes.
4. Killing the AI route leaves the rest of the widget fully functional, asserted by an E2E test.
5. AI estimate and market price render in visibly different registers.
6. Every displayed forecast shows its timestamp, model id, prompt version, sample count and dispersion.

---

## E6 - Integration and E2E

```yaml
priority: P0
estimated_hours: 3
minimum_viable_hours: 2
maximum_hours: 4
risk: medium
value: high
dependencies: [E4, E5]
```

**Objective.** Prove the system works, including when it fails.

**Scope.** Playwright golden path against MSW-backed fixtures. Failure-path tests: AI down, thin book, closed market, upstream 429, upstream shape change. Integration tests for each route.

**Acceptance criteria.**
1. Golden path E2E green in CI, deterministic, no live network.
2. All four failure paths from `01-product/USER_FLOWS.md` §Failure flows have passing tests.
3. Test suite runs in under two minutes.

---

## E7 - Polish and deployment

```yaml
priority: P1
estimated_hours: 3
minimum_viable_hours: 2
maximum_hours: 4
risk: low
value: high
dependencies: [E4]
```

**Objective.** A deployed URL that looks finished.

**Scope.** Accessibility pass (focus order, aria-live discipline, contrast). Skeletons matching final layout. Theme parameter. Empty and error copy review. Render staging configuration, environment variables, health check, secret-leak CI check, and `pnpm warm`.

**Acceptance criteria.**
1. Public URL loads the widget and completes the golden path.
2. Client bundle contains no secret; CI proves it.
3. Axe reports no critical violations on the golden path.
4. A demo host page embeds the widget in an iframe and it works.

---

## E8 - Credibility layer

```yaml
priority: P2
estimated_hours: 3
minimum_viable_hours: 0
maximum_hours: 4
risk: medium
value: high
dependencies: [E5]
```

**Objective.** Make the honesty claims verifiable rather than asserted.

**Scope.** A CLI that freezes N unresolved short-horizon markets with their forecasts into JSONL and writes a SHA-256 hash of the file into the repo and the UI. A diagnostics view rendering complementary coherence, sample dispersion, blind-vs-anchored delta, the disagreement distribution and the gate reason histogram. A `resolve` command that fills outcomes in later.

**Risks.** First thing cut. Zero minimum viable hours by design.

**Acceptance criteria.**
1. `pnpm freeze` produces a manifest and a hash, both committed.
2. The hash is displayed in the UI and matches the file.
3. Every diagnostic renders with its bin or sample counts visible.
4. No metric is displayed without its methodology one click away.

---

## E9 - Demo and documentation

```yaml
priority: P0
estimated_hours: 2
minimum_viable_hours: 1.5
maximum_hours: 3
risk: low
value: very_high
dependencies: [E7]
```

**Objective.** A five-minute demo with no surprises, and a repository that reads well to both a technical and a product reviewer.

**Scope.** README for both audiences. Demo script rehearsed at least twice end to end against the deployed URL. `09-demo/TRADEOFFS.md` and `09-demo/EVALUATION_STORY.md`. CHANGELOG. Final quality gate walkthrough.

**Acceptance criteria.**
1. Demo completed twice, timed, under five minutes, with no manual recovery.
2. Two specific markets pre-identified: one that passes the gate and one that is rejected.
3. README answers the nine final review questions in `09-demo/EVALUATION_STORY.md`.
4. Every item in `06-execution/DEFINITION_OF_DONE.md` §Final gate is ticked or explicitly waived in writing.
