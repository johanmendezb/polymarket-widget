# DELIVERY - E7 Polish and deployment

**Staging:** https://polymarket-widget.onrender.com
**Status:** ACCEPTED — verified against the deployed URL, not locally.

---

## What was delivered

| Requirement | Status |
|---|---|
| T7.1 accessibility and copy pass | done |
| T7.2 deployment and secret verification | done |

## Verified on the deployed service, 2026-08-17

Each of these was run against staging on commit `97e3a4d`, not against a local build.

1. **Public URL loads and serves the widget.** `/widget` renders the search combobox;
   `/` embeds it in an iframe with `sandbox="allow-scripts"`, so embedding behaviour is
   exercised by the demo host page rather than assumed.
2. **No secret in the client bundle.** Every `/_next/static/*.js` chunk the widget loads was
   fetched from staging and grepped for `sk-ant` and `ANTHROPIC`. **Zero matches.** CI enforces
   the same check on every push, across the bundle, the source, and the build environment.
3. **`/api/health`** returns `{"status":"ok","commit":"97e3a4d…","uptimeSeconds":87}`.
4. **A real forecast completed end to end**, which is the first time this has ever been true —
   see below.
5. **Axe reports no critical violations** on the golden path, asserted by a Playwright test that
   runs in the CI `e2e` job, which is in the aggregate `ci` gate branch protection requires.

## The first real model call

Everything in the AI layer had been verified against an injected mock transport until now. The
first live call from the deployed service returned:

```
verdict: NO_BET
modelId: claude-haiku-4-5-20251001
promptVersion: blind-v1
blendWeight: 0.35
dispersion: 0
```

Full provenance is present on the response: `modelId`, `promptVersion`, `createdAt`, `samples`,
`dispersion`, `blendWeight`, and the blind, anchored, market and blended probabilities as
separate fields — so the three registers stay separable all the way to the client.

**`dispersion: 0` is not a bug, it is the cost setting.** With `AI_SAMPLES=1` there is one sample
and therefore no spread. See the cost note below.

## The bug the first live calls found

The sampler offered the model `submit_forecast` **and** `web_search` on a one-shot,
non-streaming request. On a market it could not answer from memory the model opened with a search
call: the response carried a single `tool_use` named `web_search`, ~99 output tokens, and no
`submit_forecast` block. Nothing fulfils that search and continues the conversation, so the
forecast never arrived, the missing block was correctly read as a schema violation, the retry hit
the same thing, and the route returned `AI_INVALID_OUTPUT`.

That is the entire explanation for "the AI panel works for politics but not for GTA 6":
well-covered markets answered from model knowledge and validated cleanly; thin-coverage ones
reached for a search that was never wired up. Reproduced 4 of 4 on one market.

Fixed by offering only `submit_forecast`. **The cost is evidence quality** — the model now answers
from its own knowledge rather than live sources, and the prompt already instructs it to set
`insufficient_evidence` rather than invent a source or guess a date. Re-enabling search means
implementing the tool loop, which is real work and materially more tokens per forecast. Deferred
deliberately and recorded in the code.

## Cost controls

A forecast was **six `claude-opus-5` calls** — `AI_SAMPLES=5` blind samples plus an unconditional
anchored diagnostic — with **no cache**, so re-expanding the panel re-billed all six.

Now: a route-level forecast cache keyed on market, token, k, model and prompt version (not on the
book, since the forecast is blind to price and the fill recomputes from the live book anyway),
plus `AI_ANCHORED=0` and an `ANTHROPIC_MODEL` override.

Staging currently runs the cheap configuration:

```
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
AI_SAMPLES=1
AI_ANCHORED=0
```

**This is a deliberate trade and it costs the submission two things:** dispersion is meaningless
at k=1, and the blind-vs-anchored anchoring warning (the R-01 check) never fires. For a demo
recording, set `AI_SAMPLES=5`, `AI_ANCHORED=1` and `ANTHROPIC_MODEL=claude-opus-5`. It is one
env change and no code change.

## Known gaps

- **The Render health check path is still unset.** The endpoint works and is verified; Render
  simply does not gate deploys on it. The MCP has no update-service call, so this remains a
  dashboard action.
- **`dispersion: 0` on staging** for the reason above. Anyone reading the deployed panel is seeing
  a single sample.
- **No live-model evaluation.** No forecast has been scored against an outcome, because nothing
  has resolved. That is E8's whole point and it is honest about it.
