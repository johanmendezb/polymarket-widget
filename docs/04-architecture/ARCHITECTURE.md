# ARCHITECTURE

## 1. Shape

```
┌──────────────────────────────────────────────────────────────┐
│  BROWSER                                                     │
│  Next.js client components, container-queried, 380x600 base  │
│  No secrets. No localStorage. No direct upstream calls.       │
└───────────────────────────┬──────────────────────────────────┘
                            │ same-origin fetch
┌───────────────────────────▼──────────────────────────────────┐
│  NEXT.JS SERVER (route handlers)                             │
│                                                              │
│  /api/polymarket/search      cache 15s                       │
│  /api/polymarket/market/:id  cache 15s                       │
│  /api/polymarket/book        cache 3s                        │
│  /api/polymarket/history     cache 60s                       │
│  /api/ai/forecast            no cache, hard timeout          │
│  /api/health                                                 │
└──────────┬───────────────────────────────┬───────────────────┘
           │ public REST, no auth          │ ANTHROPIC_API_KEY
┌──────────▼───────────────┐   ┌───────────▼───────────────────┐
│ gamma-api.polymarket.com │   │ Anthropic Messages API        │
│ clob.polymarket.com      │   │ claude-opus-5                 │
└──────────────────────────┘   └───────────────────────────────┘
```

One deployable unit. One process. No database.

## 2. Why a proxy and not direct browser calls

ADR-0002. Four reasons, in order of weight:

1. **CORS is unknown.** Whether Polymarket's public read hosts send permissive CORS headers from an arbitrary embedding origin is undocumented and untested. A widget whose entire premise is embedding cannot have an unresolved cross-origin question on its critical path. The proxy removes the question rather than answering it.
2. **Rate limits are unknown and undocumented.** A proxy is a single choke point where caching, request coalescing and backoff actually work. A hundred embedded widgets hitting Polymarket directly is a hundred uncontrolled clients.
3. **One validation boundary.** Every upstream response is parsed by a zod schema in one place. An upstream shape change produces one loud failure with a useful message, not scattered `undefined` reads.
4. **The AI key has to be server-side anyway.** Having built a server, adding four read routes to it costs almost nothing.

The cost is one extra network hop and a server that must stay up. Both are acceptable; the widget is not latency-critical and Render gives us the server for free alongside the frontend.

## 3. Module boundaries

```
src/
  app/
    api/
      polymarket/search/route.ts
      polymarket/market/[id]/route.ts
      polymarket/book/route.ts
      polymarket/history/route.ts
      ai/forecast/route.ts
      health/route.ts
    widget/page.tsx          the embeddable surface
    page.tsx                 a host page that embeds the widget, for the demo

  domain/                    pure types, branded primitives, invariants, guards
  polymarket/                zod schemas, upstream client, mappers, cache
  simulation/                book walk, fees, edge, Kelly, gate arithmetic
  ai/                        prompt assembly, tool schema, k-sampling, blending
  ui/                        components, hooks, states
  lib/                       cross-cutting helpers (formatting, errors)
```

**Enforced import rule** (ESLint `import/no-restricted-paths`, a deliberate violation must fail CI):

| Module | May import |
|---|---|
| `domain` | nothing internal |
| `polymarket` | `domain` |
| `simulation` | `domain` |
| `ai` | `domain`, `simulation` |
| `ui` | `domain`, `simulation`, `lib` (never `polymarket` or `app/api` directly) |
| `app/api` | everything |

The point of the rule is that `domain` and `simulation` stay pure and framework-free, which is what makes them trivially testable and what makes the TDD plan in `07-testing/TEST_STRATEGY.md` realistic rather than aspirational.

## 4. Why not a monorepo

ADR-0001. A monorepo would be justified if we had multiple deployables, multiple consumers of the shared packages, or independent release cycles. We have none of those. What a monorepo actually buys here is `pnpm-workspace.yaml`, build orchestration, cross-package TypeScript project references, and roughly two hours of setup and debugging, in exchange for boundaries that ESLint already enforces.

The stated architectural goals (clear domain boundaries, testability, room for a future live provider, AI isolation, deployability) are all met by directory boundaries plus a lint rule. If a second deployable ever appears, extracting `domain`, `simulation` and `polymarket` into packages is a mechanical refactor because they already import nothing upward.

This is a deliberate choice to look less sophisticated and be more appropriate. It is called out in `09-demo/TRADEOFFS.md` because a reviewer may expect a monorepo and should see that it was decided rather than skipped.

## 5. Execution provider

```ts
interface ExecutionProvider {
  readonly mode: 'SIMULATION' | 'LIVE';
  quote(req: QuoteRequest): Promise<FillEstimate>;
  execute(req: ExecuteRequest): Promise<ExecutionResult>;
}
```

Only `SimulationExecutionProvider` exists. `LiveExecutionProvider` is **not** a stub file with `throw new Error('not implemented')`; it does not exist at all, because a stub invites someone to fill it in without passing the gate in `SECURITY.md`.

The interface exists so that the seam is real and demonstrable, and so the UI can render `provider.mode` rather than a hardcoded label.

## 6. Data flow for the critical path

```
user types
  -> useDebouncedSearch (250ms)
  -> GET /api/polymarket/search?q=
       -> cache lookup (15s TTL, in-memory LRU, request coalescing)
       -> gamma /public-search
       -> zod parse
       -> mapSearchResults()  ->  Market[]
  -> render rows

user picks an outcome + amount
  -> GET /api/polymarket/book?tokenId=
       -> cache lookup (3s TTL)
       -> clob /book
       -> zod parse
       -> mapOrderBook()   *** reverses asks to ascending ***
  -> walkBook(book, request)      pure, in simulation/
  -> computeFee(shares, avgPrice, feeConfig)   pure
  -> FillEstimate
  -> render five-line preview

user asks for a second opinion
  -> POST /api/ai/forecast { marketId, tokenId }
       -> assemble BLIND prompt   (price is never placed in context)
       -> k parallel Anthropic calls with an enforced tool schema
       -> median of log-odds, IQR dispersion
       -> blend with market at the pre-registered weight
       -> evaluate gate against live book + market metadata
  -> Recommendation
  -> render AI panel
```

## 7. Caching

In-memory, per-process, LRU with TTL. No Redis. A single Render instance serving a demo does not need distributed cache, and adding one would be exactly the "complex infrastructure with no benefit" the charter forbids.

| Route | TTL | Rationale |
|---|---|---|
| search | 15s | Discovery data changes slowly; this is the highest-volume route |
| market | 15s | Same |
| book | 3s | Must be fresh enough that the preview is honest, cached enough to survive typing |
| history | 60s | Sparkline data is inherently historical |

Concurrent identical requests are coalesced into one upstream call. On upstream 429 or 5xx, serve stale within a grace window and mark the response `stale: true` so the UI can badge it.

## 8. State management

React state and a small number of hooks. No Redux, no Zustand, no server-state library. The widget has four screens and one selected market; introducing a state library would be more code than the state it manages.

Simulated positions live in a React context for the session. In-memory only, by necessity: a properly sandboxed iframe has a null origin and therefore no `localStorage` and no cookies. This is documented in the UI ("positions reset when the widget reloads") rather than hidden.

## 9. Stack

| Layer | Choice | Note |
|---|---|---|
| Runtime | Node 22 | |
| Package manager | pnpm | |
| Framework | Next.js 15, App Router | Server routes and the client widget in one deployable |
| Language | TypeScript, `strict: true` | No `any` in `domain` or `simulation` |
| Validation | zod | The upstream boundary |
| Styling | Tailwind + CSS container queries | Container queries are mandatory: the widget's width is not the viewport's width, so media queries would key off the host page |
| Theming | `color-scheme` + `light-dark()`, theme passed as an explicit param | CSS does not cross a sandboxed iframe boundary |
| Unit / integration | Vitest | |
| HTTP mocking | MSW, with fixtures recorded from live responses | |
| E2E | Playwright | Chromium only, for time |
| AI | `@anthropic-ai/sdk`, `claude-opus-5` | Server-side only |
| Deploy | Render, free tier, single staging env | Next standalone output. Spins down after ~15 min idle; cold start is documented, not worked around. ADR-0015. |

## 10. What we are deliberately not building

| Not built | Why |
|---|---|
| WebSocket price feed | ADR-0012. Reconnection, backpressure and keepalive for a five-minute demo. Polling with a visible freshness stamp is more honest about staleness anyway. |
| Database | Nothing needs to survive a restart in v1. The prediction manifest is a file in the repo. |
| Auth / user accounts | No user-specific data exists. |
| Redis / distributed cache | One instance. |
| Server-side rendering of the widget | It is an interactive client surface; SSR adds hydration complexity for no benefit. |
| `@polymarket/client` SDK on the read path | Four plain GETs, and we want our own validated boundary. The SDK is the documented migration path for a future live provider. |
