## Scope: T8.1 and T8.3 only — the manifest CLI and the resolve command

Do **not** build T8.2, the diagnostics view. That is UI and it needs the widget, which is being
built in parallel right now. You are building two commands and nothing else.

Read the T8.1 and T8.3 contracts, plus `docs/05-ai/EVALUATION.md` — especially §B5 (why there is
no backtest) and §B8 (the claims policy), and ADR-0007.

## Why this epic exists, which determines how to build it

The project refuses to ship a backtest. ADR-0007 investigated one and concluded it is invalid as
evidence for an LLM, because a model trained on the internet has very likely seen the outcome of
any market that has already resolved. Retrospective accuracy numbers would be contaminated and
therefore dishonest.

What replaces it is a **prospective** commitment: freeze forecasts on *unresolved* markets, hash
the file, publish the hash, and let the outcomes arrive later. That converts "trust us" into
"check the hash." Every design decision here follows from that, so:

- **The manifest must be tamper-evident, not merely stored.** A SHA-256 of the frozen file is
  committed to the repository and displayed in the UI.
- **Only unresolved, short-horizon markets go in.** Freezing a resolved market would recreate the
  exact contamination the ADR rejects. Refuse to freeze one and say why.
- **`resolve` fills outcomes in later. It must never alter a frozen forecast**, only append
  outcomes. If the manifest hash no longer matches, that is a loud failure, not a warning.

## T8.1 — `pnpm freeze`

Freezes N unresolved short-horizon markets with their forecasts into JSONL, writes a SHA-256 of
the file, and commits both. Record for every entry: market id, question, the forecast, the
market price at freeze time, `promptVersion`, model id, `k`, dispersion, the gate verdict and its
reason codes, and an ISO timestamp.

The market price at freeze time is recorded **for later comparison**, not fed to the blind prompt.

## T8.3 — `pnpm resolve`

Fills in outcomes for entries whose markets have since resolved. Verifies the manifest hash
before touching anything and refuses to proceed if it does not match. Appends outcomes; never
edits a forecast.

## The API key is not set in this environment

`pnpm freeze` calls the forecast pipeline, which needs `ANTHROPIC_API_KEY`. It is **not set** —
do not look for it, do not ask for it, and write no test that needs it. Structure the command so
the forecast source is injectable, exactly as T5.2 did with its transport, and test the whole
thing against a mock. A missing key at runtime must produce a clean handled error naming what is
missing, not a stack trace.

## Honesty constraints

- **No fabricated statistic anywhere.** An empty manifest reports as empty.
- **Never claim the system beats the market**, and do not imply it by framing. With no resolved
  outcomes yet, the honest statement is that the predictions are recorded and not yet scored.
- **No metric without its sample count.** A number computed from three entries is reported as
  being computed from three entries.

## Acceptance criteria

1. `pnpm freeze` produces a JSONL manifest and a SHA-256 hash, both written for commit.
2. Freezing refuses a resolved market, with a message explaining why.
3. `pnpm resolve` verifies the hash first and fails loudly on a mismatch.
4. `resolve` appends outcomes and provably never mutates a frozen forecast — assert it.
5. Every entry carries promptVersion, model id, k, dispersion, gate verdict and timestamp.
6. All tests pass with no network and no API key present.
