# ADR-0014 - Container queries and an explicit theme parameter for embeddability

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

The widget is embedded in a host page, most likely inside a sandboxed iframe with a null origin.

## Problem

How do layout and theming work when the widget does not control, and cannot see, its host?

## Options considered

1. Media queries and CSS inheritance from the host.
2. Container queries plus an explicit theme parameter.
3. A fixed-size widget with internal scrolling.

## Evidence

A widget's width is not the viewport's width, so media queries key off the host page and produce wrong layouts. A properly sandboxed iframe isolates CSS in both directions, so theme cannot be inherited. It also has no `localStorage`, no `sessionStorage` and no cookies, so any dependency on them fails in the actual embedding case rather than in development.

## Decision

**Option 2.** `container-type: inline-size` on the widget root; every responsive rule is a container query. Theme arrives as `?theme=light|dark|auto` and drives `color-scheme`. No storage APIs anywhere; simulated positions are in-memory and the UI says they reset on reload. Height negotiation via ResizeObserver and postMessage is P2.

## Consequences

Positive: correct layout at any host width; theming works across the sandbox boundary; no runtime surprises in the real embedding case.
Negative: no persistence for simulated positions, which is disclosed rather than worked around; a media query anywhere in widget CSS is a bug, so it is banned by convention and checked in review.

## Reversibility

**High** for theming. **Low** for the storage constraint, which is imposed by the platform rather than chosen.

## Related tasks

T4.1
