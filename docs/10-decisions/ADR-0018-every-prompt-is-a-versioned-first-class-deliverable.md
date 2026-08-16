# ADR-0018 - Every prompt is a versioned, first-class deliverable

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The submission must include **all AI prompts**: both the prompts the running application sends to Claude, and the orchestration and planning prompts used to produce the repository itself.

This is unusual and worth taking seriously. It means the prompts are not implementation detail, they are part of what is being evaluated.

## Problem

Where do prompts live so that they are simultaneously the thing the code executes, the thing the reviewer reads, and the thing that gets versioned when it changes?

## Options considered

1. **Prompts as string literals in TypeScript**, with the spec document describing them in prose.
2. **Prompts as `.md` files in a top-level `prompts/` directory**, loaded at build time, with the spec document referencing them.
3. Prompts in a database or a remote prompt-management service.

## Evidence

Option 1 is the default and it has a specific failure mode for this project: the document and the code drift, and the reviewer reads the document. A prompt spec that describes a prompt the application does not actually send is worse than no spec.

Option 3 is infrastructure for a problem this project does not have, and it would make the prompts unreadable in the repository, which is the whole requirement.

Option 2 makes the file the reviewer reads and the string the code sends the same bytes. Drift becomes impossible rather than merely discouraged.

## Decision

**Option 2**, extended to cover the build prompts.

```
prompts/
  README.md                        index, versioning rules, provenance
  runtime/
    blind-v1.md                    the blind elicitation prompt
    anchored-v1.md                 the anchoring diagnostic prompt
    rank-v1.md                     market ranking (P2)
    submit_forecast.schema.json    the forced tool schema
  build/
    00-master-orchestrator.md      the prompt that started the project
    01-research-domain.md          Polymarket API research agent
    02-research-competitive.md     competitive and UX research agent
    03-research-strategy.md        forecasting and evaluation research agent
```

Rules:

- Runtime prompts are **loaded from these files** at build time. They are not duplicated as string literals. A test asserts the loaded text matches the file.
- A change to a runtime prompt is a **version bump**: `blind-v1.md` becomes `blind-v2.md`, and `promptVersion` on every forecast records which one produced it. Forecasts made under different prompt versions are never pooled in an evaluation.
- `docs/05-ai/AI_PROMPT_SPEC.md` explains **why** each constraint exists and links to the file. It never restates the prompt text.
- Build prompts are captured verbatim, as sent, including the ones that produced work that was later discarded.

## Consequences

Positive: the reviewer reads exactly what the model receives; prompt changes appear as file diffs in the PR, which is the correct review surface for them; the build prompts document the AI-assisted engineering process, which for this challenge is itself part of the subject matter.

Negative: a build-time file read to load the prompts, and a test to keep them honest; capturing build prompts verbatim means capturing the ones that produced dead ends, which is slightly uncomfortable and probably the most useful part of the record.

## Reversibility

**High.** Inlining the strings later is mechanical, and would lose the property that makes this worth doing.

## Related tasks

T5.1, T9.1, T9.4
