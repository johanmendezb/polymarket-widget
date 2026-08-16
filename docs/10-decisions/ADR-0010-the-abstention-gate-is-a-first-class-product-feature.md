# ADR-0010 - The abstention gate is a first-class product feature

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

Most AI betting tools always produce a recommendation. The evidence suggests that on most markets, no recommendation is the correct output.

## Problem

Should "no bet" be an error state, a hidden filter, or a headline feature?

## Options considered

1. Always recommend; surface a confidence score instead.
2. Filter unsuitable markets out of search silently.
3. Show the market, evaluate it, and display NO_BET with enumerated reason codes.

## Evidence

Eleven filters are defensible from cited thresholds and all eleven inputs are available from the API at request time. Critically, the gate requires no resolved outcomes to be correct, so it cannot be accused of contamination, hindsight or cherry-picking. Rules and citations in `02-research/STRATEGY_RESEARCH.md` §C3.

## Decision

**Option 3.** Eleven rules, each with a named reason code and a threshold constant carrying a source comment. Every reason that fires is returned, not just the first. A deliberate rejection is scripted into the demo.

## Consequences

Positive: the most defensible component in the product; turns a limitation into a feature; visibly distinguishes the product from tools that always say yes.
Negative: a gate that never fires is decorative, so its firing rate is itself a shipped diagnostic; eleven rules is more surface than three.

## Reversibility

**High.** Thresholds are named constants. They must not be loosened to make the product look more decisive.

## Related tasks

T2.6, T5.3, T5.4
