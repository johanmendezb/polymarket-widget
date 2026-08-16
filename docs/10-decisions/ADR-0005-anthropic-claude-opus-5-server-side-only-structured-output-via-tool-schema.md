# ADR-0005 - Anthropic claude-opus-5, server-side only, structured output via tool schema

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The AI layer needs a provider. An API key is available for Anthropic. Model output must be machine-consumable and safe to render.

## Problem

Which provider, called from where, and how do we guarantee the output shape?

## Options considered

1. Client-side calls with a public key.
2. Server-side route, prose output parsed with a regex or a JSON block.
3. Server-side route, output constrained by a forced tool schema.

## Evidence

A client-side key is an immediate credential leak. Prose parsing fails unpredictably and the failure mode is a partially rendered, plausible-looking wrong answer. A forced tool schema turns a malformed response into a caught validation error with a defined retry policy.

## Decision

**Option 3.** `claude-opus-5`, called only from `src/app/api/ai/*`, with `tool_choice` forcing `submit_forecast`. A schema violation retries once, then surfaces `AI_INVALID_OUTPUT`. CI greps the built bundle for the key and fails on a match.

## Consequences

Positive: the key cannot reach the browser and we prove it in CI; malformed output is a handled state, never a partial render; the provider is swappable behind one module.
Negative: server-side calls add latency; five parallel calls with web search is the widget's slowest operation, which is why it is user-invoked with a hard timeout.

## Reversibility

**High.** The provider is isolated behind `src/ai`. The tool schema is provider-shaped but the concept is portable.

## Related tasks

T5.2, T5.3
