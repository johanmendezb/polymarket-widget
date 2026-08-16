# SCOPE: CHALLENGE / MVP / VISION

Three concentric scopes. The 48-hour challenge is the innermost. Vision creep into the challenge is the single most likely cause of failure, so the boundaries are written down before any code exists.

---

## 48-HOUR CHALLENGE (what ships)

**The golden path, finished, plus one credibility feature.**

- Live market search and category chips
- Market detail: probability, freshness stamp, resolution criteria, outcome selector, order book disclosure, sparkline
- User-invoked AI second opinion: blind k-sample elicitation, enforced schema, dated evidence, range not point estimate, visually separate from the market number
- Abstention gate with reason codes
- Order-book-walked fill estimate with the real per-market taker fee
- Five-line order preview and the cost waterfall
- Simulated position, labelled as such at the point of commitment
- Loading, empty, error and insufficient-depth states throughout
- Unit, integration and one E2E golden path test
- Deployed to Render (single staging environment) with a health check
- README, ADRs, claims policy

**One of these two, whichever survives the time budget** (both are P2, cut in this order):
- Quarter-Kelly sizing panel
- Frozen, hashed prediction manifest CLI plus the resolution-free diagnostics view

---

## MVP (the next two weeks, not this weekend)

Everything above, plus:

- WebSocket live prices replacing polling
- Sell and close simulated positions
- Persisted simulated portfolio with PnL over time
- Multi-market AI ranking ("which of these is worth a second opinion")
- The evaluation harness running on a schedule, accumulating resolved pairs, with a public results page carrying its own confidence intervals
- Full multi-outcome and negRisk handling including group coherence checks
- Embeddable script tag with height negotiation and a documented host API
- Rate-limit-aware caching layer with observable hit rates

---

## VISION (what this becomes if it is real)

- **Live execution provider.** The `ExecutionProvider` interface exists from day one precisely so this is an addition rather than a rewrite. Gated by the checklist in `04-architecture/SECURITY.md`.
- **Calibration as a public artifact.** A continuously updated, tamper-evident record of the system's forecasts and their outcomes. The product's credibility compounds instead of being asserted.
- **Negative-risk arbitrage detection.** Group prices that fail to sum correctly are a real, mechanically detectable mispricing. This is the one place where an automated system plausibly has an edge that does not depend on out-forecasting humans.
- **Evidence-first market discovery.** Rank markets by where an outside view most disagrees with the crowd, rather than by volume.
- **Host-configurable widget.** Publishers embed it with their own theme and market selection.

---

## The cut order

When we fall behind, cut in this exact sequence. Do not improvise.

```
1. Cut P3 entirely                          (nothing P3 is in the challenge scope anyway)
2. Cut FR-5.1/5.2  (harness + diagnostics)
3. Cut FR-4.9      (Kelly sizing)
4. Cut FR-4.8      (cost waterfall view; the arithmetic still runs in the preview)
5. Cut FR-3.8      (blind-vs-anchored diagnostic display; still computed, just not shown)
6. Cut FR-1.5      (AI market ranking)
7. Cut FR-2.5      (sparkline)
8. Cut FR-1.3      (category chips)
9. Simplify FR-3.7 (gate) to three reason codes instead of eleven
```

**Never cut, under any circumstance:**

- The golden path working end to end
- The correct fee in the preview
- The order-book walk
- The simulated-not-real labelling
- Error and empty states on the golden path
- The E2E test
- The claims policy

Rationale: a smaller product that is correct and honest scores better against the stated success criteria than a larger one that is neither. The four beliefs in `PROJECT_CHARTER.md` §Success criteria are all reachable with the never-cut list alone.

---

## Scope change protocol

Any addition to the challenge scope must answer, in writing, in `CHANGELOG.md`:

1. What changed?
2. Why now, rather than in the MVP?
3. What is the time cost, in hours?
4. **What is being removed to pay for it?**
5. Which documents change as a result?

An addition with no corresponding removal is refused by default.
