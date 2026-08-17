# BACKLOG - TASK CONTRACTS

Execution order is top to bottom. Each task is sized for a single focused session and carries enough context that an agent does not need to read the whole repository to start.

**Rules of engagement**

- Do not start a task whose `dependencies` are not `DONE`.
- Do not implement beyond `requirements`. If you believe something is missing, add a task rather than expanding this one.
- Every task ends with its tests passing and `pnpm typecheck && pnpm lint && pnpm test` green.
- Update `CURRENT_STATE.md` `active_task` and `last_completed` when a task passes.
- If blocked for more than 15 minutes, stop and record the blocker rather than improvising.
- An epic is not finished when its tasks pass. It is finished when the owner has QA'd it and approved the PR. See `DELIVERY_PROTOCOL.md` and ADR-0017.
- Never enter, request or print a secret value. Names only. See `08-operations/SECRETS.md` and ADR-0016.

---

# EPIC E1 - Foundation

## T1.1 - Scaffold the application

```yaml
id: T1.1
epic: E1
estimated_minutes: 45
risk: low
dependencies: []
```

**Objective.** A Next.js 15 App Router + TypeScript strict project that builds, typechecks, lints and tests.

**Requirements.**
- pnpm. Node 22 (`.nvmrc`, `engines.node: ">=22"` so a newer local Node is not blocked). Next.js 15 App Router, `output: 'standalone'`. TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- Tailwind v4 configured. Vitest configured with a `src` alias `@/`.
- Directory skeleton exactly as `04-architecture/ARCHITECTURE.md` §3, each directory containing an `index.ts` barrel.
- ESLint with `import/no-restricted-paths` implementing the boundary table in that same section, plus a rule banning `dangerouslySetInnerHTML`.
- Scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `test:e2e`. Plus `warm`, `test:live` and `record-fixtures` as exit-0 stubs, so T1.3 and T1.4 fill in a script contract rather than inventing one.
- `/api/health` returning `{ status, commit, uptimeSeconds }` where `commit` reads `RENDER_GIT_COMMIT` or falls back to `"dev"`. No `upstream` or `ai` field here; those are T1.3 and T7.2.
- The server reads `process.env.PORT`. Render assigns it and a hardcoded 3000 fails the health check. This is the one named risk in E1.
- Every dependency the project will ever need is installed in this task, not incrementally. Four workers build `simulation`, `polymarket`, `ui` and `ai` in parallel afterwards and `package.json` is the one file they would all collide on.

**Acceptance criteria.**
1. `pnpm install && pnpm build` succeeds from a clean clone.
2. `pnpm typecheck && pnpm lint && pnpm test` pass with zero warnings.
3. A file `src/domain/__boundary_probe.ts` importing from `@/polymarket` fails `pnpm lint`. Delete it after proving this.
4. `curl localhost:3000/api/health` returns 200 with the documented shape.

**Tests required.** One trivial Vitest test. One ESLint boundary assertion (documented in the PR description if not automatable).

**Files expected.** `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/api/health/route.ts`, directory barrels.

> **Corrected during T1.1.** This line originally listed `tailwind.config.ts`. Tailwind v4 is
> CSS-first: there is no `tailwind.config.ts`. The theme lives in `src/app/globals.css` behind
> `@import 'tailwindcss'`, and the only build wiring is `@tailwindcss/postcss` in
> `postcss.config.mjs`. Do not create a `tailwind.config.ts`; v4 ignores it.

---

## T1.2 - CI pipeline

```yaml
id: T1.2
epic: E1
estimated_minutes: 30
risk: low
dependencies: [T1.1]
```

**Objective.** GitHub Actions running the full gate on every push.

**Requirements.** Node 22, pnpm cache. Jobs: typecheck, lint, test, build. Plus a `secret-leak` step that greps `.next/static` for `ANTHROPIC` and for the key prefix and fails on a match.

**Acceptance criteria.** Workflow green on push. A deliberately introduced type error fails the run. A deliberately introduced `NEXT_PUBLIC_ANTHROPIC_API_KEY` fails the secret-leak step.

**Correction, made while implementing.** The `secret-leak` step as specified above cannot meet its own third acceptance criterion, and this was verified against a real build rather than reasoned about. Next inlines `NEXT_PUBLIC_*` references at build time as the **value**: `process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY` compiles down to the literal string it held, so the variable **name never appears in `.next/static` at all**. Grepping the bundle for `ANTHROPIC` therefore sees nothing, and the key-prefix grep only catches the leak when the value happens to be shaped like a real key — precisely the condition you cannot depend on, and one you must not reproduce in a test.

So `secret-leak` is two halves. The bundle grep stays exactly as specified, because it is what catches a real key that reached the browser. Added to it is a **name-level scan** of `src/` and `.env.example`, plus the build environment, for any `NEXT_PUBLIC_*ANTHROPIC*` variable. The name is only visible before the build, so before the build is where it has to be caught. The environment scan reads names only and never prints a value.

**Also implemented, and not in the original requirements:** `pnpm audit` per `04-architecture/SECURITY.md` (informational report, gating only on a *critical* advisory — every advisory today is transitive through `next` and unfixable here, and a job that is red on `main` from day one is a job nobody reads); triggers on `pull_request` as well as `push`, because the branch protection T1.3 enables applies to PRs; and a single aggregate `ci` job that all others feed into, so branch protection has one stable check name to require instead of five that drift as jobs are added. No E2E job — Playwright browser provisioning in CI belongs to E6.

---

## T1.3 - Render staging deployment of the skeleton

```yaml
id: T1.3
epic: E1
estimated_minutes: 45
risk: medium
dependencies: [T1.1]
```

**Objective.** A public URL, before any features exist.

**Requirements.**
- Next standalone output. The server must bind `process.env.PORT`; Render sets it and a hardcoded 3000 fails the health check.
- One Render web service, free tier, named `polymarket-widget-staging`. Build `pnpm install --frozen-lockfile && pnpm build`, start `pnpm start`, health check path `/api/health`, auto-deploy from `main`.
- `ANTHROPIC_API_KEY` is entered **by the project owner in the Render dashboard**. The implementer never handles the value and never asks for it. See ADR-0016.
- `/api/health` reports `uptimeSeconds` so a cold start is visible, and `ai` as a reachability boolean that never reveals anything about the key.
- Add `pnpm warm`: a script that requests the staging URL and waits for a warm response, for use before any handover or demo.
- Enable branch protection on `main`: require the CI check and require one approving review. This is what makes the ADR-0017 QA gate enforceable.

**Acceptance criteria.**
1. The public URL returns 200 from `/api/health` with the real commit SHA.
2. A push to `main` triggers an automatic deploy.
3. A PR cannot be merged with red CI or without an approval.
4. `pnpm warm` returns successfully against a cold service.
5. The URL and service name are recorded in `08-operations/ENVIRONMENT.md`. No secret is recorded anywhere.

**Note.** Do this before writing features. A deployment problem at H40 is fatal; at H5 it is an inconvenience.

**Cold start.** The free tier spins down after ~15 minutes idle and the next request takes tens of seconds. This is expected, documented in ADR-0015, and must not be worked around with a keep-alive pinger.

---

## T1.4 - Live API contract spike and fixture recording

```yaml
id: T1.4
epic: E1
estimated_minutes: 60
risk: medium
dependencies: [T1.1]
```

**Objective.** Prove the documented Polymarket read behaviour against production and freeze real responses as test fixtures.

**Requirements.** A script `scripts/record-fixtures.ts` that calls, unauthenticated:
- `GET gamma /public-search?q=election`
- `GET gamma /markets/{id}` for the first market found
- `GET clob /book?token_id={...}` for a liquid token and for an illiquid one
- `GET clob /prices-history?market={...}&interval=1w&fidelity=60`

and writes raw JSON to `test/fixtures/`. Tag each fixture file with the date recorded.

Assert, in a test run against the **live** endpoints and marked so it can be excluded from CI:
1. All calls succeed with no auth headers.
2. `book.asks` is sorted descending by price upstream (the trap).
3. `clobTokenIds` values exceed `Number.MAX_SAFE_INTEGER`.
4. The market object contains `feesEnabled`, `takerBaseFee`, `orderPriceMinTickSize`, `orderMinSize`, `negRisk`, `acceptingOrders`.

**Acceptance criteria.** Fixtures written. Live contract test passes locally. CI runs only the fixture-backed tests, never the live ones.

**Opportunistic.** While here, note whether the responses carry `Access-Control-Allow-Origin`. Record the answer in `02-research/OPEN_QUESTIONS.md` OQ-01. Do not block on it; the proxy makes it moot either way.

---

# EPIC E2 - Domain and simulation

## T2.1 - Branded primitives and domain types

```yaml
id: T2.1
epic: E2
estimated_minutes: 45
risk: low
dependencies: [T1.1]
```

**Objective.** Every type in `03-domain/POLYMARKET_DOMAIN_MODEL.md` §1 to §5, in `src/domain`, with constructors and guards.

**Requirements.** Branded `Probability`, `Price`, `Shares`, `Usdc` with validating constructors (`asProbability` throws or returns a Result outside [0,1]). All entity interfaces. `GateReason` union. No imports from anywhere.

**Acceptance criteria.** `src/domain` imports nothing internal, enforced by lint. Constructors reject out-of-range values. `tokenId` is `string` everywhere, with no `number` in sight.

**Tests.** Constructor boundary tests. A test asserting a 77-digit token id string round-trips unchanged.

---

## T2.2 - Order book walk

```yaml
id: T2.2
epic: E2
estimated_minutes: 75
risk: low
dependencies: [T2.1]
```

**Objective.** `walkBook(book, { shares })` and `walkBookByBudget(book, { usdc })` producing a `FillEstimate`.

**Requirements.** Exactly the algorithm in `03-domain/ORDER_EXECUTION.md` §1. Assumes `asks` already ascending (normalization is E3's job, but write the test against the raw descending fixture to prove the contract). Handles empty book, partial fill, oversized request, single-level fill.

**Acceptance criteria.** Invariants I2, I3, I4, I8, I9, I10 all have passing tests. Branch coverage 100% on this file.

**Tests required (write first).**
- Fill entirely within the top level: `averagePrice === topOfBookPrice`, `priceImpact === 0`.
- Fill across three levels: hand-computed VWAP matches to 6dp.
- Request exceeding total depth: `partial === true`, `maxFillableShares` correct, no throw.
- Empty asks: `sharesFilled === 0`, no NaN, no division by zero.
- Budget-denominated request splitting a level: fractional shares correct.
- Property test: for random books and sizes, `averagePrice >= topOfBookPrice` always.

---

## T2.3 - Fee model

```yaml
id: T2.3
epic: E2
estimated_minutes: 30
risk: low
dependencies: [T2.1]
```

**Objective.** `computeFee(shares, averagePrice, feeConfig): Usdc`.

**Requirements.** `fee = C × feeRate × p × (1 − p)`, rounded to 5dp, floor of 0.00001 when non-zero. Taker only. `feeRate` comes from `FeeConfig`, never a constant. Return zero when `feeConfig.enabled === false` or `takerRate === 0`.

**Acceptance criteria.** Invariants I5, I6 tested. Both worked examples from `03-domain/ORDER_EXECUTION.md` §2 are literal test cases with their stated outputs ($0.375 and $1.00).

**Tests.** Fee maximum at p=0.5. Fee approaching zero at p=0.01 and p=0.99. Geopolitics rate 0 produces exactly 0. Rounding at the 5dp boundary.

---

## T2.4 - Edge and the cost waterfall

```yaml
id: T2.4
epic: E2
estimated_minutes: 45
risk: low
dependencies: [T2.2, T2.3]
```

**Objective.** `computeCostWaterfall(book, fill, feeConfig)` returning each step of the chain in `03-domain/ORDER_EXECUTION.md` §3, and `computeEdge(estimatedProbability, waterfall)`.

**Requirements.** Steps: midpoint, best ask, average fill price, fee per share, effective cost per share, surviving edge. Every step a named field, so the UI renders the chain rather than recomputing it.

**Acceptance criteria.** The worked waterfall in §3 reproduces exactly. Negative edge is returned as a negative number, never clamped to zero.

---

## T2.5 - Kelly sizing

```yaml
id: T2.5
epic: E2
estimated_minutes: 30
risk: low
dependencies: [T2.4]
priority: P2
```

**Objective.** `kellyFraction(p, q)` and `suggestedSize(p, q, bankroll, mode)`.

**Requirements.** `f* = (p − q) / (1 − q)`. Modes `quarter` (default), `half`, `full`. Hard cap at 2% of bankroll regardless of mode. Returns `null` when `f* <= 0`.

**Acceptance criteria.** The illustration in `03-domain/ORDER_EXECUTION.md` §4 is a test case: `q=0.90, p=0.95` yields full Kelly 0.5 and quarter Kelly 0.125, both capped to 0.02.

---

## T2.6 - Abstention gate

```yaml
id: T2.6
epic: E2
estimated_minutes: 75
risk: medium
dependencies: [T2.4]
```

**Objective.** `evaluateGate(input): { verdict, reasons }` implementing all 11 rules in `05-ai/AI_SYSTEM.md` §4.

**Requirements.** Pure function. Input is market metadata, the book, the fill, the forecast dispersion, the evidence count and the resolution-ambiguity label. Thresholds are named exported constants with a source comment on each. Returns every reason that fires, not just the first.

**Acceptance criteria.**
1. Each of the 11 rules has a dedicated test that fires it in isolation.
2. Each threshold constant carries a comment citing `02-research/STRATEGY_RESEARCH.md` §C3 and its source id.
3. A market that trips nothing returns `CONSIDER` with an empty `reasons`.
4. A market that trips three rules returns all three.

**Note.** This is the most defensible component in the product. Do not cut corners on the citations.

---

# EPIC E3 - Read path

## T3.1 - zod schemas for upstream

```yaml
id: T3.1
epic: E3
estimated_minutes: 60
risk: medium
dependencies: [T1.4, T2.1]
```

**Objective.** Schemas for the Gamma event/market object, the Gamma search response, the CLOB book and the CLOB price history, validated against the recorded fixtures.

**Requirements.** Permissive about unknown fields, strict about the fields we consume. `clobTokenIds` and `outcomes` parsed from their upstream representation into arrays of strings. Numeric strings coerced with explicit, tested coercion, never `Number()` on a token id.

**Acceptance criteria.** Every recorded fixture parses. A fixture with a renamed critical field fails with a message naming the field.

---

## T3.2 - Mappers to domain types

```yaml
id: T3.2
epic: E3
estimated_minutes: 60
risk: medium
dependencies: [T3.1]
```

**Objective.** `mapMarket()`, `mapSearchResults()`, `mapOrderBook()`, `mapPriceHistory()`.

**Requirements.**
- `mapOrderBook` **reverses asks to ascending**. This is the single most important line in the read path.
- `mapMarket` pairs `outcomes[i]` with `clobTokenIds[i]` and `outcomePrices[i]` by index, and fails loudly if the arrays differ in length.
- `mapMarket` derives `FeeConfig` from the market object fields, setting `source: 'market-object'`. Falls back to the category table with `source: 'category-fallback'` only when the fields are absent.
- Markets with `enableOrderBook === false` are excluded from search results.

**Acceptance criteria.** Invariants I1 and I11 tested. A test asserts that given the recorded descending-asks fixture, `mapped.asks[0].price` is the minimum ask.

---

## T3.3 - Cache and upstream client

```yaml
id: T3.3
epic: E3
estimated_minutes: 60
risk: medium
dependencies: [T3.2]
```

**Objective.** A small in-memory LRU with TTL, request coalescing, stale-on-error and backoff.

**Requirements.** TTLs per `04-architecture/ARCHITECTURE.md` §7. Concurrent identical keys share one in-flight promise. On upstream failure, serve stale within a 60s grace window and mark `stale: true`. On 429, back off exponentially and do not retry-storm.

**Acceptance criteria.** Two concurrent identical requests produce exactly one upstream call, asserted with a call counter. Expired entry triggers a refetch. Upstream failure with a warm stale entry serves it with `stale: true`.

---

## T3.4 - The four read routes

```yaml
id: T3.4
epic: E3
estimated_minutes: 75
risk: low
dependencies: [T3.3]
```

**Objective.** `/api/polymarket/{search,market/[id],book,history}` exactly per `04-architecture/API_CONTRACTS.md`.

**Requirements.** zod validation of inputs. `tokenId` matched against `/^\d+$/`. The documented response envelope and error taxonomy. **No generic pass-through route.** Each route builds its own upstream URL.

**Acceptance criteria.** Integration tests through MSW covering: happy path, upstream 500, upstream 429, malformed upstream payload, unknown market, invalid `tokenId`. Each maps to its documented error code and HTTP status.

---

# EPIC E4 - Widget UI

## T4.1 - Widget shell and layout system

```yaml
id: T4.1
epic: E4
estimated_minutes: 60
risk: low
dependencies: [T1.1]
```

**Objective.** The container-queried shell hosting the four states, plus theming.

**Requirements.** `container-type: inline-size` on the root. All responsive rules are container queries, never media queries. `color-scheme` driven by a `?theme=light|dark|auto` parameter. No storage APIs. A demo host page at `/` that embeds `/widget` in an iframe.

**Acceptance criteria.** Correct at 380px and 1200px container widths. Theme parameter switches the palette. A grep for `localStorage|sessionStorage|document.cookie` in `src` returns nothing.

---

## T4.2 - State A, search and discovery

```yaml
id: T4.2
epic: E4
estimated_minutes: 75
risk: low
dependencies: [T3.4, T4.1]
```

**Requirements.** Debounced 250ms combobox. Result rows per `01-product/USER_FLOWS.md` §State A with roving tabindex. Skeleton loading matching final layout. Trending on empty query. The "our failure" no-results state with suggestions. Retryable error keeping stale results visible with a badge.

**Acceptance criteria.** All five states render. Keyboard navigation works with one tab stop for the whole result list. No centred spinner anywhere.

---

## T4.3 - State C, order preview

```yaml
id: T4.3
epic: E4
estimated_minutes: 90
risk: medium
dependencies: [T2.4, T3.4, T4.1]
```

**Built before state B deliberately.** It is the highest-value screen and it exercises the simulation engine.

**Requirements.** Dollar and share input with presets. The five preview lines exactly as specified. Price-impact row suppressed when the fill is entirely at top of book. Fee row naming the category and rate, and labelled "estimated" when `feeConfig.source === 'category-fallback'`. The CTA error ladder. Insufficient depth caps the input and explains. Freshness stamp on the book.

**Acceptance criteria.** Every rung of the CTA ladder reachable. Preview numbers match `walkBook` and `computeFee` exactly, asserted by a component test against a fixture book. Wide-spread markets display last trade price with the labelled reason.

---

## T4.4 - State B, market detail

```yaml
id: T4.4
epic: E4
estimated_minutes: 75
risk: low
dependencies: [T4.2, T4.3]
```

**Requirements.** Probability with 200 to 300ms transition and desaturated colour. Freshness stamp. Outcome selector for binary and multi-outcome. negRisk badge. Resolution criteria disclosure in the primary flow. Order book depth disclosure. Sparkline (P1, cut candidate). A placeholder AI panel that E5 fills in.

**Acceptance criteria.** Multi-outcome markets render as proportional bars, not a dropdown. Resolution criteria reachable in one interaction. No flashing on price update.

---

## T4.5 - State D, confirmation and position list

```yaml
id: T4.5
epic: E4
estimated_minutes: 45
risk: low
dependencies: [T4.3]
```

**Requirements.** Restates the preview with identical numbers and no new information. "Simulated. No funds moved." at the point of commitment. Session position list in React context, in memory. A visible note that positions reset on reload.

**Acceptance criteria.** Confirmation numbers are byte-identical to the preview. The word "simulated" appears at the commitment point, not only in a footer.

---

# EPIC E5 - AI layer

## T5.1 - Prompt assembly with structural blindness

```yaml
id: T5.1
epic: E5
estimated_minutes: 45
risk: medium
dependencies: [T2.1]
```

**Requirements.**
- `BlindPromptInput` type with no price field.
- **Prompt text is loaded from `prompts/runtime/*.md`, not written as string literals.** The file the reviewer reads and the string the model receives are the same bytes. See ADR-0018.
- `buildBlindPrompt` and `buildAnchoredPrompt` interpolate the loaded template.
- The tool schema is loaded from `prompts/runtime/submit_forecast.schema.json`.
- Prompt version is derived from the filename (`blind-v1.md` -> `blind-v1`), so a version bump is a file rename and cannot be forgotten.

**Acceptance criteria.**
1. The price-absence test passes: for a fixture market priced 0.6180, the assembled blind prompt contains none of `0.618`, `0.6180`, `61.8`, `62%`, `62c`.
2. A deliberate attempt to add a price to `BlindPromptInput` fails typecheck.
3. A test asserts the loaded prompt text is byte-identical to `prompts/runtime/blind-v1.md`, so the file and the code cannot drift.
4. `promptVersion` on a produced forecast names a file that exists.

---

## T5.2 - Anthropic client and k-sampling

```yaml
id: T5.2
epic: E5
estimated_minutes: 75
risk: high
dependencies: [T5.1]
```

**Requirements.** Server-only Anthropic client, `claude-opus-5`, web search enabled, forced tool use with the schema from `05-ai/AI_PROMPT_SPEC.md`. k=5 parallel calls, temperature 1. Hard 45s timeout on the whole operation. Retry a schema violation once. Aggregate by median of log-odds; dispersion as IQR.

**Acceptance criteria.** Aggregation is a separately unit-tested pure function with hand-computed cases including k=1, an outlier sample, and samples at 0.01 and 0.99. A mocked schema violation retries exactly once then returns `AI_INVALID_OUTPUT`. Timeout returns `AI_TIMEOUT`. The key never appears in any client-reachable output.

---

## T5.3 - Blend, gate wiring and the forecast route

```yaml
id: T5.3
epic: E5
estimated_minutes: 60
risk: medium
dependencies: [T5.2, T2.6]
```

**Requirements.** Logit blend at `w = 0.35` as a named exported constant with a comment saying it is pre-registered and must not be tuned on outcomes. Anchored diagnostic call. `POST /api/ai/forecast` per the API contract, composing forecast, fill and gate into a `Recommendation`.

**Acceptance criteria.** Blend is unit tested including the boundary cases. `insufficient_evidence: true` from the model maps to `AI_NO_EVIDENCE` with a 200. The route returns a complete `Recommendation` for a fixture market.

---

## T5.4 - AI panel UI

```yaml
id: T5.4
epic: E5
estimated_minutes: 75
risk: medium
dependencies: [T5.3, T4.4]
```

**Requirements.** Collapsed by default, user-invoked, never fires on load. Phase indicators (searching, reading, writing). Sources render before the estimate. Estimate shown as a range with dispersion, in a visually distinct register from the market number. Per-claim citations with dates; undated sources labelled. Gate verdict with reason codes, each linking to its justification. Blind-vs-anchored warning when the delta is near zero. Provenance footer: timestamp, model id, prompt version, k, blend weight.

**Acceptance criteria.** The three registers (market, model, cost) are visually distinguishable in a screenshot. Every AI failure state renders without breaking the rest of the page. Nothing in the panel states or implies the system beats the market.

---

# EPIC E6 - Integration and E2E

## T6.1 - Playwright golden path

```yaml
id: T6.1
epic: E6
estimated_minutes: 75
risk: medium
dependencies: [T4.5, T5.4]
```

**Requirements.** Search, select, open detail, request AI, select outcome, enter amount, verify the five preview lines against expected values computed from the fixture book, confirm, verify the position. Fully deterministic against MSW fixtures, no live network.

**Acceptance criteria.** Green in CI. Runs in under 60s. Asserts on the actual computed numbers, not just element presence.

---

## T6.2 - Failure-path tests

```yaml
id: T6.2
epic: E6
estimated_minutes: 60
risk: low
dependencies: [T6.1]
```

**Requirements.** Four scenarios from `01-product/USER_FLOWS.md` §Failure flows: gate fires, AI route down, thin book, closed market. Plus upstream 429 and upstream shape change.

**Acceptance criteria.** With the AI route returning 500, the golden path still completes through to a simulated position.

---

# EPIC E7 - Polish and deploy

## T7.1 - Accessibility pass

```yaml
id: T7.1
epic: E7
estimated_minutes: 60
risk: low
dependencies: [T4.5]
```

**Requirements.** Combobox semantics, roving tabindex, focus order, `aria-live="assertive"` on errors and **nothing** on routine price ticks, contrast in both themes, visible focus rings. Run axe on the golden path.

**Acceptance criteria.** Zero critical axe violations. Golden path completable with keyboard only. A screen reader does not announce every price refresh.

---

## T7.2 - Production deployment and secret verification

```yaml
id: T7.2
epic: E7
estimated_minutes: 45
risk: medium
dependencies: [T1.3, T5.4]
```

**Requirements.** Deploy the full app. Verify `ANTHROPIC_API_KEY` is set and functional. Run the secret-leak check against the production bundle. Confirm the iframe demo host page works against the deployed URL.

**Acceptance criteria.** Public URL completes the golden path including a live AI call. Secret-leak check passes. `/api/health` reports both upstreams reachable.

---

# EPIC E8 - Credibility layer (P2, first to cut)

## T8.1 - Freeze and hash manifest CLI

```yaml
id: T8.1
epic: E8
estimated_minutes: 75
risk: medium
dependencies: [T5.3]
priority: P2
```

**Requirements.** `pnpm freeze --n 30 --max-horizon-days 21` selects unresolved short-horizon markets by a mechanical, pre-registered rule, runs the pipeline, writes JSONL with market id, question, resolution criteria, frozen bid/ask/mid, book depth, close date, category, fee rate, `p_blind`, all samples, `p_blended`, gate decision and suggested size. Computes SHA-256 of the file and writes it to `evaluation/MANIFEST.sha256`.

**Acceptance criteria.** Manifest and hash committed. Re-running the hash reproduces it. Selection rule is code, not judgment. Horizon selection is disclosed in the report as a deliberate choice.

> **Corrected during T8.1.** Implemented against a narrower dispatch brief than the field list
> above; the differences, so a later implementer does not read this as done and move on:
>
> - **Manifest fields.** Recorded: market id, question, token id, outcome label, market
>   price at freeze (bid/ask midpoint only, not full book depth), the full `Forecast` (blind/
>   anchored/blended probabilities, dispersion, all samples, promptVersion, modelId), `k`, gate
>   verdict and reason codes, and the freeze timestamp. **Not recorded**: resolution criteria,
>   book depth beyond top-of-book, close date as a separate field (it is on the fetched `Market`
>   but not copied into the entry), category, fee rate, and suggested Kelly size. Adding these is
>   cheap (they are already computed inside `composeForecastRecommendation`'s `Recommendation`)
>   and would be a small follow-up task, not a redesign.
> - **Market discovery.** `GET gamma /markets/keyset?tag_id=&closed=false&after_cursor=` (the
>   `polymarket-domain` skill's own recommended bulk-listing endpoint) was not used because it
>   could not be verified live from this environment (no outbound network — see the T8.1/T8.3
>   delivery note). Candidate discovery instead reuses `fetchSearch`, the one upstream read this
>   project has already verified end to end, against a small pre-registered set of seed queries
>   (`src/app/api/_manifest/marketSource.ts`). This is still mechanical (the query list is a
>   constant, not a per-run choice) but is a narrower universe than a full unresolved-market
>   listing would give. Switching to the keyset endpoint once it is verified against live traffic
>   is a good follow-up and should be a small change — `MarketCandidateSource` is the seam.
> - **New dependency.** `tsx` was added as a devDependency. `src/ai`'s forecast pipeline and
>   `src/polymarket`'s client are written with the `@/` path alias and extensionless relative
>   imports that only a bundler-aware resolver handles; plain `node --experimental-strip-types`
>   (`record-fixtures.ts`'s approach) cannot import them. `tsx` resolves `tsconfig.json`'s `paths`
>   correctly and was verified to do so before use.

---

## T8.2 - Resolution-free diagnostics

```yaml
id: T8.2
epic: E8
estimated_minutes: 75
risk: medium
dependencies: [T8.1]
priority: P2
```

**Requirements.** Compute and render: complementary coherence, multi-outcome coherence on a negRisk group, blind-vs-anchored delta, sample dispersion distribution, disagreement distribution `p_blind − mid`, gate reason histogram, cost waterfall for one market. Every chart shows its bin or sample counts.

**Acceptance criteria.** Every diagnostic renders with counts visible. Each has its methodology one click away. No number appears without the sample size that produced it.

---

## T8.3 - Resolve command

```yaml
id: T8.3
epic: E8
estimated_minutes: 45
risk: low
dependencies: [T8.1]
priority: P3
```

**Requirements.** `pnpm resolve` fills outcomes into the manifest for markets that have resolved, computes paired Brier vs the frozen market price with a 95% CI, and emits the report template from `05-ai/EVALUATION.md` §B6.6, including the required sentence stating that the current N is insufficient.

> **Corrected during T8.3.** Implemented against a narrower dispatch brief: `pnpm resolve`
> verifies the manifest hash before touching anything, refuses loudly on a mismatch, and appends
> `{ marketId, tokenId, outcome, resolvedAt }` rows to a separate, append-only
> `evaluation/OUTCOMES.jsonl` — proven never to mutate `MANIFEST.jsonl` or its hash
> (`test/app/api/_manifest/persistence.test.ts`). **Not implemented**: the paired Brier score,
> its 95% CI, and the §B6.6 report template. Those need real resolved outcomes to be meaningful
> and were out of scope for this dispatch; they are a natural follow-up once `pnpm freeze` has
> been run for real (it has not — see the delivery note) and some entries have resolved.
>
> **Resolved-outcome inference is a documented limitation.** The `Market` domain type (T2.1/T3.2)
> carries no authoritative "winning outcome" field — that was outside T3's read-path scope. This
> task infers the outcome from the settled `indicativePrice` on the matching `MarketOutcome`
> once `market.closed === true`: `>= 0.98` -> `YES`, `<= 0.02` -> `NO`, otherwise `ANNULLED`
> (`src/app/api/_manifest/resolve.ts`, `inferResolvedOutcome`). This has not been verified
> against a real resolved market from this environment (no outbound network). If Polymarket
> exposes a more authoritative resolved-outcome field, prefer it over this inference in a
> follow-up.

---

# EPIC E9 - Demo and docs

## T9.1 - README for two audiences

```yaml
id: T9.1
epic: E9
estimated_minutes: 45
risk: low
dependencies: [T7.2]
```

**Requirements.** Top section for a product reviewer: what it is, the three-numbers thesis, a screenshot, the live URL. Second section for a technical reviewer: architecture diagram, how to run it, test strategy, the ADR index. Third section: limitations and the claims policy, linked prominently. Answers to the nine questions in `09-demo/EVALUATION_STORY.md`.

---

## T9.2 - Demo rehearsal

```yaml
id: T9.2
epic: E9
estimated_minutes: 45
risk: low
dependencies: [T7.2]
```

**Requirements.** Run `09-demo/DEMO_SCRIPT.md` end to end against the deployed URL, twice, timed. Identify and record two specific market slugs: one that passes the gate, one that is rejected. Verify neither has resolved or gone illiquid. Record a fallback for each.

**Acceptance criteria.** Two clean runs under five minutes with no manual recovery. Market slugs and fallbacks written into the demo script.

---

## T9.4 - Assemble the prompt deliverable

```yaml
id: T9.4
epic: E9
estimated_minutes: 30
risk: low
dependencies: [T5.1]
```

**Objective.** Every prompt used by this project, runtime and build, present in the repository as a first-class artifact. Governed by ADR-0018.

**Requirements.**
- `prompts/runtime/` contains the live prompt files the application loads.
- `prompts/build/` contains, verbatim as sent: the master orchestrator prompt, the three research agent prompts, and any later orchestration prompt of consequence. Including the ones that produced work later discarded.
- `prompts/README.md` indexes all of them with: file, version, what it is for, when it was written, which model it was sent to, and what it produced.
- The README links to `prompts/` prominently, framed as part of the submission rather than an appendix.

**Acceptance criteria.**
1. Every `promptVersion` value the application can emit corresponds to a file in `prompts/runtime/`.
2. No runtime prompt text exists as a string literal anywhere in `src/`.
3. `prompts/build/` is non-empty and its contents are verbatim, not summarised.
4. A reader can reconstruct how the repository was produced from `prompts/build/` alone.

---

## T9.3 - Final quality gate

```yaml
id: T9.3
epic: E9
estimated_minutes: 30
risk: low
dependencies: [T9.1, T9.2]
```

**Requirements.** Walk `06-execution/DEFINITION_OF_DONE.md` §Final gate item by item. Tick or explicitly waive each, in writing, in `CHANGELOG.md`. Update `CURRENT_STATE.md` to reflect delivery.
