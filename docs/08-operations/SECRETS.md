# SECRETS

Governed by ADR-0016.

## The rule

**Every credential is entered by a human, directly into the GitHub or Render UI. No agent ever receives a secret value. No secret is ever pasted into a conversation, a document, a commit, or a log.**

This file documents **names and purposes only**. There is no value in this repository and there never will be.

A credential that has appeared in a conversation should be considered disclosed. Rotate it. Do not reason about whether it was probably fine.

---

## Where each secret lives

| Name | Lives in | Used by | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Render environment variables | The running app, server-side only | Forecast calls from `/api/ai/forecast` |
| `ANTHROPIC_API_KEY` | GitHub Actions secret | CI, optionally | Only if a live AI smoke test is added. Not required for the standard gate. |
| `RENDER_DEPLOY_HOOK_URL` | GitHub Actions secret | CI | Triggers a deploy after the gate passes. Optional: Render's native deploy-on-push covers the same need without a secret. |
| `RENDER_API_KEY` | GitHub Actions secret | CI, optionally | Only if we need to read deploy status or set variables from CI. Prefer not to. |
| `GITHUB_TOKEN` | Provided automatically by GitHub Actions | CI | Never created or stored by us |

**Default posture: the only secret this project actually requires is `ANTHROPIC_API_KEY` in Render.** Everything else is optional convenience, and each optional one is a credential that could leak. Add them only if a task contract needs them.

---

## Setup, one time

Performed by the project owner, in a browser, in about three minutes.

**Render**

1. Create a Web Service named `polymarket-widget-staging` from the GitHub repository.
2. Build command: `pnpm install --frozen-lockfile && pnpm build`
3. Start command: `pnpm start`
4. Health check path: `/api/health`
5. Environment variables: add `ANTHROPIC_API_KEY`.
6. Auto-deploy from `main`: on.

**GitHub**

1. Settings, Secrets and variables, Actions.
2. Add only the optional secrets a task contract actually requires.
3. Branch protection on `main`: require the CI check, and require a pull request approval. This is what makes the ADR-0017 QA gate enforceable rather than a convention.

Record in `08-operations/ENVIRONMENT.md`: the staging URL and the service name. **Nothing else.**

---

## How to verify a secret without printing it

Never echo, log, or partially print a credential. Verification is always indirect.

| Check | How |
|---|---|
| Is the Anthropic key present and valid? | `GET /api/health` returns `ai: "ok"` or `ai: "unreachable"`. A boolean, never a value. |
| Did CI see its secrets? | The workflow step succeeds or fails. It does not print names or lengths. |
| Did a key reach the browser? | The CI secret-leak step greps the built client bundle for `ANTHROPIC` and for the key prefix, and fails the build on a match. This is a proof, not an assurance. |

Forbidden everywhere, including in debug code that "will be removed later": printing a key, printing a prefix, printing a length, printing a hash, and logging a full prompt or a full model response (either may echo configuration).

---

## If a secret leaks

In this order. Do not reorder.

1. **Rotate immediately.** Anthropic console for the API key, Render dashboard for the deploy hook.
2. Update the value in Render and in GitHub.
3. Confirm the new value works via `/api/health`.
4. Only then work out how it happened and what stops it recurring.
5. Record it in `CHANGELOG.md`. A leak that is fixed quietly teaches nobody anything.

Rewriting git history does not undo a disclosure. Rotation does.

---

## What is deliberately not done

| Not done | Why |
|---|---|
| Encrypted secrets in the repository (SOPS, git-crypt) | Real practice at team scale. Here it means a key-management tool, a CI decryption step, and a master key that itself has to live somewhere, to protect one value that Render already stores securely for free. |
| A secret-scanning pre-commit hook | GitHub's push protection covers this. A local hook is bypassable and gives false confidence. |
| Separate credentials per environment | There is one environment. See ADR-0015. |
| Storing credentials in a project document | A document that syncs across surfaces is a worse place for a credential than a chat message, not a better one. |
