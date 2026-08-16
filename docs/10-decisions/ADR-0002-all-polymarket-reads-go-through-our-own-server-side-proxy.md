# ADR-0002 - All Polymarket reads go through our own server-side proxy

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The widget is embeddable, so it may run on any origin. Polymarket's CORS behaviour from an arbitrary origin is undocumented and untested. Rate limits are also undocumented. Separately, the Anthropic key forces us to have a server regardless.

## Problem

Should the browser call Polymarket directly, or should every read pass through route handlers we control?

## Options considered

1. **Browser calls Polymarket directly.** Fewer hops, no server needed for reads.
2. **Server-side proxy** with four purpose-built read routes.
3. **Generic pass-through proxy** forwarding arbitrary upstream paths.

## Evidence

OQ-01 records that CORS behaviour is unknown. OQ-02 records that rate limits are undocumented. A widget whose premise is embedding cannot carry an unresolved cross-origin question on its critical path. A generic pass-through would be an SSRF surface and would make caching and validation impossible to reason about.

## Decision

**Option 2.** Four purpose-built routes: `/api/polymarket/{search,market/[id],book,history}`. Each constructs its own upstream URL from validated parameters. No generic forwarding route exists.

## Consequences

Positive: CORS becomes a non-question rather than a resolved question; one place to cache, coalesce and back off; one zod validation boundary so an upstream shape change fails loudly once; no third-party host appears in the client's network tab.
Negative: one extra hop of latency; the server must stay up for the widget to work at all; four routes to maintain.

## Reversibility

**Medium.** Removing the proxy would require answering OQ-01 empirically and reimplementing caching client-side. There is no reason to.

## Related tasks

T3.3, T3.4
