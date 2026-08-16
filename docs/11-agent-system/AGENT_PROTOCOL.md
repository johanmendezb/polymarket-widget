# AGENT PROTOCOL

How work is delegated, handed back and reviewed. The purpose of every rule here is to keep the orchestrator's context small and the repository authoritative.

---

## 1. Knowledge hierarchy

When two sources disagree, the higher one wins:

```
1. Current code plus passing tests
2. Current official external documentation
3. ADRs
4. Approved technical specification
5. PRD
6. Research notes
7. Backlog assumptions
8. Chat history
```

**Chat history is never authoritative over the repository.** If a decision exists only in a conversation, it does not exist. Write it down or lose it.

---

## 2. Roles

| Role | Owns | Does not do |
|---|---|---|
| **Orchestrator** | Project state, priorities, task decomposition, decisions, quality gates, scope discipline | Write application code, except trivially |
| **Implementer** | Executing one task contract at a time | Expand scope, invent requirements, skip tests |
| **Reviewer** | Correctness, architecture, security, tests, edge cases, scope discipline | Rewrite the implementation. It rejects; it does not take over. |
| **Researcher** | Investigating an UNKNOWN and writing it into `02-research/` with sources and dates | Make product decisions |

---

## 3. Context loading

Load the minimum. This is the single largest lever on how far the budget goes.

| Role | Loads |
|---|---|
| Orchestrator | `PROJECT_INDEX.md`, `CURRENT_STATE.md`, `ACTIVE_CONTEXT.md` |
| Implementer | `ACTIVE_CONTEXT.md`, the task contract, the relevant architecture section, the relevant existing code and tests |
| Reviewer | The diff, the task contract, the relevant tests, `DEFINITION_OF_DONE.md` |
| Researcher | The question, plus whatever external sources it needs |

Never load the whole repository into a context window. Never paste a file into chat when the agent can read it from disk.

`ACTIVE_CONTEXT.md` is disposable by design. Regenerate it when the active task changes; do not append history to it.

---

## 4. Task contract

No task starts without one. Fields:

```yaml
id:
title:
epic:
objective:
context:
requirements:
acceptance_criteria:
files_expected:
dependencies:
tests_required:
risk:
estimated_minutes:
```

**An agent must refuse a task with insufficient context** rather than filling the gaps with assumptions. Refusing costs minutes; guessing costs hours and produces work that has to be discarded.

---

## 5. Handoff

Every agent returns exactly this, and **under 500 words**. Detail goes in the repository, not the handoff.

```yaml
status: DONE | BLOCKED | NEEDS_REVIEW | FAILED
summary:
decisions:
evidence:
files_changed:
tests_added:
tests_run:
test_results:
risks:
open_questions:
assumptions:
next_actions:
```

The orchestrator consumes the summary, never the reasoning transcript.

---

## 6. Review

```
IMPLEMENT -> TEST -> REVIEW -> FIX -> TEST -> MERGE
```

The reviewer may reject. Grounds are listed in `06-execution/DEFINITION_OF_DONE.md` §Review criteria. Rejection is normal and is not a failure of the implementer.

Reviews check, in this order: correctness, then domain rules, then honesty, then architecture, then tests, then scope. Honesty ranks above architecture on purpose. An elegant component that shows a fee of zero is worse than an ugly one that shows the right number.

---

## 7. Failure handling

Do not retry a failed task with the same prompt.

```
FAILURE
  -> classify: missing information | technical limitation | bad assumption
              | tooling issue | scope issue | implementation defect | external API issue
  -> update the relevant document
  -> modify the plan
  -> retry
```

A repeated failure becomes a project artifact: an entry in `02-research/OPEN_QUESTIONS.md` or a new ADR. If the same thing fails twice, the plan is wrong, not the agent.

---

## 8. Parallelism

Parallelise only across disjoint file sets. Good candidates in this project:

- `src/simulation` and `src/polymarket`, once `src/domain` types exist
- UI shell and the AI route, since the UI builds against a fixture `Recommendation`
- Documentation and polish

Never parallelise: anything touching `src/domain`, and anything touching the shared UI layout. Do not ask two agents to solve the same problem unless the comparison is the point.

---

## 9. Stop conditions

The orchestrator must stop implementation and replan when any of these becomes true:

```
- scope exceeds the remaining time budget
- a critical API behaviour is unknown and is on the critical path
- a security boundary is unclear
- the prediction methodology cannot be justified
- a component cannot be tested
- the architecture has grown complexity with no stated benefit
- a checkpoint in ROADMAP.md is missed
```

Stopping is cheap. Discovering at hour 44 that the plan was wrong at hour 20 is not.

---

## 10. Phase summaries

At the end of each epic, write a short summary compressing decisions, results, discoveries, remaining risks and next steps. Then update `CURRENT_STATE.md` and, if the shape of the project changed, `PROJECT_INDEX.md`.

The test of whether this is working: a fresh agent should be able to resume the project from `PROJECT_INDEX.md`, `CURRENT_STATE.md` and `ACTIVE_CONTEXT.md` alone, without reconstructing any history.
