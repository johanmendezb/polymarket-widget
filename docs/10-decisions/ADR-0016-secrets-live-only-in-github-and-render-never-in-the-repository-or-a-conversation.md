# ADR-0016 - Secrets live only in GitHub and Render, never in the repository or a conversation

**Status:** ACCEPTED
**Date:** 2026-08-15

## Context

Releases are to be fully automated: push to `main`, CI runs the gate, Render deploys. That requires credentials for GitHub, Render and Anthropic to exist somewhere the automation can read them.

The stated intent was to store them "in the project env vars, never in chat". The second half of that is right. The first half needs to be more specific, because "the project" could mean several places, and one of them is wrong.

## Problem

Where do credentials physically live, who puts them there, and what does the repository know about them?

## Options considered

1. **Credentials pasted into a conversation**, then written to a config file or a project document by an agent.
2. **Credentials in an encrypted file in the repository** (SOPS, git-crypt, sealed secrets).
3. **Credentials entered by the human directly into GitHub repository secrets and the Render dashboard.** The repository contains only names, purposes and a verification procedure.

## Evidence

Option 1 puts a live credential into a conversation transcript, a session log and potentially a document that syncs across surfaces. A credential that has been pasted into a chat should be considered disclosed and rotated. No amount of care afterward undoes it.

Option 2 is legitimate practice at team scale. Here it means adding a key-management tool, a decryption step in CI and a master key that itself has to live somewhere, to protect three values that two systems already store securely for free.

Option 3 costs one human minute per secret and produces a repository in which there is nothing to leak.

## Decision

**Option 3.**

- The **human** enters every credential directly into the GitHub repository secrets UI and the Render environment variables UI. No agent ever sees a secret value.
- The **repository** contains `.env.example` with names and empty values, and `08-operations/SECRETS.md` documenting each name, its purpose, its scope and how to verify it works without printing it.
- **CI proves the absence of leakage**: after `pnpm build`, the client bundle is grepped for `ANTHROPIC` and for the key prefix, and a match fails the build.
- If a secret is ever pasted into a conversation, into a commit, or into a log, the response is **rotate first, discuss second**.

Verification is always indirect. `/api/health` reports whether the AI provider is reachable as a boolean. Nothing anywhere prints a key, a prefix, or a length.

## Consequences

Positive: there is no secret in the repository to leak, no key-management dependency, no decryption step in CI, and no credential in any transcript. CI proves the client-side property rather than asserting it.

Negative: bootstrapping a new environment is a manual step in two dashboards, which is correct at one environment and would not scale to ten. An agent cannot self-serve a credential, which is a feature.

## Reversibility

**High.** Moving to a managed secret store later changes where CI reads from, not what the repository contains.

## Related tasks

T1.2, T1.3, T7.2
