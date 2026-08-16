# ADR-0003 - ExecutionProvider interface with only a simulation implementation

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The brief asks for simulated bets. The project should plausibly evolve toward real execution without a rewrite, and the architecture should make that seam visible.

## Problem

How do we express the simulation/live boundary without building, or appearing to build, live trading?

## Options considered

1. No abstraction; simulation logic inline in the UI.
2. `ExecutionProvider` interface with `SimulationExecutionProvider` shipped and `LiveExecutionProvider` present as a stub that throws.
3. `ExecutionProvider` interface with only the simulation implementation, and no live file at all.

## Evidence

A stub file named `LiveExecutionProvider` is an invitation to fill it in. The gate in `SECURITY.md` §8 has sixteen items; a file that looks one function away from working undermines it. Inline logic, meanwhile, would make the simulation/live distinction invisible in the code and unusable in the UI.

## Decision

**Option 3.** The interface exists and the UI renders `provider.mode`. `LiveExecutionProvider` does not exist as a file.

## Consequences

Positive: the seam is real and demonstrable; the UI label is derived from the provider rather than hardcoded; nobody can accidentally complete live trading.
Negative: a reviewer might ask where the live implementation is, which is a question we want to be asked, since the answer is the gate checklist.

## Reversibility

**High.** Adding an implementation is additive by design, though it is deliberately gated behind sixteen prerequisites.

## Related tasks

T2.2, T4.3
