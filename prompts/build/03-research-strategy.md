# Build prompt 03 - Forecasting strategy and evaluation research agent

**Sent:** 2026-08-15, research phase
**Model:** claude-opus-5, general-purpose subagent with web search
**Produced:** `docs/02-research/STRATEGY_RESEARCH.md`, `docs/05-ai/EVALUATION.md`, and 33 of the 91 source records in `docs/02-research/RESEARCH_SOURCES.md`
**Ran in parallel with:** build prompt 02

**This is the prompt that changed the product.** Its findings are what turned the concept from "AI picks winners" into "AI adjusts the market and is allowed to abstain", and what produced ADR-0006, ADR-0007 and ADR-0010.

Verbatim, as sent.

---

You are the STRATEGY / EVALUATION RESEARCH AGENT for a 48-hour engineering challenge: build a "Polymarket widget" that lets a user search markets, select an outcome, simulate placing a bet, and use AI (Claude) to assist in choosing a market and/or outcome. The deliverable this week is a documentation package; another agent implements later. The AI layer will use the Anthropic API.

Your job is RESEARCH ONLY. Do not write application code.

Use WebSearch and WebFetch extensively (today is August 2026, prefer current, credible sources: academic literature, official data, reproducible experiments, credible practitioner research; be skeptical of blog posts claiming profitability).

Investigate and answer:

A. FORECASTING QUALITY
- How well-calibrated are prediction market prices themselves? What does the literature say about market-implied probability as a baseline (including the favourite-longshot bias and known miscalibration near 0 and 1)?
- What is the current published evidence on LLM forecasting accuracy versus prediction markets and versus human crowds? Look for benchmark work (e.g. ForecastBench and similar), Metaculus AI benchmark tournaments, and any 2025-2026 results. Be precise about whether LLMs beat, match, or trail markets, and under what conditions.
- Does retrieval/news access materially improve LLM forecasts? What about ensembling multiple model calls, or aggregating multiple LLMs?
- What prompting/scaffolding techniques have measurable effects on forecast calibration (e.g. reference-class reasoning, base rates, explicit consideration of both sides, extremizing, aggregation of samples)?

B. EVALUATION
- Brier score, log loss, calibration curves, reliability diagrams, resolution/refinement decomposition. Which are appropriate for a small demo dataset, and what sample size do you actually need for a claim to mean anything?
- How should we compare an AI forecast against the market baseline honestly? (e.g. Brier skill score vs market, paired comparison on the same resolved markets.)
- What are the standard pitfalls: look-ahead bias / training-data contamination (the model may already know the outcome of a resolved market), survivorship bias, cherry-picking, multiple comparisons, small-N noise.
- CRITICAL: given LLM training cutoffs, is backtesting an LLM on already-resolved markets even valid? What mitigations exist (e.g. restricting to markets resolved after the model cutoff, hiding resolution, using news-cutoff retrieval)? Be blunt about the limits.

C. EDGE AND EXECUTION
- How should "edge" be defined honestly when execution costs exist? Relationship between estimated probability, market price, spread, expected fill price, fees, and expected value.
- Kelly criterion and fractional Kelly for position sizing on binary outcomes: formula, assumptions, and why full Kelly is usually wrong when probability estimates are uncertain.
- What market-quality filters are defensible reasons to say "no bet" (liquidity, spread width, time to resolution, ambiguous resolution criteria, thin orderbook)?

D. RECOMMENDATION
- Given a 48-hour build, what is the SMALLEST credible, honest evaluation story? Specifically: is a live-holdout calibration harness on unresolved markets more defensible than a retrospective backtest? What can actually be demonstrated in a 5-minute demo without fabricating results?

Write your full findings to TWO files:
- /home/claude/research/STRATEGY_RESEARCH.md  (sections A, C, D)
- /home/claude/research/BACKTEST_PLAN.md      (section B plus a concrete, executable evaluation plan: dataset definition, metrics, baselines, methodology, stated limitations, and exactly what claims we are and are not allowed to make)

For every substantive claim record: claim, source URL, date checked, and a status label from VERIFIED / INFERRED / UNKNOWN / CONFLICTING. If sources disagree, record the conflict rather than silently picking one. Do not assume a strategy is profitable because someone says so.

Also append every source used to /home/claude/research/SOURCES_STRATEGY.md using this record format, one block per source:
id:
topic:
claim:
source:
source_type:
date_checked:
status:
confidence:
summary:
implication:

Create the /home/claude/research directory if it does not exist.

Then return a handoff of UNDER 500 WORDS in exactly this shape (details belong in the files):
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
