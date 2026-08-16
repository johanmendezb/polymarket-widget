# PROMPTS

Every prompt this project uses, and every prompt used to build it. Governed by ADR-0018.

For this challenge the prompts are not implementation detail. They are part of what is being submitted, so they live here as first-class artifacts rather than as string literals buried in the source.

---

## Runtime prompts

What the application actually sends to Claude. **These files are loaded at build time and interpolated. They are not duplicated as string literals in `src/`.** A test asserts the loaded text is byte-identical to the file, so the thing you read here and the thing the model receives cannot drift.

| File | Version | Purpose | k | Consumed by |
|---|---|---|---|---|
| `runtime/blind-v1.md` | blind-v1 | The forecast. Elicited with the market price **structurally absent** from the input type. | 5 | `src/ai/prompts.ts`, `POST /api/ai/forecast` |
| `runtime/anchored-v1.md` | anchored-v1 | Diagnostic only. Same prompt with the price added, to measure how much the estimate moves. Never displayed as the estimate, never enters the blend. | 1 | same |
| `runtime/rank-v1.md` | rank-v1 | P2, may be cut. Ranks candidate markets by where an outside view is most likely to be informative. Deliberately given no prices. | 1 | `POST /api/ai/rank` |
| `runtime/submit_forecast.schema.json` | - | The forced tool schema. `tool_choice` requires it; prose responses are not accepted. | - | all forecast calls |

### Versioning

A change to a runtime prompt is a **version bump, not an edit**: `blind-v1.md` becomes `blind-v2.md`. The version is derived from the filename, so it cannot be forgotten. Every forecast records its `promptVersion`, and forecasts made under different versions are never pooled in an evaluation.

`docs/05-ai/AI_PROMPT_SPEC.md` explains why each constraint is present. It links to these files and never restates their text.

### The two constraints that matter most

**Blindness is structural, not instructed.** `blind-v1.md` asks the model to ignore market odds, and that instruction alone would not be enough: published work shows that telling a model to suppress knowledge does not reliably work. The real defence is that `BlindPromptInput` has no price field, so there is nothing for the template to interpolate. A test asserts the assembled prompt contains no rendering of the price in any format. See risk R-01.

**Abstention is a first-class output.** `insufficient_evidence: true` is a success path in the schema, not an error. "I could not find sources I trust for this question" is a correct answer and the product renders it as one.

### Deliberately absent

No confidence instruction. No persona. No extremizing. No self-reported confidence field. Measured effects of popular prompt techniques on forecast calibration are small at best and several are actively harmful, so only the grounded ones are used, and we do not claim the prompt made the forecasts better. Uncertainty is measured as dispersion across k samples, which predicts error better than a model's own confidence claim.

---

## Build prompts

The prompts that produced this repository. Captured verbatim as sent, including the ones whose output was later discarded or overruled.

| File | Sent | Produced |
|---|---|---|
| `build/00-master-orchestrator.md` | T0 | The whole planning phase. Defines the orchestrator role, the evidence standard, the knowledge system and the honesty rules. |
| `build/01-research-domain.md` | T0+0h | `POLYMARKET_RESEARCH.md`, the domain model, the execution model. Run inline rather than delegated, and the file explains why. |
| `build/02-research-competitive.md` | T0+0h | `COMPETITIVE_RESEARCH.md`, `UX_RESEARCH.md`, 58 source records. Delegated. |
| `build/03-research-strategy.md` | T0+0h | `STRATEGY_RESEARCH.md`, `EVALUATION.md`, 33 source records. Delegated. **This is the one that changed the product.** |

`02` and `03` ran in parallel while `01` ran in the orchestrator session.

### Why these are in the submission

The challenge is an AI-assisted engineering exercise, so how the AI was directed is part of the work. Reading `00` through `03` in order shows a 48-hour plan being produced, and shows the places where the research contradicted the prompt that commissioned it. `build/00` records seven such places, the largest being the decision to investigate backtesting thoroughly and then refuse to ship one.

A repository with no record of its own reasoning is a weaker artifact than one that shows where it argued with itself.

---

## Rules

1. A runtime prompt is loaded from this directory. It is never a string literal in `src/`.
2. Changing a runtime prompt means a new file and a new version. Never an in-place edit.
3. `promptVersion` on every forecast names a file that exists here.
4. Build prompts are verbatim. Not summarised, not tidied, not retrospectively improved.
5. No prompt contains a secret, a key, or anything resembling one.
6. Untrusted third-party text (market questions, resolution criteria, retrieved pages) is placed in clearly delimited blocks that the prompt declares to be data rather than instructions. See `docs/04-architecture/SECURITY.md` §6.
