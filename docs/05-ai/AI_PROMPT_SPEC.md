# AI PROMPT SPEC

Prompt versions are recorded on every forecast (`promptVersion`) and any change to the text below is a version bump. Forecasts made under different prompt versions are never pooled in an evaluation.

---

## `blind-v1` - the blind elicitation prompt

**Input type:** `BlindPromptInput`. It has no price field. That is enforced by the type system and by a test.

```
You are a careful forecaster. Estimate the probability that a specific event
occurs, as described by the resolution criteria below.

QUESTION
{question}

OUTCOME YOU ARE ESTIMATING
{outcomeLabel}

RESOLUTION CRITERIA
{resolutionCriteria}

RESOLUTION DATE
{endDate}

CATEGORY
{category}

TODAY IS
{todayIso}

METHOD
1. Identify the reference class. What is the base rate for events of this kind?
2. Search for recent, dated evidence. Prefer primary sources and reporting with
   explicit publication dates. Note the date of every source you use.
3. Consider the strongest case FOR the outcome and the strongest case AGAINST it.
   Give both genuine weight.
4. Read the resolution criteria literally. Many forecasting errors are not errors
   about the world; they are errors about what the question is actually asking.
   If the criteria are ambiguous, say so.
5. Adjust from the base rate using the evidence. Do not overreact to the most
   recent headline.
6. State your probability.

CONSTRAINTS
- Do not search for, reference, infer, or reason about betting odds, prediction
  market prices, or bookmaker lines for this question. If you encounter them in
  a source, ignore them and do not let them influence your estimate. Your value
  here comes from being independent of the market.
- Every factual claim you make must have a source with a URL. If you cannot
  source a claim, do not make it.
- If you cannot find at least a few relevant, dated sources, set
  insufficient_evidence to true. That is a correct and useful answer.
- Do not express false precision. A probability of 0.6 and a probability of 0.62
  are the same claim unless you can say what distinguishes them.

Return your answer using the submit_forecast tool.
```

### Why each constraint is there

| Constraint | Reason |
|---|---|
| Reference class first | Base-rate anchoring is one of the few scaffolding techniques with a measurable effect on calibration |
| Both sides, genuine weight | Counters one-sided reasoning and acquiescence bias |
| Read the criteria literally | Resolution-criteria misreading is a large share of forecasting error and is what gate rule 9 exists for |
| Ignore market odds | The primary defence against R-01 anchoring collapse, layered on top of the structural defence |
| Source every claim | Prevents the citation-graveyard pattern where unsourced inference blends invisibly with sourced fact |
| `insufficient_evidence` is allowed | Makes abstention a first-class model output rather than something we bolt on afterward |
| No false precision | Guards against the appearance of rigour we cannot support |

**Deliberately absent:** any instruction to be confident, any persona ("you are a superforecaster who beats markets"), any extremizing instruction, and any request for a self-reported confidence score. Measured effects of popular prompt techniques on forecast calibration are small at best and several are actively harmful, so we use only the ones with grounding and we do not claim the prompt made the forecasts better.

---

## `anchored-v1` - the diagnostic prompt

Identical to `blind-v1` with two changes: the constraint about ignoring market odds is removed, and a block is added:

```
MARKET CONTEXT
A prediction market currently prices this outcome at {marketProbability}.
```

Run once (k = 1). **Its output is never displayed as the estimate and never enters the blend.** Its only use is:

```
blindVsAnchoredDelta = |p_blind − p_anchored|
```

A small delta means the blind estimate was already close to the market, which is the expected and healthy case. A delta near zero *across many markets*, combined with a `p_blind − p_market` distribution that spikes at zero, means the model is echoing rather than forecasting, and the widget says so.

---

## `rank-v1` - market ranking (P2, may be cut)

Used by "Ask AI to help me pick". Given a list of candidate markets with question, category, close date, volume and spread, and **no prices**, return the markets ranked by where an independent view is most likely to be informative, with a one-line reason each.

The ranking criterion is explicitly *not* "where is the biggest edge". It is "where is a second opinion most likely to be useful", which is a question about the market's tractability, evidence availability and time horizon, not about its price.

---

## Tool schema

```jsonc
{
  "name": "submit_forecast",
  "description": "Submit a calibrated probability estimate with dated evidence.",
  "input_schema": {
    "type": "object",
    "properties": {
      "probability":          { "type": "number", "minimum": 0, "maximum": 1 },
      "reasoning_summary":    { "type": "string", "maxLength": 400 },
      "evidence": {
        "type": "array", "maxItems": 8,
        "items": {
          "type": "object",
          "properties": {
            "claim":        { "type": "string", "maxLength": 240 },
            "source_url":   { "type": "string" },
            "source_title": { "type": "string" },
            "published_at": { "type": ["string", "null"] },
            "supports":     { "type": "string", "enum": ["yes", "no", "context"] }
          },
          "required": ["claim", "source_url", "source_title", "supports"]
        }
      },
      "risks":                { "type": "array", "maxItems": 4, "items": { "type": "string" } },
      "resolution_ambiguity": { "type": "string", "enum": ["low", "medium", "high"] },
      "insufficient_evidence":{ "type": "boolean" }
    },
    "required": ["probability", "reasoning_summary", "evidence",
                 "resolution_ambiguity", "insufficient_evidence"]
  }
}
```

`tool_choice` forces the tool. Prose responses are not accepted.

---

## Determinism and record-keeping

Every forecast stores: `promptVersion`, `modelId`, `k`, temperature, the full retrieved source list with dates, all k raw samples, the aggregation method, and the blend weight.

The blend weight `w = 0.35` is **pre-registered**. It is written here, in the repository, before any evaluation runs. Changing it after seeing outcomes invalidates every subsequent claim and is explicitly forbidden by `05-ai/EVALUATION.md` §B8.

---

## Prompt test requirements

| Test | Asserts |
|---|---|
| `blind prompt contains no price` | The assembled string does not contain the market price as a 4dp decimal, as an integer percentage, or as a cent value, for a fixture market |
| `blind prompt input type has no price field` | Compile-time; a deliberate attempt to pass a price fails typecheck |
| `tool schema rejects out-of-range probability` | `probability: 1.4` fails validation |
| `insufficient_evidence maps to the no-evidence state` | Route returns `AI_NO_EVIDENCE` rather than a probability |
| `prompt version is recorded on every forecast` | Present and non-empty in the response |
