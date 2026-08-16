# ADR-0008 - Fills are priced by walking the order book, never by midpoint

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

A simulated bet needs a price. The cheap option is the displayed probability or the midpoint.

## Problem

What price does a simulated market buy actually execute at?

## Options considered

1. Displayed probability from the market object.
2. Midpoint of best bid and best ask.
3. Volume-weighted average price from walking the ask side at the requested size.

## Evidence

Full book depth is public via `clob /book` (VERIFIED live 2026-08-15). Polymarket's own guidance is to walk the book to estimate price impact. Published results show returns degrading as order size rises from $10 to $1,000, which is precisely the effect a midpoint model erases.

## Decision

**Option 3.** `walkBook` consumes ask levels from best price upward. `averagePrice` is the VWAP across the consumed legs. `priceImpact = averagePrice − topOfBookPrice`. Partial fills are a normal state, not an error.

## Consequences

Positive: the core differentiator, and it is arithmetic a reviewer can check on screen; makes insufficient depth a visible product state rather than a hidden inaccuracy.
Negative: one extra API call per preview; more edge cases (empty book, thin book, oversized request), each of which is a required test.

## Reversibility

**Low.** Reverting to midpoint pricing would remove the reason the product exists.

## Related tasks

T2.2, T2.4, T4.3
