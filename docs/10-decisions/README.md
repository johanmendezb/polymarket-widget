# ADR INDEX

Architecture Decision Records. Every decision of consequence, including the ones where the less impressive option was chosen deliberately.

| ADR | Title | Status |
|---|---|---|
| 0001 | Single Next.js application, not a monorepo | ACCEPTED |
| 0002 | All Polymarket reads go through our own server-side proxy | ACCEPTED |
| 0003 | ExecutionProvider interface with only a simulation implementation | ACCEPTED |
| 0004 | No wallet, no signing, no onchain interaction in v1 | ACCEPTED |
| 0005 | Anthropic claude-opus-5, server-side only, structured output via tool schema | ACCEPTED |
| 0006 | Blind-then-anchored elicitation; the AI adjusts the market rather than replacing it | ACCEPTED |
| 0007 | A prospective hashed-manifest harness instead of a retrospective backtest | ACCEPTED |
| 0008 | Fills are priced by walking the order book, never by midpoint | ACCEPTED |
| 0009 | Fee parameters are read per market from the API, never hardcoded | ACCEPTED |
| 0010 | The abstention gate is a first-class product feature | ACCEPTED |
| 0011 | Vitest, MSW and Playwright, with fixtures recorded from live responses | ACCEPTED |
| 0012 | Polling with a visible freshness stamp in v1; WebSocket deferred | ACCEPTED |
| 0013 | Deploy to Railway as a standalone Next.js server | SUPERSEDED by 0015 |
| 0015 | Deploy to Render, single staging environment, with a documented cold start | ACCEPTED |
| 0016 | Secrets live only in GitHub and Render, never in the repository or a conversation | ACCEPTED |
| 0017 | Every epic passes a human QA acceptance gate before it counts as delivered | ACCEPTED |
| 0018 | Every prompt is a versioned, first-class deliverable | ACCEPTED |
| 0014 | Container queries and an explicit theme parameter for embeddability | ACCEPTED |

## When to write an ADR

Write one for: a stack choice, an API boundary, a wallet or execution strategy, a prediction or evaluation methodology, a storage decision, a deployment shape, an AI provider or elicitation design, a testing architecture, or a real-time data strategy.

Do not write one for an implementation detail that a future reader would never think to question.

## Format

```
ADR-XXXX - Title
Status: PROPOSED | ACCEPTED | SUPERSEDED | REJECTED
Context / Problem / Options considered / Evidence / Decision /
Consequences / Reversibility / Related tasks
```

Superseding an ADR does not mean deleting it. Mark the old one SUPERSEDED with a pointer to the new one. The record of having changed your mind, and why, is the most useful part of the format.
