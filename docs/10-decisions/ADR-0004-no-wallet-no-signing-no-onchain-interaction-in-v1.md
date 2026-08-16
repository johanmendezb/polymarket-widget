# ADR-0004 - No wallet, no signing, no onchain interaction in v1

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

Polymarket trading requires a wallet, L1 and L2 authentication and order signing. It is also geographically restricted in 39 countries including the United States.

## Problem

Does the challenge need wallet integration?

## Options considered

1. Full wallet connect and signing.
2. Wallet connect for identity only, with simulated execution.
3. No wallet at all.

## Evidence

Every read endpoint this project uses is public and unauthenticated (VERIFIED 2026-08-15). Simulation needs no account, no balance and no signature. A wallet connect button with no trading behind it implies a capability we do not have, which conflicts directly with the honesty rules. Polymarket also blocks the United States, so a reviewer there could not use a wallet-gated widget at all.

## Decision

**Option 3.** No wallet. Bankroll for sizing is a user-entered notional, clearly labelled as notional.

## Consequences

Positive: hours saved; no key material anywhere; no geographic entanglement; the widget is usable by a reviewer in any jurisdiction.
Negative: no real balance, so position sizing is advisory; some reviewers equate wallet integration with completeness, which is addressed in the tradeoffs document.

## Reversibility

**High.** Wallet integration is a prerequisite of the live gate, not a change to existing code.

## Related tasks

T4.3
