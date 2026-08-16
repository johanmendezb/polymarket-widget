# AI SYSTEM

## 0. The design constraint that everything else follows from

The research is unambiguous and uncomfortable:

- Prediction market prices are a strong, well-calibrated baseline.
- Published 2026 evaluations of frontier LLMs trading real capital on Polymarket and Kalshi are **mostly negative**.
- The best documented AI forecasting system **underperformed market consensus on its own**, but **AI combined with market consensus beat consensus alone**.
- Live forward-looking tournaments show human professionals still beating bots by a widening margin, while AI-assisted humans improve substantially.

Full evidence with sources in `02-research/STRATEGY_RESEARCH.md` §A and `02-research/RESEARCH_SOURCES.md`.

Therefore the system is designed as **"AI adjusts the market price"**, not "AI replaces the market price", and its most valuable output is often **no bet**.

A product that confidently tells you to bet YES is easy to build and unsupported by the evidence. We are not building it.

---

## 1. Pipeline

```
market + outcome
      |
      v
[1] BLIND ELICITATION                      price is NOT in context
      k = 5 parallel calls
      web search enabled, sources must be dated
      tool-schema-enforced output
      |
      v
[2] AGGREGATE
      median of log-odds across samples
      dispersion = IQR of the k samples
      |
      v
[3] ANCHORED ELICITATION (diagnostic, k = 1)   price IS in context
      used only to compute the blind-vs-anchored delta
      never used for the displayed estimate
      |
      v
[4] BLEND
      p_display = inverse_logit( (1-w)·logit(p_market) + w·logit(p_blind) )
      w = 0.35, PRE-REGISTERED, never tuned on outcomes
      |
      v
[5] COST                                    from src/simulation, pure
      walk the book at the user's size
      apply the per-market taker fee
      effective cost per share
      |
      v
[6] GATE                                    11 rules, each with a citation
      |
      +--> NO_BET  + reason codes
      |
      +--> CONSIDER + edge + quarter-Kelly size
```

Steps 1 and 3 are the only model calls. Steps 2, 4, 5 and 6 are deterministic pure functions and are unit tested.

---

## 2. Why blind elicitation

If the market price is anywhere in the model's context, the estimate becomes an echo of the price and every downstream "edge" is an artifact of anchoring rather than a signal. This is the single largest correctness risk in the project (R-01).

Enforcement is architectural, not a convention:

```ts
// The blind prompt builder physically cannot see a price.
type BlindPromptInput = {
  question: string;
  resolutionCriteria: string;
  outcomeLabel: string;
  endDate: string | null;
  category: string | null;
  // no price, no bid, no ask, no midpoint, no outcomePrices, no spread
};
function buildBlindPrompt(input: BlindPromptInput): string;
```

And it is tested: a test asserts the assembled prompt string does not contain the market price rendered as a decimal to four places, as a percentage, or as a cent value.

**It is still leaky and we say so.** A market slug can contain a price-like token, a retrieved news article can quote the market odds, and a well-known market's price may be in the model's training data. We measure the leak rather than claim to have eliminated it: the blind-vs-anchored delta is computed on every forecast and displayed. A delta near zero means the model is echoing the market and the "edge" is not real.

---

## 3. Sampling and aggregation

- **k = 5** independent calls at temperature 1.
- Aggregate by the **median of log-odds**, which is robust to a single outlier sample and behaves correctly near the probability boundaries where the arithmetic mean does not.
- **Dispersion** is the interquartile range across the k samples. Sample dispersion predicts forecast error better than a model's own verbalized confidence, so this number, not the model's self-reported confidence, drives the gate.
- No extremizing. No fitted calibration layer. Both would be parameters chosen without data to fit them on, which is exactly the overfitting the evaluation plan forbids.

**Cost and latency.** Five parallel calls with web search is the dominant latency in the widget, hence the hard 45s timeout and hence the AI being user-invoked rather than firing on load. If the budget is tight, k = 3 is an acceptable degradation and must be recorded in `promptVersion`.

---

## 4. The abstention gate

**This is the most defensible component in the product** because it requires no resolved outcomes to be correct. It cannot be accused of contamination, cherry-picking or hindsight. It is arithmetic and stated thresholds.

| # | Rule | Reason code | Trigger | Grounding |
|---|---|---|---|---|
| 1 | Edge below cost | `EDGE_BELOW_COST` | `p_display − (avgFillPrice + feePerShare) <= 0` | Arithmetic on the verified fee formula |
| 2 | Spread too wide | `SPREAD_TOO_WIDE` | `(ask − bid)` exceeds the claimed edge | Median markets carry wide quoted spreads; only the top-volume stratum is tight |
| 3 | Insufficient depth | `INSUFFICIENT_DEPTH` | Filling the requested size moves the price beyond a threshold, or the book cannot fill it | Returns degraded from $10 to $1,000 order sizes in published simulation |
| 4 | Extreme price band | `EXTREME_PRICE_BAND` | `price < 0.10` or `> 0.90` | Sub-10c contracts lost more than 60% on Kalshi; spreads 3 to 4x wider below 0.10; Kelly explodes at the top end |
| 5 | Horizon too long | `HORIZON_TOO_LONG` | Resolution more than ~1 month out | Market compression toward 0.5 rises beyond one month; any model news advantage decays |
| 6 | Market too certain | `MARKET_TOO_CERTAIN` | Market price outside [0.30, 0.70] for a positive recommendation | LLMs were only competitive inside that band in the source's own conditional analysis |
| 7 | Thin evidence | `THIN_EVIDENCE` | Fewer than 5 relevant dated sources retrieved | The published condition under which LLM forecasts were competitive |
| 8 | High dispersion | `HIGH_MODEL_DISPERSION` | IQR of the k samples exceeds a threshold | Dispersion predicts error better than verbalized confidence |
| 9 | Ambiguous resolution | `AMBIGUOUS_RESOLUTION` | Resolution criteria are vague or depend on a subjective source | UMA disputes escalate over days; a 50-50 "unknown" resolution exists; measurable auto-resolution error rate |
| 10 | Near-expiry sports | `NEAR_EXPIRY_SPORTS` | Sports market inside its final minutes | Calibration becomes step-like and distorted late in sports markets |
| 11 | Not accepting orders | `MARKET_NOT_ACCEPTING_ORDERS` | `acceptingOrders === false` | Cannot price a fill |

Full citations for every threshold are in `02-research/STRATEGY_RESEARCH.md` §C3. **A reason code that cannot be traced to a cited threshold does not ship.** The UI links each fired reason to its justification.

**The gate must actually fire.** A gate that never rejects is decorative. Its firing rate and reason histogram are among the resolution-free diagnostics, and a deliberate rejection is scripted into the demo.

---

## 5. Output schema

Enforced through the Anthropic tool-use schema rather than requested in prose. A response that fails validation is retried once and then surfaces `AI_INVALID_OUTPUT`. It never partially renders.

```jsonc
{
  "probability": 0.63,              // required, 0..1
  "reasoning_summary": "string",    // <= 60 words
  "evidence": [                     // 0..8 items
    {
      "claim": "string",
      "source_url": "string",
      "source_title": "string",
      "published_at": "2026-08-02", // ISO date or null; null renders as "undated"
      "supports": "yes" | "no" | "context"
    }
  ],
  "risks": ["string"],              // 0..4
  "resolution_ambiguity": "low" | "medium" | "high",
  "insufficient_evidence": false    // model may declare it cannot answer
}
```

Notes:

- `probability` is the only number we consume. A model-reported confidence field is deliberately absent, because verbalized confidence is a worse error predictor than sample dispersion and including it would invite us to display it.
- `insufficient_evidence: true` is a first-class success path, not a failure. It maps to the `AI_NO_EVIDENCE` product state.
- `resolution_ambiguity` feeds gate rule 9.

---

## 6. Honesty rules

Non-negotiable. These are review criteria, not aspirations.

The system must never:

- fabricate a source, a URL or a publication date
- present a probability without its dispersion and its evidence
- render the AI estimate in the same visual register as the market price
- imply the data is live when it is stale
- describe a simulated bet in language that could be read as a real trade
- claim to have backtested anything it has not
- state or imply that it beats the market

Every forecast carries, and every forecast displays: a timestamp, the model id, the prompt version, the k value, the blend weight, the retrieved sources with dates, and the dispersion.

---

## 7. Failure modes and required handling

| Failure | Handling |
|---|---|
| Timeout at 45s | `AI_TIMEOUT`, "AI unavailable", retry offered, rest of widget fully usable |
| Schema violation | One retry, then `AI_INVALID_OUTPUT` |
| Zero or fewer than 5 dated sources | Gate rule 7 fires, or `AI_NO_EVIDENCE` if literally none. Never emit an unsourced probability. |
| Samples disagree wildly | Gate rule 8 fires. This is a correct outcome, not a bug. |
| Web search unavailable | Degrade to no-retrieval, set `promptVersion` accordingly, fire rule 7 |
| Anthropic API error or 429 | `UPSTREAM_UNAVAILABLE`, backoff, no retry storm |
| Blind-vs-anchored delta near zero | Display the anchoring warning. Do not suppress it. |

**In every one of these branches, market data and the cost preview render fully.** They are independent data paths. This is asserted by an E2E test that kills the AI route.

---

## 8. What we may and may not claim

Governed by `05-ai/EVALUATION.md` §B8. The short version, reproduced here because it is the thing most likely to be violated under time pressure:

**May:** "we score against the market price on the same market at the same frozen timestamp" · "our gate rejects X% of markets, here are the reasons and their citations" · "here is the edge net of the actual fee formula and the actual book at this size" · "published evidence indicates AI combined with market consensus outperforms consensus alone, and that is what we implemented" · "our forecasts were committed and hashed before resolution" · any resolution-free diagnostic at face value.

**May not:** any profitability claim · "our AI beats the market" · "our AI matches superforecasters" · any Brier score from markets that resolved before the model's training cutoff · any comparison to a published score from a different question set · any "X is better than Y" where the confidence interval on the difference includes zero · any result from a configuration chosen after seeing outcomes.

**Wording that will get us caught:** say "pipeline smoke test on resolved markets, contaminated" not "backtest" · "Brier score with its CI" not "accuracy" · "positive expected value under stated assumptions, unvalidated" not "profitable" · "paired Brier difference of d, CI [lo, hi]" not "beats the market" · show the reliability diagram **with bin counts** rather than saying "calibrated".
