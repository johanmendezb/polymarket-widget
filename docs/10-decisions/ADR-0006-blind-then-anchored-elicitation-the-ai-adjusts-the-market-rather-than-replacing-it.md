# ADR-0006 - Blind-then-anchored elicitation; the AI adjusts the market rather than replacing it

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The central design question of the product: what relationship should the model's estimate have to the market price?

## Problem

If the price is in the model's context, the estimate anchors on it and any computed edge is an artifact. If the price is ignored entirely, we discard the strongest available signal.

## Options considered

1. Show the model the price and ask whether it agrees.
2. Elicit blind and display the blind estimate as the answer.
3. Elicit blind, then blend with the market at a pre-registered weight, and separately run an anchored call purely as a diagnostic.

## Evidence

The best documented AI forecasting system underperformed market consensus on its own, while an ensemble of AI and market consensus beat consensus alone. Separately, instructing a model to suppress knowledge does not reliably work, so anchoring must be prevented structurally rather than by instruction. Sources in `02-research/STRATEGY_RESEARCH.md` §A2 and §D1.

## Decision

**Option 3.** `p_display = inverse_logit((1-w)·logit(p_market) + w·logit(p_blind))` with `w = 0.35`, pre-registered and never tuned on outcomes. The blind prompt's input type has no price field. The anchored call runs once and is used only to compute and display the blind-vs-anchored delta.

## Consequences

Positive: directly implements the one robust published positive finding; anchoring becomes measurable instead of assumed away; the pre-registered weight is a defence against post-hoc fitting.
Negative: two elicitation paths cost latency and tokens; `w = 0.35` is a judgment call, and we say so rather than pretending it was derived.

## Reversibility

**High** for `w`, though changing it after seeing outcomes invalidates every subsequent claim and is explicitly forbidden.

## Related tasks

T5.1, T5.2, T5.3
