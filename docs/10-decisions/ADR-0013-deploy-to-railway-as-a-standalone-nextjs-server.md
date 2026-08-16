# ADR-0013 - Deploy to Railway as a standalone Next.js server

**Status:** SUPERSEDED by ADR-0015
**Superseded:** 2026-08-15
**Date:** 2026-08-15

## Context

The deliverable must be publicly demoable. A server is required for the Anthropic key and the proxy.

## Problem

Where does this run?

## Options considered

1. Vercel.
2. Railway.
3. A container on a generic host.

## Evidence

Railway is the stated preference and builds Next standalone output without special handling. It provides environment variables, a health check path and logs, which is the entire operational surface this project needs. The deciding factor is not the platform, it is deploying on day one: a deployment failure discovered at hour 40 is fatal, at hour 5 it is an inconvenience.

## Decision

**Option 2.** One Railway service, Next standalone output, health check at `/api/health`, one environment variable. An empty skeleton is deployed at T1.3 before any features exist and kept green throughout.

## Consequences

Positive: deployment risk is front-loaded and continuously verified; trivial operational surface.
Negative: single instance, so the in-memory cache is per-process, which is correct at this scale and would need revisiting at any other.

## Reversibility

**High.** A standalone Next server runs anywhere.

## Related tasks

T1.3, T7.2

---

## Superseded

Railway was rejected before implementation. The account already hosts a personal project and the free allowance would be shared. Render was chosen instead. The reasoning in this ADR about *when* to deploy (day one, before features) survives intact and carries over to ADR-0015; only the platform changed.

See **ADR-0015 - Deploy to Render, single staging environment, with a documented cold start**.
