# RISK REGISTER

Scored as Likelihood x Impact, each 1 to 5. Anything scoring 12 or above has a named trigger and a rehearsed response.

| ID | Risk | L | I | Score | Mitigation | Trigger and response |
|---|---|---|---|---|---|---|
| R-01 | **Anchoring collapse.** The model's estimate is an echo of the market price, so every edge number is an artifact. | 4 | 5 | **20** | Structural blindness: the blind prompt input type has no price field, enforced by the compiler and by a test. Blind-vs-anchored delta computed on every forecast. | Trigger: the disagreement distribution spikes at zero. Response: display the anchoring warning prominently and say in the demo that we measured it rather than assumed it away. |
| R-02 | **Scope creep past the 48h budget.** | 4 | 5 | **20** | A written cut order applied at seven scheduled checkpoints. Any addition must name what it removes. | Trigger: a checkpoint in `ROADMAP.md` is missed. Response: apply the next cut immediately, do not negotiate with yourself. |
| R-03 | **Fee omitted or wrong.** Most public writing still says Polymarket is fee-free, so an implementer working from general knowledge ships a false cost preview. | 3 | 5 | **15** | Fee is a unit-tested pure function fed by per-market API fields (ADR-0009). Two worked examples are literal test cases. Category table is display copy only. | Trigger: any preview showing a zero fee on a non-Geopolitics market. Response: block the release. |
| R-04 | **Order book asks misread.** Upstream sends asks descending; reading `asks[0]` prices a buy at 99c instead of 45c. | 3 | 5 | **15** | Normalization in one mapper, guarded by the highest-priority test in the suite. | Trigger: any fill price near the top of the 0 to 1 range. Response: check the mapper first, always. |
| R-05 | **Deployment fails late.** | 2 | 5 | **10** | Deploy an empty skeleton at H5 and keep it green throughout. | Trigger: a deploy fails at any checkpoint. Response: stop feature work until it is green. |
| R-06 | **AI latency or cost blows the budget.** Five parallel calls with web search is slow and not free. | 3 | 3 | **9** | Hard 45s timeout. User-invoked, never on load. k=1 degradation is step 4 of the cut order. Independent data path so nothing else blocks. | Trigger: p50 latency above 20s. Response: drop to k=3, record it in `promptVersion`. |
| R-07 | **Undocumented upstream rate limits.** No published numbers exist. | 3 | 3 | **9** | Proxy-level caching, request coalescing, exponential backoff, stale-on-error. 429 surfaces as "refreshing paused", not an error. | Trigger: any 429. Response: increase TTLs, do not retry harder. |
| R-08 | **A demo market resolves or goes illiquid before the demo.** | 3 | 3 | **9** | Two markets pre-identified with two fallbacks, verified in the rehearsal at H46. | Trigger: rehearsal shows a stale market. Response: swap to the fallback and re-rehearse. |
| R-09 | **Upstream API shape change mid-build.** | 2 | 4 | **8** | Single zod boundary. A change fails loudly in one place with the field named. Live contract suite re-run before the demo. | Trigger: `UPSTREAM_SHAPE_CHANGED` in logs. Response: fix the schema and the mapper, re-record fixtures. |
| R-10 | **Over-claiming under time pressure.** Someone writes "our AI beats the market" in the README at hour 47. | 3 | 5 | **15** | A written claims policy (`05-ai/EVALUATION.md` §B8), reproduced in `AI_SYSTEM.md` §8, and a final-gate checklist item. | Trigger: any performance claim in any artifact. Response: rewrite it using the permitted wording table. |
| R-11 | **The gate never fires**, making the abstention feature decorative. | 2 | 4 | **8** | Gate reason histogram is a shipped diagnostic. A deliberate rejection is scripted into the demo. | Trigger: all-accept across a sample of 30 markets. Response: the thresholds are wrong; re-derive them from the cited sources, do not loosen them to look good. |
| R-12 | **CORS blocks the widget from an arbitrary host.** | 2 | 4 | **8** | Made moot by ADR-0002: the browser only ever calls our own origin. | Trigger: none expected. This risk is closed by architecture rather than managed. |
| R-13 | **Secret leaks into the client bundle.** | 2 | 5 | **10** | AI code is server-only. CI greps the built bundle and fails on a match. | Trigger: CI secret-leak step fails. Response: rotate the key immediately, then fix. |
| R-14 | **Tests pass but the demo breaks**, because E2E runs against fixtures and the demo runs against live data. | 3 | 4 | **12** | The live contract suite runs before the demo. Two rehearsals against the deployed URL, not localhost. | Trigger: any divergence between fixture and live behaviour. Response: re-record fixtures and re-run E2E. |
| R-15 | **Prompt injection via market text or a retrieved page.** | 2 | 3 | **6** | Untrusted text is delimited and declared as data. Tool schema bounds the output. The model has no mutating tools. Evidence hostnames are shown to the user. | Accepted residual risk, disclosed in `SECURITY.md` §6. |
| R-16 | **Fatigue-driven errors.** Two sleep blocks are in the plan for a reason. | 3 | 3 | **9** | Sleep blocks are in the roadmap as non-negotiable. Checkpoints are objective so a tired person does not have to exercise judgment. | Trigger: working through a scheduled sleep block. Response: the cut order exists precisely so this is unnecessary. |

## Risks we are accepting without mitigation

Stated explicitly, because an unstated accepted risk looks like an oversight.

- **The forecast may simply not be good.** We have no way to know in 48 hours, and the published evidence suggests it probably is not better than the market. The product is designed so that this being true does not make the product dishonest.
- **The annulment / 50-50 resolution rate on Polymarket is unknown.** We disclose it qualitatively rather than invent a number.
- **Chromium only.** A widget deserves broad browser testing. It will not get it here, and that is named as a limitation rather than hidden.
- **No load testing.** No traffic model exists for a demo.
- **In-memory positions vanish on reload.** A consequence of sandboxed-iframe constraints. Disclosed in the UI.
