# Build prompt 00 - Master project orchestrator

**Sent:** 2026-08-15, T0
**Model:** claude-opus-5
**Produced:** the entire planning phase, which is to say every document in `docs/`

This is the prompt that started the project. It defines the orchestrator role, the evidence standard (VERIFIED / INFERRED / UNKNOWN / CONFLICTING), the knowledge system, the ADR discipline, the agent architecture, the time budget model, the testing requirements and the "impressive but honest" rule that everything downstream is measured against.

---

> **ACTION REQUIRED BEFORE SUBMISSION**
>
> Paste the original master prompt below this line, verbatim, from your own copy.
>
> It is deliberately not transcribed here. It is roughly ten thousand words, and a
> re-typed copy risks silent drift from the original. For a deliverable whose whole
> point is that the prompt and the artifact are the same bytes, an approximate copy
> would be the wrong artifact. You hold the canonical version.

```text
<paste the master orchestrator prompt here, verbatim>
```

---

## What it produced, and what it was overruled on

Recorded because the interesting part of a prompt is not what it asked for, it is where the work pushed back. Every deviation below was justified in an ADR rather than taken silently.

| The prompt asked for | What happened | Why |
|---|---|---|
| A monorepo as a strong default | Rejected | ADR-0001. One deployable, one consumer. A lint rule enforces the same boundaries for two hours less setup. |
| Railway deployment | Rejected mid-project | ADR-0015. Account constraint. Render instead, with the free-tier cold start disclosed rather than worked around. |
| Twelve documentation folders, roughly fifty files | Adopted selectively | Lean control layer first. Files were created when there was real content for them, rather than scaffolded as stubs. |
| Backtesting investigated as a first-class deliverable | Investigated and then refused | ADR-0007. The research found it invalid as evidence for an LLM. The refusal, with its reasoning, became more valuable than the backtest would have been. |
| Both prediction backtest and strategy simulation | Neither shipped | Replaced by a prospective hashed-manifest harness plus resolution-free diagnostics. |
| An AI that recommends a market and an outcome | Reframed | ADR-0006, ADR-0010. The evidence says AI alone underperforms the market. The product recommends, adjusts, or abstains, and abstention is a feature. |
| Parallel research agents in isolated workspaces | Two of three delegated | The domain stream was run inline. See `01-research-domain.md` for why, and for the finding that justified it. |

## The reason this file exists at all

The submission includes its own build prompts because for this challenge the engineering process is part of the subject matter. A reviewer can read `00` through `03` and reconstruct how a 48-hour plan was produced, including the parts where the plan argued with the prompt that created it.

That is a more useful artifact than a clean repository with no history of its own reasoning.
