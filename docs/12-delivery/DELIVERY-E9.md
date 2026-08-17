# DELIVERY - E9 Demo and documentation

**Staging:** https://polymarket-widget.onrender.com
**Status:** ACCEPTED, with two owner actions named below that I cannot perform.

---

## What was delivered

| Requirement | Status |
|---|---|
| T9.4 prompt deliverable assembled | done |
| T9.1 README for two audiences | done |
| T9.2 demo rehearsal | **partial** — see below |
| T9.3 final quality gate | done, below |

## The prompt deliverable

`prompts/` now records the whole build, not half of it. `00`–`03` were the planning phase;
`04-implementation-orchestration.md` plus the 17 verbatim dispatch prompts in
`prompts/build/implementation/` are the phase that wrote the code.

A test asserts every `promptVersion` the code can emit names a file that exists, complementing
T5.1's assertion that loaded prompt text is byte-identical to its file. Between them, the prompt
a reviewer reads and the string the model receives cannot drift.

**`00-master-orchestrator.md` still holds its placeholder.** Only the project owner has that
text, and the file explains why a re-typed copy would be the wrong artifact for a deliverable
whose whole point is that the prompt and the artifact are the same bytes. Recorded as an owner
action rather than filled in with an approximation.

## Final quality gate

| Gate | Result |
|---|---|
| typecheck | 0 errors |
| lint | 0 errors, 0 warnings |
| unit + integration | **455 passing**, 55 files |
| E2E (Playwright, Chromium) | **14 passing**, 13.5s |
| live contract (`pnpm test:live`, excluded from CI) | **12 passing**, ~5s |
| production build | succeeds |
| secret-leak, deployed bundle | 0 matches for `sk-ant` / `ANTHROPIC` |
| staging `/api/health` | ok, serving current `main` |
| real forecast on staging | completed with full provenance |
| `src/simulation` branch coverage | 100% |

Nine epics, all merged to `main`. Branch protection requires the aggregate `ci` check, which
includes the E2E job.

## T9.2 is partial, and I am not going to claim otherwise

The contract requires the demo rehearsed **twice, timed, end to end**, with two specific markets
pre-identified — one that passes the gate and one the gate rejects — plus fallbacks in case
either resolves or goes illiquid.

What was done: the golden path was walked against staging, and a real forecast was verified
end to end returning `NO_BET` on a live market with its provenance intact.

What was **not** done: a timed twice-through rehearsal, and pre-identifying a market that
produces a `CONSIDER` verdict. Finding one means calling the model against candidate markets
until a passing one appears, which costs API credit — and reducing that spend was an explicit
instruction. It is a ten-minute job whenever you want it, and it should be done shortly before
showing the project, because markets resolve and go illiquid.

## Owner actions I cannot perform

1. **Paste the master orchestrator prompt** into `prompts/build/00-master-orchestrator.md`.
2. **Set the Render health check path** to `/api/health` in the dashboard. The endpoint works and
   is verified; the MCP exposes no update-service call, so Render simply is not gating deploys on
   it.

## Before showing this to anyone

1. `pnpm warm` — the free tier sleeps after ~15 minutes and a cold start takes ~30s.
2. Set `AI_SAMPLES=5`, `AI_ANCHORED=1`, `ANTHROPIC_MODEL=claude-opus-5` if you want dispersion
   and the anchoring warning to be meaningful. Staging currently runs the cheap configuration and
   `dispersion` reads 0 as a direct result.
3. `pnpm test:live` — confirms the recorded fixtures still match reality. Markets drift.
