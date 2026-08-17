## Scope: T9.4 then T9.1 — the prompt deliverable, then the README

Do **not** do T9.2 (demo rehearsal) or T9.3 (final quality gate). Those require running against
the deployed URL and the orchestrator handles them.

## T9.4 — assemble the prompt deliverable

For this challenge the prompts are **part of the submission**, not implementation detail
(ADR-0018). Your job is to make `prompts/` a coherent artifact a reviewer can read end to end.

- `prompts/README.md` indexes every runtime and build prompt with its version, purpose, `k`, and
  what consumes it. Verify each row against reality — a table that has drifted from the files is
  worse than no table.
- Assert by test that **every `promptVersion` the code can emit names a file that exists** in
  `prompts/runtime/`. T5.1 already asserts the loaded text is byte-identical to the file; this is
  the complementary direction.
- **Leave `prompts/build/00-master-orchestrator.md` exactly as it is.** It carries a placeholder
  because only the project owner holds the original ~10,000-word prompt, and the file explains
  why a re-typed copy would be the wrong artifact. Do not reconstruct it, do not summarise it,
  and do not "improve" the note. Record it as an open owner action in your handoff.
- Build prompts are **verbatim**. Not tidied, not retrospectively improved, including the ones
  whose output was later overruled.
- No prompt contains a secret, a key, or anything resembling one — check.

## T9.1 — the README, for two audiences

It has to work for a product reviewer and a technical reviewer without either feeling it was
written for the other. Lead with what the thing *is* and why the three-register idea matters,
then the engineering.

Answer the nine final review questions in `docs/09-demo/EVALUATION_STORY.md`. Read that file
first; it is the actual specification for this task.

Cover honestly:

- **What it does**, in plain language, with the staging URL and the cold-start warning.
- **What it deliberately does not do**: no wallet, no signing, no real orders, ever (ADR-0004).
- **How to run it** from a clean clone, in under five lines. Verify the steps by following them.
- **The claims policy**, linked, and not violated anywhere in the README itself.
- **Why there is no backtest.** ADR-0007 is the most interesting decision in the project: a
  backtest was investigated as a first-class deliverable and then refused, because a model
  trained on the internet has likely seen the outcomes of already-resolved markets, so
  retrospective accuracy would be contaminated. The prospective hashed manifest replaces it.
  A reviewer should understand this was a decision, not an omission.
- **Known limitations**, as a real list. An empty one is a claim and will be checked.

## Rules that bind every word

`docs/05-ai/EVALUATION.md` §B8 binds the README exactly as it binds UI copy. Never state or imply
the system beats the market. Do not describe a gap as a future enhancement. Do not report a
metric without its sample count — and with no resolved outcomes yet, the honest statement is that
predictions are recorded and **not yet scored**.

## Acceptance criteria

1. `prompts/README.md` indexes every prompt file, and every row matches reality.
2. A test asserts every emittable `promptVersion` names an existing file.
3. `00-master-orchestrator.md` is untouched, and its placeholder is reported as an owner action.
4. The README answers the nine questions in `EVALUATION_STORY.md`.
5. The clean-clone run instructions were followed by you and work as written.
6. No claim anywhere overstates what the system knows.
