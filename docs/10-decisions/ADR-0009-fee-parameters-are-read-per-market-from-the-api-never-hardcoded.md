# ADR-0009 - Fee parameters are read per market from the API, never hardcoded

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

Polymarket charges takers `fee = C × feeRate × p × (1 − p)`. The rate varies from 0 to 0.07 by category. Much of the public web, including material dated 2026, still describes Polymarket as fee-free.

## Problem

Where does `feeRate` come from at runtime?

## Options considered

1. A hardcoded constant.
2. A category lookup table in our code.
3. Per-market fields from the API, with the category table as an explicitly labelled fallback.

## Evidence

The market object exposes `feesEnabled`, `feeType`, `feeSchedule`, `makerBaseFee` and `takerBaseFee`; the CLOB exposes fee-rate endpoints. Global and US schedules may differ (OQ-04, CONFLICTING), so any table we embed is a guess about which entity we are talking to.

## Decision

**Option 3.** `FeeConfig` carries a `source` field: `market-object`, `clob-fee-rate-endpoint`, or `category-fallback`. When the source is the fallback, the UI labels the fee as estimated.

## Consequences

Positive: correct across categories and entities; a schedule change does not require a code change; the UI never presents a guess as a fact.
Negative: an extra field to map and one more branch to test.

## Reversibility

**High**, but reverting would reintroduce R-03, the highest-likelihood correctness risk in the project.

## Related tasks

T2.3, T3.2, T4.3
