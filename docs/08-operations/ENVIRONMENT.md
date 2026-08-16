# ENVIRONMENT

## Environments

**There is exactly one: staging.** No production, no per-branch previews, no promotion path. See ADR-0015.

| | |
|---|---|
| Name | `polymarket-widget-staging` |
| Host | Render, free web service |
| Deploys from | `main`, automatically on push |
| URL | _record at T1.3_ |
| Health check | `/api/health` |

Because `main` deploys automatically and there is no production to shield, **the pull request is the buffer**. An epic that has not passed QA acceptance never reaches the staging URL. See ADR-0017 and `06-execution/DELIVERY_PROTOCOL.md`.

### The cold start

**A free Render web service spins down after roughly 15 minutes without traffic. The next request pays a cold start of tens of seconds.**

This is expected behaviour of the tier, not a defect, and it is disclosed in three places: here, in the README, and in the QA checklist footer of every delivery note. `/api/health` reports `uptimeSeconds`, so a low value means the instance has just woken.

Two consequences that are easy to get wrong:

1. **Before sending anyone to the URL** (QA handover, demo, review), open it yourself and wait for the warm response first. Sending a reviewer to a cold URL burns a review cycle on the hosting tier.
2. **The demo has a mandatory warm-up step.** See `09-demo/DEMO_SCRIPT.md` §Before you start.

We deliberately do **not** run a keep-alive pinger. It would burn the free allowance to defeat a limitation we have chosen to disclose, and a reviewer who finds a cron job whose only purpose is working around the hosting tier learns something worse about the project than the cold start does.

---

## Local

```bash
node -v    # 22.x
pnpm -v    # 10.x

pnpm install
cp .env.example .env.local     # then add your Anthropic key
pnpm dev                       # http://localhost:3000
```

The widget is at `/widget`. The root `/` is a demo host page that embeds it in an iframe, so embedding behaviour is exercised during development rather than discovered at the end.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build (Next standalone output) |
| `pnpm start` | Run the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint, including the import-boundary rules |
| `pnpm test` | Vitest unit and integration |
| `pnpm test:e2e` | Playwright, fixture-backed |
| `pnpm test:live` | Live contract suite against production Polymarket. Excluded from CI. |
| `pnpm record-fixtures` | Re-record `test/fixtures/` from live responses |
| `pnpm freeze` | E8: write and hash the prediction manifest |
| `pnpm resolve` | E8: fill resolved outcomes into the manifest and rescore |
| `pnpm warm` | Ping the staging URL and wait for a warm response. Run before any handover or demo. |

## Environment variables

Names only. Values are entered by a human in the Render dashboard. See `08-operations/SECRETS.md` and ADR-0016.

| Name | Required | Where | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | server only | Never prefixed `NEXT_PUBLIC_`. CI fails the build if it appears in the client bundle. |
| `PORT` | no | server | Render sets it. Default 3000. |
| `RENDER_GIT_COMMIT` | no | server | Surfaced by `/api/health`. Falls back to `"dev"`. |
| `POLYMARKET_GAMMA_BASE` | no | server | Defaults to `https://gamma-api.polymarket.com`. Overridable for testing. |
| `POLYMARKET_CLOB_BASE` | no | server | Defaults to `https://clob.polymarket.com`. |
| `AI_SAMPLES` | no | server | Defaults to 5. Set to 3 under the cut order; record it in `promptVersion`. |
| `AI_TIMEOUT_MS` | no | server | Defaults to 45000. |

**There are no Polymarket credentials.** Every endpoint this project uses is public. If a task appears to need one, the task is out of scope.

`.env.example` is committed with every name and no value. `.env.local` is gitignored.

---

## Release automation

Push to `main` is the release. There are no manual deployment steps.

```
PR approved by the owner (ADR-0017)
      |
      v
merge to main
      |
      v
GitHub Actions: typecheck -> lint -> test -> e2e -> build -> secret-leak
      |
      v
Render auto-deploys from main
      |
      v
health check at /api/health must pass for the deploy to go live
```

Render's native deploy-on-push is preferred over a CI-triggered deploy hook, because it needs no credential in GitHub at all. If a deploy hook is ever added, it is a secret and belongs in `SECRETS.md`.

## Verifying a deployment

```bash
pnpm warm                      # cold start, if the service was idle
curl -s https://<url>/api/health | jq
# { "status": "ok", "commit": "<sha>", "uptimeSeconds": n,
#   "upstream": { "gamma": "ok", "clob": "ok" }, "ai": "ok" }
```

`ai` is a reachability boolean. It never reveals anything about the key.

Then, manually: load `/widget`, search a market, open it, price a bet. If the AI panel fails but everything else works, the key is missing or wrong. That is a configuration problem, not a code problem, and the widget is designed to degrade in exactly that way.

## Runbook

| Symptom | Likely cause | Action |
|---|---|---|
| First request takes 30+ seconds, then everything is fast | Render cold start after idle | Expected. Run `pnpm warm` before handovers and demos. |
| `/api/health` 200 but `upstream.gamma` is `error` | Polymarket outage or rate limit | Check `status.polymarket.com`. The widget serves stale data with a badge. Wait. |
| `/api/health` reports `ai: "unreachable"` | Key missing, invalid, or rate limited | Check the Render variable. Everything else keeps working by design. |
| Widget loads, search returns nothing | Upstream shape change | Check logs for `UPSTREAM_SHAPE_CHANGED` with the named field. Fix the zod schema, re-record fixtures. |
| Fill prices near 0.99 on every market | Asks normalization regression | Check `mapOrderBook`. This is R-04. |
| Fee shows $0.00 on a politics market | Fee config fell back and got zeroed | Check `FeeConfig.source`. This is R-03. Block the release. |
| Every forecast equals the market price | Anchoring collapse | Check the blind prompt assembly. This is R-01. |
| Deploy succeeded but the URL 502s | Health check failing, or `PORT` not respected | Check Render logs. The app must bind `process.env.PORT`. |

## Observability

Deliberately minimal: structured JSON logs to stdout, which Render captures. Logged per request: route, cache hit or miss, upstream latency, error code. Logged per forecast: model id, prompt version, k, dispersion, gate verdict and reasons. **Never logged:** the API key, full prompts, or full model responses, since either may echo configuration.

No APM, no tracing, no metrics backend. A single staging service does not need them, and adding them would be the "complex infrastructure with no benefit" the charter forbids.
