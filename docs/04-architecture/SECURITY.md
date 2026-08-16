# SECURITY

## 1. Secrets

| Secret | Where it lives | Never |
|---|---|---|
| `ANTHROPIC_API_KEY` | Render environment variable, entered by a human, read only in `src/app/api/ai/*` | In a client component, in `NEXT_PUBLIC_*`, in a fixture, in a test snapshot, in a log line |

**There are no other secrets.** Every Polymarket endpoint this project uses is public and unauthenticated. That is a deliberate architectural benefit of the simulation-only scope, not an accident.

**CI check (mandatory).** After `pnpm build`, grep the client bundle for the key's prefix and for the literal string `ANTHROPIC`. A match fails the build. This is five lines of shell and it is the difference between "we were careful" and "we proved it".

## 2. What the client can reach

The browser can call only our own same-origin routes. It cannot call Polymarket, Anthropic, or anything else directly. Every outbound request originates from our server, where it can be validated, rate-limited and logged.

## 3. Input validation

- Every route parses its query and body with zod before doing anything.
- `tokenId` is validated as `/^\d+$/` and handled as a string throughout. It exceeds `Number.MAX_SAFE_INTEGER`.
- The proxy is **not** a generic pass-through. There is no `[...path]` route that forwards arbitrary upstream paths. Each of the four read routes constructs its own upstream URL from validated parameters. An open proxy would be an SSRF surface and a rate-limit liability.
- Search queries are length-bounded and passed as encoded query parameters only.

## 4. Output safety

- Model output is rendered as text, never as HTML. No `dangerouslySetInnerHTML` anywhere in the repository; enforced by an ESLint rule.
- Evidence URLs are rendered as links with `rel="noopener noreferrer"` and are displayed with their hostname visible, so a user can see where a citation actually points.
- Market descriptions and resolution criteria come from user-generated upstream content and are treated as untrusted text.

## 5. Embedding

- The widget is served with `Content-Security-Policy: frame-ancestors *` (intentional, it is a widget) and no cookies are set, so there is no CSRF surface.
- The widget assumes a sandboxed iframe with a null origin: no `localStorage`, no `sessionStorage`, no cookies. Depending on any of them is a bug, not a limitation.
- Theme arrives as an explicit URL parameter or `postMessage`. CSS does not cross the sandbox boundary in either direction.

## 6. Prompt injection

Market questions, descriptions and resolution criteria are attacker-controllable in principle: anyone can propose a market. Retrieved web pages certainly are.

Mitigations:

1. Untrusted upstream text is placed in clearly delimited blocks in the prompt and the system prompt states that content inside them is data, not instructions.
2. Output is constrained by a tool schema, so the blast radius of a successful injection is a wrong number inside a valid shape, not arbitrary behaviour.
3. The model has no tools that mutate anything. It cannot place an order, because no code path exists that places an order.
4. Evidence URLs are displayed to the user with their hostname, so a citation to an implausible source is visible.

Residual risk is a manipulated probability estimate. Accepted, disclosed, and partly mitigated by the k-sample dispersion check.

## 7. Geographic and compliance position

Polymarket restricts 39 countries including the United States, plus sub-national regions, and prohibits VPN circumvention. Details in `02-research/POLYMARKET_RESEARCH.md` §9.

**This project builds no mechanism to detect, circumvent or work around those restrictions.** It reads public market data and simulates. No order is ever placed, so no restricted activity occurs.

## 8. Live trading gate

Live execution is **not** in this project. Should it ever be built, every box below must be ticked first, in order. This list exists so that "let's just add a real trade button" is visibly a large project rather than a small one.

```
[ ] Domain research re-verified against current docs
[ ] Geographic eligibility check implemented and tested, server-side, fail-closed
[ ] Wallet architecture chosen and documented in an ADR
[ ] Authentication (L1 and L2) implemented server-side
[ ] Order signing implemented server-side; no key material in the browser, ever
[ ] Order lifecycle validated end to end against the real matching engine
[ ] Fill and fee model reconciled against actual executed trades, not simulated ones
[ ] Slippage model validated against real fills
[ ] Position sizing limits enforced server-side with a hard cap
[ ] Paper trading run for a meaningful period with reconciliation
[ ] Kill switch implemented and tested
[ ] Monitoring and alerting on order state, error rate and exposure
[ ] Failure recovery tested (partial fills, timeouts, matching engine restarts)
[ ] Full E2E test suite against a staging path
[ ] Independent security review
[ ] Explicit, informed, per-session user confirmation with the simulation/live
    distinction unmissable in the UI
```

`LiveExecutionProvider` does not exist as a file. A stub invites completion without this gate.

## 9. Dependency posture

Small dependency surface: Next, React, zod, Tailwind, the Anthropic SDK, and the test tooling. `pnpm audit` runs in CI. No dependency is added during the 48 hours without a one-line justification in the commit message.
