# ADR-0007 - A prospective hashed-manifest harness instead of a retrospective backtest

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The project should demonstrate that its forecasts can be evaluated. The obvious move is to backtest on resolved markets.

## Problem

Is a retrospective backtest valid evidence of forecasting skill for an LLM?

## Options considered

1. Retrospective backtest on resolved markets, reported as performance.
2. Retrospective run labelled as contaminated, plus a prospective harness.
3. Prospective harness only, plus resolution-free diagnostics.

## Evidence

Instructing a model to suppress post-cutoff knowledge leaves a measured 52 percent performance gap versus genuine ignorance across 477 questions and 9 models; chain-of-thought does not fix it and reasoning-optimised models are worse. The authors call retrospective simulated-ignorance setups methodologically flawed. Full citation in `05-ai/EVALUATION.md` §B5.

## Decision

**Option 3**, with option 2 available if time allows and only under the label "pipeline smoke test on resolved markets, contaminated". Forecasts are frozen into a JSONL manifest, SHA-256 hashed, and the hash is committed and displayed. Resolution-free diagnostics carry the demo.

## Consequences

Positive: the strongest available honesty signal, and it costs about ten lines of code; immune to contamination and to cherry-picking; the diagnostics are demoable on day one.
Negative: no headline performance number, ever. A reviewer expecting one has to be told why it would be meaningless, which is itself the argument.

## Reversibility

**Low, and deliberately so.** Reversing this means making claims we have said we will not make.

## Related tasks

T8.1, T8.2, T8.3
