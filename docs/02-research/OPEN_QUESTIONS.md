# OPEN QUESTIONS

Every unknown is recorded here rather than assumed away. An UNKNOWN with a documented assumption and a reversible implementation is acceptable engineering. An UNKNOWN that was quietly guessed is not.

| ID | Question | Status | Impact if wrong | Our position |
|---|---|---|---|---|
| OQ-01 | Do Polymarket's public read hosts send permissive CORS headers to an arbitrary embedding origin? | UNKNOWN | Would block a direct-from-browser widget entirely | **Closed by architecture.** ADR-0002 routes everything through our own server, so the browser never makes a cross-origin call. Answer opportunistically during T1.4 and record it, but do not block on it. |
| OQ-02 | What are the actual rate limits on the public read endpoints? | UNKNOWN. The builder tiers page names "Standard" and "Highest" but publishes no numbers. | Uncontrolled 429s during the demo | Assume limits exist and are not generous. Cache at the proxy, coalesce identical requests, back off on 429, surface "refreshing paused" rather than an error. |
| OQ-03 | What are Polymarket's live order-ticket field labels? | UNKNOWN. No source enumerated them. | Our copy may diverge from what a Polymarket user expects | Low impact. We are deliberately not cloning their ticket. Our five-line preview is derived from the research in `UX_RESEARCH.md` §1.3. |
| OQ-04 | Do the global and US fee schedules differ, and which entity's data does the API return? | CONFLICTING. Secondary sources report different schedules for the two entities. | A wrong fee rate in the preview | Read the rate from the market object per market. Label the source. Never reconcile the two schedules by picking one. |
| OQ-05 | What is Polymarket's annulment / 50-50 resolution rate? | UNKNOWN. Comparable platforms report roughly 4% to 8%. | Resolution tail risk is unquantified | Disclose qualitatively in the UI. Do not model it as zero and do not invent a number. |
| OQ-06 | Is there an oEmbed endpoint or a documented host API for Polymarket's official embed? | UNKNOWN. None found. | Only affects a future embed-compatibility feature | Out of scope. We ship our own ResizeObserver plus postMessage height negotiation (P2). |
| OQ-07 | What is the empirical standard deviation of the paired Brier difference on our market set? | UNKNOWN until measured | Every sample-size calculation in `05-ai/EVALUATION.md` §B2 depends on it | Measure it on the first resolved pairs and report it with the caveat that the sample is too small to trust. |
| OQ-08 | Does `prices-history` allow pinning a price to an arbitrary past timestamp? | **RESOLVED, 2026-08-15.** Yes: it accepts `startTs` / `endTs` in Unix seconds with minute-level `fidelity`. | Would have determined whether retrospective evaluation is mechanically possible | Mechanically possible, methodologically invalid for a different reason (training-data contamination). We still do not do it. See `05-ai/EVALUATION.md` §B5. |
| OQ-09 | Is CLOB read access genuinely unauthenticated? | **RESOLVED, 2026-08-15.** Yes. The host-level summary table said otherwise; the per-endpoint reference and a live unauthenticated request both confirm reads are public. | Would have added an auth epic | Recorded as a resolved CONFLICT in `POLYMARKET_RESEARCH.md` §1. |

## How to close a question

1. Find a primary source or run an experiment.
2. Record the answer here with the date and the evidence.
3. Update the affected document.
4. If the answer changes a decision, write or supersede an ADR.

Do not close a question by deciding it probably does not matter.
