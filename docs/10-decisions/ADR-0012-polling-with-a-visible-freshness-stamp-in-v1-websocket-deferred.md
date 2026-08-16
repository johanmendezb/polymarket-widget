# ADR-0012 - Polling with a visible freshness stamp in v1; WebSocket deferred

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

Polymarket exposes a public WebSocket market channel with book, price change and last trade messages.

## Problem

Do we need live streaming prices for a five-minute demo?

## Options considered

1. WebSocket streaming from the start.
2. Polling with a visible freshness indicator.
3. Static prices fetched once.

## Evidence

The WebSocket requires connection lifecycle management, reconnection, backpressure handling and a `PING` every 10 seconds. That is real work for a surface whose demo lasts five minutes. Polling is also more honest: an "updated 3s ago" stamp tells the user exactly how stale the number is, which streaming tends to hide behind the impression of liveness.

## Decision

**Option 2.** Poll the book on an interval while the order ticket is open, with a visible freshness stamp and a 200 to 300ms transition on change. Never flash a skeleton over a price the user is reading.

## Consequences

Positive: hours saved; staleness is explicit rather than implied; fewer failure modes.
Negative: not real-time, and a reviewer may notice; mitigated by the freshness stamp making the tradeoff visible rather than hidden.

## Reversibility

**High.** The WebSocket is the first post-challenge addition and is documented as such.

## Related tasks

T4.3, T4.4
