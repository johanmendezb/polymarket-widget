# ADR-0015 - Deploy to Render, single staging environment, with a documented cold start

**Status:** ACCEPTED
**Date:** 2026-08-15
**Supersedes:** ADR-0013

## Context

The project needs one publicly reachable URL for the demo and for per-epic QA acceptance. ADR-0013 selected Railway. That account already hosts a personal project and its free allowance would be shared with it. Render is the replacement.

Separately: this project has **one environment**. There is no production, no preview-per-branch, no environment promotion. Everything is staging.

## Problem

Where does this run, how many environments does it need, and what does the platform's free tier do to the demo?

## Options considered

1. **Render free web service, single staging environment.**
2. Render with separate staging and production services.
3. A static export on a CDN, with the API elsewhere.

## Evidence

Render builds Next standalone output from a repo with a build and a start command, provides environment variables, a health check path and deploy-on-push from GitHub, which is the whole operational surface this project needs.

**The cost that matters: a free Render web service spins down after roughly 15 minutes without inbound traffic, and the next request pays a cold start of tens of seconds.** For a five-minute demo where the first impression is the load, that is not a footnote. It is a rehearsal step.

A second environment would double the configuration surface and the secret management for a 48-hour challenge with one reviewer and one demo. There is nothing to promote *to*.

Option 3 is unavailable: the AI key and the Polymarket proxy both require a server, per ADR-0002 and ADR-0005.

## Decision

**Option 1.** One Render web service, free tier, named `polymarket-widget-staging`, deploying automatically from `main`. Next standalone output. Health check path `/api/health`.

The cold start is handled in three places rather than hidden:

1. **Documented** in `08-operations/ENVIRONMENT.md`, in the README, and in the delivery note for every epic.
2. **Rehearsed**: `09-demo/DEMO_SCRIPT.md` gains a mandatory pre-flight step that warms the service and confirms a warm response before the demo begins.
3. **Visible**: `/api/health` reports `uptimeSeconds`, so a low value tells you the instance just woke.

We do **not** add a keep-alive pinger. It would burn the free allowance to work around a limitation we have chosen to disclose, and a reviewer who finds a cron job whose only job is defeating the hosting tier learns something worse about the project than a documented cold start does.

## Consequences

Positive: one environment, one set of secrets, one deploy path; deploy-on-push from `main` means every accepted epic is live for QA without a manual step; the operational surface stays honest to the scale of the project.

Negative: the first request after idle is slow, which must be rehearsed around; no production/staging separation, so a bad merge to `main` is immediately the thing the reviewer sees, which is why the epic QA gate in ADR-0017 exists; free tier resources are modest, though the workload is four cached GETs and one AI call.

## Reversibility

**High.** A standalone Next server runs anywhere. Moving to a paid tier removes the cold start with no code change. Adding a production environment later is a second service and a second set of variables.

## Related tasks

T1.3, T7.2, T9.2
