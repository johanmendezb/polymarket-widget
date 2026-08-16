# STRATEGY RESEARCH - Polymarket Widget (Sections A, C, D)

Research agent output. **Research only - no application code.**
Date of research: **2026-08-15**. All URLs checked on that date unless noted.
Companion files: `BACKTEST_PLAN.md` (Section B + executable eval plan), `SOURCES_STRATEGY.md` (source records).

Status labels used throughout: **VERIFIED** (read it in the cited source), **INFERRED** (my derivation/synthesis from cited facts), **UNKNOWN** (could not confirm), **CONFLICTING** (credible sources disagree - conflict recorded, not resolved).

---

## TL;DR for the build team

1. **The market price is a strong baseline and you should assume you cannot beat it.** Published live-money and simulated-trading evaluations of frontier LLMs on Polymarket/Kalshi in 2026 are mostly *negative* - models lost money. [S22, S21]
2. **The single most useful published design finding**: the best AI forecaster system (AIA Forecaster) *underperformed market consensus on its own*, but an **ensemble of AI + market consensus beat market consensus alone**. Design the product as "AI adjusts the market price", not "AI replaces the market price". [S16] **VERIFIED**
3. **Retrospective backtesting of an LLM on already-resolved markets is not valid evidence** and "pretend you don't know the answer" prompting does not fix it - measured 52% performance gap between simulated and true ignorance. [S09] **VERIFIED**
4. **Execution costs are large and asymmetric.** Polymarket taker fee is `C × feeRate × p × (1-p)`, feeRate 0–0.07 by category; at p=0.50 in politics that is 1.0¢/share ≈ **2% of stake**, i.e. you need ≥1 probability point of edge before you have made anything. [S24] **VERIFIED**
5. **Use fractional Kelly, never full Kelly.** `f* = (p − q) / (1 − q)` for a binary contract; on a favourite (q=0.90, p=0.95) full Kelly says bet **50% of bankroll**. Estimation error in the mean is ~20× more damaging than error in variance. [S27] **VERIFIED**
6. **For a 48-hour build, the only honest evaluation story is a prospective (live-holdout) harness plus resolution-free diagnostics.** See Section D.

---

# A. FORECASTING QUALITY

## A1. How well calibrated are prediction market prices themselves?

### A1.1 Headline: markets are good, and they are the right baseline

**Claim:** Prediction-market/crowd prices are a strong probabilistic baseline; in ForecastBench, "market" questions have materially lower (better) Brier scores than dataset-derived questions for every forecaster group.
**Evidence:** ForecastBench reports superforecaster median Brier **0.096 overall** (0.118 dataset / **0.074 market**), general public **0.121** (0.153 / 0.089), best LLM at the time (Claude-3.5-Sonnet) **0.122** (0.138 / 0.107), GPT-4o **0.128** (0.186 / **0.069**).
**Source:** https://faculty.wharton.upenn.edu/wp-content/uploads/2026/02/ForecastBench_A_Dynamic_.pdf ; https://arxiv.org/abs/2409.19839
**Date checked:** 2026-08-15 · **Status: VERIFIED**
**Note (important nuance):** on the *market* subset, GPT-4o (0.069) scored *better* than superforecasters (0.074). Market questions are easier and near-term. Do not compare Brier scores across different question sets. [see S29, Section B]

**Claim:** ForecastBench's own scoring treats the *market price* as the difficulty benchmark. Difficulty-adjusted Brier for market questions is computed as `γ̂ⱼ = w_mkt × b_mkt,j + (1 − w_mkt) × γ̂ᴼᴸˢⱼ`, and the public leaderboard uses **w_mkt = 1** - i.e. a model's adjusted score on a market question is literally *its Brier minus the market's Brier*.
**Source:** https://www.forecastbench.org/assets/pdfs/forecastbench_updated_methodology.pdf
**Date checked:** 2026-08-15 · **Status: VERIFIED**
**Implication:** The field's leading benchmark has already converged on exactly the metric we should use: **paired Brier skill vs. the market on the same question at the same time.** Use it.

### A1.2 Favourite–longshot bias: strong, persistent, and horizon-dependent

**Claim:** Prediction-market prices are compressed toward 0.50 - longshots overpriced, favourites underpriced - and the compression grows with time to resolution.
**Evidence:** Analysis of 353M trades / 429k binary contracts (Kalshi 64.7M trades / 210,608 contracts; Polymarket 288.7M trades / ~218k contracts), Jul 2021 – Dec 2025. Universal horizon function rises from **0.99 at 0–1 hour to 1.32 beyond one month**. Calibration slopes: politics 0.93–1.83; sports 0.90–1.10 short/medium but 1.74+ long-horizon; weather **overconfident** at short horizons (0.69–0.97); crypto and finance relatively well calibrated.
**Source:** https://arxiv.org/html/2602.19520v2 (Nam Anh Le, "Decomposing Crowd Wisdom", v2 dated 2026-08-04)
**Date checked:** 2026-08-15 · **Status: VERIFIED (as a preprint claim)**
**Caveat:** single-author arXiv preprint, not peer-reviewed. Treat effect *direction* as well-supported (it replicates a 70-year literature), treat the exact slopes as provisional.

**Claim:** Political markets are the *worst* calibrated by ECE despite having the lowest Brier score. ECE(politics) = **0.117**, "five to fifteen times any other domain". Brier by domain: politics 0.119, finance 0.156, entertainment 0.160, crypto 0.174, weather 0.172, sports 0.185.
**Source:** as above · **Status: VERIFIED (preprint)**
**Implication:** Low Brier ≠ good calibration. Politics markets look accurate because outcomes are often lopsided (low base uncertainty), not because prices are honest probabilities. This is exactly misconception #3 in the Brier-score literature [S29]. **A widget that says "the market is 92%, so it's probably right" is on weaker ground in politics than the Brier score suggests.**

**Claim (independent replication of the bias, with money):** On Kalshi, contracts priced **under 10¢ lose over 60% of stake on average**; low-price contracts win far less often than break-even after fees, high-price contracts win more often.
**Evidence:** 313,972 prices across 46,282 contracts from 12,403 events, 2021–Apr 2025.
**Source:** https://www2.gwu.edu/~forcpgm/2026-001.pdf (Bürgi, Deng, Whelan, Jan 2026)
**Date checked:** 2026-08-15 · **Status: VERIFIED**

**Claim (conflicting direction near expiry):** In sports markets near expiry the bias *reverses* - a Prelec weighting with α̂ > 1, opposite to canonical lottery-choice findings, attributed to insurance demand by holders of losing positions. Contracts are near-perfectly calibrated mid-life but distort sharply in the final ~10 minutes.
**Evidence:** ~23M moneyline trades, NBA/NHL/MLB, Mar–May 2026, Kalshi.
**Source:** https://arxiv.org/html/2607.14430 (Moshrefi, Princeton, 2026-07-15)
**Date checked:** 2026-08-15 · **Status: CONFLICTING (with A1.2 above - and both may be right)**
**Reconciliation (INFERRED):** favourite–longshot compression appears to be a *long-horizon* phenomenon; near expiry a different, opposite distortion dominates. Do not assume a single global bias correction. Any "the market is systematically wrong at price X" heuristic must be conditioned on **domain and time-to-resolution**.

**Claim:** Cross-game parlays on Kalshi are systematically overpriced vs. the product of leg prices, growing ~3% per additional leg; a median 11-leg parlay is ~30% above fair value.
**Source:** https://arxiv.org/html/2607.14430 · **Status: VERIFIED (preprint)**
**Relevance to us:** low - but it is a reminder that the cleanest detectable mispricings are **coherence violations** (products/sums that should be internally consistent), not directional opinions. See D3.

### A1.3 What this means for using price as a probability

- **Use price as the prior, always.** It is the best cheap estimate available. **INFERRED** from A1.1.
- **Do not treat price as a calibrated probability near the extremes.** Below ~0.10 and above ~0.90 both the calibration error and the quoted spread blow up (see C2). **INFERRED** from [S17, S18, S20].
- **Longer horizon ⇒ more compression toward 0.50.** A model that is confident on a >1-month question and disagrees with a mid-priced market is *directionally* consistent with the known bias - which is a reason to be *more* suspicious of confirmation bias, not less. **INFERRED** [S17].

---

## A2. LLM forecasting accuracy vs. markets and vs. human crowds

**This is the section where sources genuinely disagree. I am recording the conflict.**

### A2.1 The optimistic strand: ForecastBench / Forecasting Research Institute

| Date | Finding | Numbers | Status |
|---|---|---|---|
| ForecastBench original (data ~Jul 2024) | Superforecasters beat best LLM | 0.096 vs 0.122 Brier, p<0.001, ~27% gap | VERIFIED [S02] |
| 2026-01-29 | "LLMs are closing the gap" | Superforecasters **0.086** (Brier Index 70.6%) vs best LLMs **0.103** (67.9%); gap 0.017; ~0.015 Brier/yr improvement | VERIFIED [S04, S05] |
| 2026-01-29 | Extrapolated parity | Overall **Nov 2026** (95% CI Jan 2026 – Nov 2027); dataset questions Jun 2026; **market questions Aug 2026** | VERIFIED [S04] |
| 2026-07-16 | "AI models have likely reached parity" | 17 systems exceed superforecasters on dataset questions; bootstrap p-values 0.14–0.41 (cannot reject equality); Cassi AI first model to rank above superforecaster median **on market questions** | VERIFIED [S03] |

**The FRI authors' own caveat, verbatim in substance:** *"95% CIs for many of these submissions overlap substantially; results are more consistent with superforecaster parity than with outperformance"*, and the superforecaster comparison data is **from 2024**, extrapolated forward. [S03] **VERIFIED**

**My read (INFERRED):** FRI is claiming *parity with a 2024 human snapshot*, not *superiority over live humans*, and certainly not *superiority over market prices*.

### A2.2 The pessimistic strand: Metaculus AI Benchmark Tournament

Live, contemporaneous, forward-looking. Pros beat bots **every quarter measured**, and the gap widened:

| Quarter | Questions (compared) | Head-to-head (pros vs bots, peer-score pts) | p |
|---|---|---|---|
| Q3 2024 | 113 | −11.3 (95% CI [−21.8, −0.7]) | 0.036 |
| Q4 2024 | 96 | −8.9 (95% CI [−18.8, 1]) | 0.079 |
| Q1 2025 | 96 | −17.7 (95% CI [−28.3, −7.0]) | 0.0007 |
| Q2 2025 | 93 (of 348 bot questions) | **−20.03** (95% CI [−28.63, −11.41]) | 0.00001 |

All 10 pros placed in the top 10 head-to-head; best bot (metac-o3) placed 11th. Bots were worst on multiple-choice (−32.9), then numeric (−23.2), then binary (−14.8). Metaculus community prediction averages a peer score of 12.9.
**Sources:** https://www.lesswrong.com/posts/Surnjh8A4WjgtQTkZ/q2-ai-benchmark-results-pros-maintain-clear-lead ; https://www.lesswrong.com/posts/rDy5z8ZEtMrEGnfBd/q1-ai-benchmark-results-pro-forecasters-crush-bots
**Date checked:** 2026-08-15 · **Status: VERIFIED**

**FutureEval extrapolation:** bot-vs-pro parity ~**June 2027**, vs ForecastBench's Nov 2026. [S06] **VERIFIED**

### A2.3 The conflict, named

**CONFLICTING.** ForecastBench says parity is here or imminent; Metaculus AIB says pros win by a widening, highly significant margin. The most likely mechanical explanations (**INFERRED**, but supported by [S06]):

1. **Human baseline vintage.** ForecastBench's superforecaster numbers come from a 9-day, 39-forecaster, 200-question experiment in **July 2024**, carried forward. Metaculus pros are forecasting *live, this quarter*, with current news.
2. **Question type.** ForecastBench is binary-only and half auto-generated from time series (ACLED/FRED/DBnomics), which are more amenable to base-rate extrapolation. Metaculus questions are hand-written, include numeric and multiple-choice, and bots do worst on exactly those.
3. **Effort asymmetry.** ForecastBench tournament entrants are optimized, tool-using, ensembled submissions; Metaculus pros are individuals but are the top of the human distribution.

**What both agree on:** the strongest "LLMs match superforecasters" claims lean on **retrospective backtesting against already-resolved questions**, and several such papers "admit to problems with information leakage". Forward-looking leaderboards contradict the strongest claims. [S06] **VERIFIED**

### A2.4 vs. the *market* specifically - the number that actually matters for us

This is the important one and it is **not good news for the "AI beats the market" pitch**:

| Source | Setting | Result | Status |
|---|---|---|---|
| AIA Forecaster (Alur et al., Nov 2025) | ForecastBench + new liquid-market benchmark | **Underperforms standalone market consensus.** BUT: "an ensemble combining AIA Forecaster with market consensus outperforms consensus alone." | VERIFIED [S16] |
| Prediction Arena (Mar 2026) | **Real capital**, 6 frontier models × $10,000, live on Kalshi + Polymarket, 57 days (12 Jan – 9 Mar 2026) | Kalshi returns **−16.0% to −30.8%**; Polymarket cohort-1 average **−1.1%**. Best 3-day paper result +6.02% (Gemini-3.1-pro-preview). Research volume showed **no correlation** with outcomes. | VERIFIED [S22] |
| PolyBench (Apr 2026) | 38,666 Polymarket binary markets / 4,997 events, 6-day snapshot window Feb 2026, order-book execution simulation | **Only 2 of 7 models positive** at $10 lot (MiMo-V2-Flash +17.6% CWR, Gemini-3-Flash +6.2%); 5 lost money. Scaling to $1,000 lots **degraded both winners substantially** due to liquidity limits. | VERIFIED [S21] |
| Halawi et al. (NeurIPS 2024) | 914 test questions from 5 platforms, all resolved ≥ Jun 2023 | System **0.179** vs crowd **0.149** Brier (system 71.5% accuracy vs crowd 77.0%) - **the system lost to the crowd overall** | VERIFIED [S10] |

**Bottom line (INFERRED, strongly supported):** As of Aug 2026 there is **no credible published evidence that a general-purpose LLM pipeline beats liquid prediction-market prices net of costs at scale.** The one robust positive result is *complementarity*: AI + market > market. Build for that.

### A2.5 Where LLMs *do* add value - the conditional results

Halawi et al. reported the conditions under which their system approached or beat the crowd. These are the design targets:

| Condition | System Brier | Crowd Brier |
|---|---|---|
| Overall | 0.179 | 0.149 |
| Crowd prediction in **0.3–0.7** (crowd uncertain) | **0.238** | 0.240 |
| **≥5 relevant articles** retrieved | 0.175 | 0.143 |
| All conditions jointly | **0.240** | 0.247 |

**Source:** https://arxiv.org/pdf/2402.18563 · **Status: VERIFIED**
**Implication (INFERRED):** the AI is competitive *only* where (a) the market is genuinely uncertain (mid-price) and (b) retrieval is rich. Both are cheaply checkable at runtime. **This is a defensible, evidence-backed gating rule for the widget.**

---

## A3. Does retrieval / news access materially improve LLM forecasts?

**Claim:** Yes, retrieval is the largest single lever, larger than fine-tuning.
**Evidence (ablations, Halawi et al.):** full system 0.179; **without fine-tuning 0.186** (+0.007); **without retrieval or fine-tuning 0.206** (+0.027). Optimal k = 15 retrieved article summaries ranked by relevance.
**Source:** https://arxiv.org/pdf/2402.18563 · **Status: VERIFIED**
**Reading (INFERRED):** retrieval is worth roughly **4× more** than fine-tuning in that ablation (0.020 vs 0.007 Brier).

**Claim:** *Which* search provider you use does not reliably matter; *breadth* of research does.
**Evidence:** Metaculus meta-bot analysis across Q1/Q2/Fall 2025 found "best search is uncertain" each season and **no individual provider showed a consistent statistical advantage**. Separately, the Fall 2025 FutureEval survey of 39 bot makers found research breadth correlated with performance **r = 0.42, p = 0.006**; winners averaged **1.75 research sources vs 1.00** for non-winners; 34/39 used frontier models.
**Source:** https://forum.effectivealtruism.org/posts/Spyz3wESZu2eeqhDj/ai-forecasting-in-2026-what-11-analyses-say
**Date checked:** 2026-08-15 · **Status: VERIFIED**
**Caveat:** r=0.42 across 39 bot makers is correlational and confounded with general builder competence.

**Claim (contradicting evidence):** In live trading on real markets, **research volume showed no correlation with outcomes**.
**Source:** https://arxiv.org/abs/2604.07355 (Prediction Arena) · **Status: CONFLICTING** with the above.
**Reconciliation (INFERRED):** retrieval improves *forecast accuracy*; trading returns are dominated by execution and sizing, not accuracy. See C1 - accuracy and profit are different objectives.

**⚠️ Retrieval is also the primary contamination vector.** Reported failure modes: Google date-range filters are "known for temporal leakage"; the Phan et al. "539 paper" results did not replicate, with suspected leakage via "cutoff-date confusion and faulty Google date indexing"; AIA Forecaster authors themselves acknowledged leakage affecting **~1.65% of search results**. [S06] **VERIFIED**. See `BACKTEST_PLAN.md` §B4.

---

## A4. Ensembling and aggregation

**Claim:** An ensemble of many LLMs **matches** a human crowd; it does not beat it.
**Evidence:** 12 LLMs, 31 binary questions, 3-month Metaculus tournament Oct 2023 – Jan 2024, 925 human forecasters. **LLM ensemble Brier 0.20 (SD 0.12) vs human crowd 0.19 (SD 0.19), p = 0.850.**
**Source:** https://arxiv.org/html/2402.19379v6 ; https://www.science.org/doi/10.1126/sciadv.adp1528
**Date checked:** 2026-08-15 · **Status: VERIFIED**
**⚠️ N = 31.** A null result on 31 questions is close to uninformative (see `BACKTEST_PLAN.md` §B2). The paper's own limitations list poor calibration, systematic overconfidence, and **acquiescence bias - predictions skewing above 50% despite balanced outcomes.**

**Claim:** Giving an LLM the human crowd median substantially improves it.
**Evidence:** GPT-4 Brier 0.17 → **0.14** (p=0.003); Claude 2 0.22 → **0.15** (p<0.001). **However**, the updated LLM was still *less* accurate than a simple average of human and machine forecasts.
**Source:** as above · **Status: VERIFIED**
**Implication for the widget (INFERRED, and this is a real design decision):** showing the model the market price improves the model's number - but a **mechanical blend of `market` and `independent AI estimate` beat the LLM-that-saw-the-price.** So: elicit the AI estimate **blind to price**, then blend numerically. Do not let the LLM do the blending. This also preserves a measurable, non-degenerate disagreement signal (if the model sees the price it will largely echo it, and your "edge" metric becomes meaningless).

**Claim:** Ensembling multiple samples of the same model is standard and cheap. Halawi used **6 forecasts aggregated via trimmed mean** (3 base + 3 fine-tuned). Metaculus bot infrastructure **aggregates 5 forecasts** per question.
**Source:** [S10, S06] · **Status: VERIFIED**
**Guidance (INFERRED):** ~5 samples with a trimmed mean or median-of-log-odds is the well-trodden default. The variance across samples is *also* a free, useful quantity - use it as an epistemic-uncertainty proxy for the no-bet gate. Supported by [S14], which found a learned uncertainty measure "reliably predicted forecasting errors better than verbalized confidence."

---

## A5. Prompting / scaffolding: what actually has a measurable effect

**Claim:** Prompt engineering produces small, real, but *not decisive* effects; some popular techniques actively hurt.
**Evidence:** 37 prompting approaches × 4 models (Claude 3.5 Sonnet, GPT-4o, Claude 3.5 Haiku, Llama 3.1 405B), 100 binary ForecastBench questions resolving Dec 2024.

| Technique | Brier effect | Direction |
|---|---|---|
| **Frequency-Based Reasoning** | −0.014 to −0.019 | **helps (significant)** |
| **Base Rate First** | −0.011 to −0.016 | **helps (significant)** |
| **Step-Back** | −0.011 to −0.015 | **helps (significant)** |
| Most others (CoT, premortem, Fermi, emotional/tipping, simulated debate…) | within ±0.009 | negligible |
| **Propose-Evaluate-Select** | **+0.028 to +0.033** | **hurts (significant)** |
| **Bayesian Reasoning** (explicit) | **+0.025 to +0.030** | **hurts (significant)** |

Authors' conclusion: *"In the context of complex tasks like forecasting, basic prompt refinements alone offer limited gains."*
**Source:** https://arxiv.org/pdf/2506.01578 (Schoenegger, Jones, Tetlock, Mellers)
**Date checked:** 2026-08-15 · **Status: VERIFIED**

**Corroborating null:** Metaculus's automated prompt-engineering work (Part 1, May 2025) found large gains on GPT-4.1-nano (~18 pts), moderate on 4.1, none on R1 - and **Part 2 (Feb 2026) failed to replicate in live Fall 2025 evaluation (null result).** [S06] **VERIFIED**
**Reading (INFERRED):** prompt-optimization gains are largest on weak models and largely evaporate on frontier models and in live settings. Budget accordingly: pick `base rate first` + `frequency framing` + `step-back`, and stop.

**Claim: post-hoc statistical recalibration is a bigger and more reliable lever than prompting.**

| Method | Effect | Source | Status |
|---|---|---|---|
| Platt scaling on bot forecasts (Metaculus, May 2026) | **−0.016 Brier** on binary (p<0.001), −0.005 on MC (p<0.001) | [S06] | VERIFIED |
| Platt scaling (Phan, external validation) | 0.0999 → 0.0934 | [S06] | VERIFIED |
| **Beta-Bernoulli Calibrator** on Claude-Sonnet-4 | **0.146 → 0.125 (−14.4%)**, AUC 72.3% → 74.2%; beat Platt and isotonic; generalized OOD to Kalshi where they failed | [S14] | VERIFIED |
| Extremizing aggregate (Neyman, resolution baseline) on 899 resolved Metaculus binaries | 0.106 vs Metaculus 0.111 vs plain mean-of-log-odds 0.116 | [S30] | VERIFIED |
| AIA Forecaster architecture | explicitly includes "statistical calibration countering LLM behavioural biases" and "extremizing techniques addressing overconfidence" as 2 of its 4 components | [S16] | VERIFIED |

**Beta-Bernoulli training data:** 11,355 resolved binary questions from Metaculus + Polymarket, split train 7,824 / val 1,917 / test 1,614, **test resolving after Aug 2025** to avoid leakage. [S14] **VERIFIED**

**⚠️ Extremizing warning (INFERRED):** the recommended extremization factor d ≈ √3 ≈ 1.73 is derived for **n > 50 independent forecasters** [S30]. **Five samples from one model are not 50 independent forecasters** - they are heavily correlated. Extremizing a 5-sample self-ensemble is very likely to make calibration worse. Do not extremize in v1.

**⚠️ Recalibration warning (INFERRED):** every recalibration method above requires a **training set of resolved questions**. In a 48-hour build you will not have an uncontaminated one. Ship the calibrator as *architecture with an identity transform*, and be explicit that it is unfitted.

### A5 practical recipe (INFERRED synthesis, cite-backed components)
1. Elicit **blind to market price** (avoids anchoring; preserves a real disagreement signal) - [S11] Study 2 rationale.
2. Prompt with **base rates / reference class first**, **frequency framing**, and **step-back**. Avoid explicit "do Bayesian reasoning" and propose-evaluate-select. - [S12]
3. Retrieve **~10–15 ranked, date-filtered news snippets**; enforce a hard publication-date cutoff. - [S10]
4. Sample **~5 times**, aggregate by **median of log-odds or trimmed mean**. - [S10, S06]
5. Record **sample dispersion** as an uncertainty estimate; feed it to the no-bet gate. - [S14]
6. **Blend numerically with the market price** in log-odds space with a fixed weight. - [S16, S11]
7. **Do not extremize.** **Do not fit a calibrator** you cannot validate.

---

# C. EDGE AND EXECUTION

## C1. Defining edge honestly

The core mistake to avoid: **Brier improvement is not profit.** Prediction Arena models made plausible forecasts and lost 16–31% of real capital on Kalshi over 57 days [S22]; PolyBench found 5 of 7 models lost money "despite high confidence scores" [S21]. Accuracy and P&L are different objectives with different failure modes.

### C1.1 The cost stack (all VERIFIED against Polymarket docs)

**Fee formula (Polymarket global):** `Fee = C × feeRate × p × (1 − p)`, charged to **takers only** - *"Makers are never charged fees. Only takers pay fees."*

| Category | feeRate | Fee/share at p=0.50 | As % of stake |
|---|---|---|---|
| Geopolitical / world events | **0** | 0 | 0% |
| Finance / Politics / Mentions / Tech | 0.04 | $0.0100 | 2.0% |
| Sports / Economics / Culture / Weather / Other | 0.05 | $0.0125 | 2.5% |
| Crypto | 0.07 | $0.0175 | 3.5% |

Fees are rounded to 5 dp, minimum charged fee 0.00001 USDC; trades near extreme probabilities may incur no fee. No Polymarket deposit/withdrawal fee for USDC (third parties may charge).
**Source:** https://docs.polymarket.com/trading/fees.md · **Date checked:** 2026-08-15 · **Status: VERIFIED**

**Polymarket US entity** uses a different presentation of the same shape: `Fee = Θ × C × p × (1−p)`, taker **Θ = 0.06** (max $1.50 per 100 contracts at $0.50), **maker rebate Θ = −0.0125** (−$0.31 per 100), banker's rounding to $0.01; taker volume rebates 10%/25%/50% at $250K/$1M/$10M monthly.
**Source:** https://docs.polymarket.us/fees · **Status: VERIFIED**
**⚠️ CONFLICTING between entities** - global docs and US docs give different coefficients and different maker treatment. **Do not hardcode a fee constant. Read it from the API** (`GET /fee-rate`, and `get-clob-market-info` returns per-market fee params). [S24]

### C1.2 The honest edge equation

For buying YES at ask `a` with fee-per-share `φ = feeRate · a · (1−a)`:

```
effective_cost_per_share  q = a + φ + slippage
edge_probability          e = p̂ − q
expected_value_per_share  EV = p̂ · 1 + (1 − p̂) · 0 − q = e
EV as % of capital deployed = e / q
```

Symmetrically for NO at ask `a_no`: `e = (1 − p̂) − (a_no + φ_no + slippage)`.

**Break-even true probability** is therefore `p_BE = a + φ + slippage`, **not** `a`. **INFERRED** (direct arithmetic from the VERIFIED fee formula).

Concretely: a politics market quoted 0.50/0.52, buying YES at 0.52 →
`φ = 0.04 · 0.52 · 0.48 = 0.00998`, `q ≈ 0.530`. You need `p̂ > 0.530` to have any EV at all, and `p̂ > 0.55` before the edge exceeds plausible model error.

### C1.3 Spread and slippage - bigger than fees on most markets

**Claim:** Quoted spreads on Polymarket are wide in the tails and non-trivial in the middle; median quoted **half-spread ≈ 400 bps in the central [0.4, 0.6] range, rising to 1,300–1,800 bps for markets below 0.10**.
**Claim:** But depth is layered, not top-heavy (median top-of-book share 0.137, near a uniform-grid benchmark), maker liquidity is decentralised (median Herfindahl 0.031 ≈ **32 effective makers**), and on the **top-100 volume stratum the median effective half-spread is ≈ 0** (−0.0003 probability points).
**Claim (methodology warning):** effective-spread sign flips between the public WebSocket feed and on-chain trade direction on **67% of markets** - public-feed trade classification is unreliable.
**Claim:** self-counterparty wash trading is low: median 0.97%, p90 4.5%, p99 10.6%, max 22.2% - far below crypto-exchange benchmarks of 25–70%.
**Source:** https://arxiv.org/html/2604.24366v1 (Dubach, 2026-08-11) · **Date checked:** 2026-08-15 · **Status: VERIFIED (preprint)**
**⚠️ Unit ambiguity:** the paper's "bps" for half-spread could be basis points of probability (400 bps = 4 probability points) or of price. I could not disambiguate from the fetched text. **Status: CONFLICTING/UNRESOLVED.** *Engineering consequence: do not import this number. Compute the spread live from `GET /book`.* Either reading supports the same conclusion: **the median market is untradeable and only the top-volume tail is tight.**

**Claim (independent, Kalshi):** Makers earn **−9.64%** average returns; takers earn **−31.46%** - a **21.8 pp** advantage to posting rather than crossing. Overall average return across all Kalshi contracts ≈ **−20%**. Even "informed" traders (makers on contracts ≥ 50¢) earn only ~**+2.6%**.
**Source:** https://www2.gwu.edu/~forcpgm/2026-001.pdf · **Status: VERIFIED**
**Implication (INFERRED):** the average participant loses ~20%; the taker/maker split says most of that is **execution, not forecasting**. For a *simulated* bet widget, the honest choice is to **quote the taker price** (the price a user would actually get) and show the fee explicitly. Quoting mid-price is the single easiest way to fabricate an edge that does not exist.

### C1.4 Liquidity/size effect
**Claim:** Position scaling from $10 to $1,000 lots "degraded both models' performance substantially due to liquidity constraints" on Polymarket.
**Source:** https://arxiv.org/html/2604.14199v1 (PolyBench) · **Status: VERIFIED (preprint)**
**Implication:** any EV figure must be quoted **at a stated size**, walked through the actual order book, not against top-of-book.

---

## C2. Kelly and fractional Kelly for binary outcomes

### C2.1 The formula

Buying a binary contract at effective all-in price `q` (including fee + slippage) that pays $1:
- net odds `b = (1 − q)/q`
- Kelly fraction of bankroll:

```
f* = (p̂·b − (1 − p̂)) / b  =  (p̂ − q) / (1 − q)  =  edge / (1 − price)
```

**Status: INFERRED** (standard Kelly algebra specialised to a $1-payout binary contract; consistent with the framework in [S27]).

### C2.2 Why full Kelly is wrong here - a concrete illustration

`f* = e / (1 − q)` means the denominator collapses on favourites:

| q (effective price) | p̂ | edge e | **full Kelly f*** |
|---|---|---|---|
| 0.50 | 0.55 | 0.05 | 10.0% of bankroll |
| 0.70 | 0.75 | 0.05 | 16.7% |
| 0.90 | 0.95 | 0.05 | **50.0%** |
| 0.95 | 0.98 | 0.03 | **60.0%** |

**A 5-point disagreement with a 90¢ market instructs you to bet half your bankroll.** No LLM probability estimate is accurate to ±5 points at q=0.90 - and that region is precisely where market calibration error and spreads are worst (§A1.2, §C1.3). **INFERRED.**

### C2.3 What the literature says about shrinking Kelly

**Claim:** Errors in estimating the *mean* are vastly more damaging than errors in variance/covariance - roughly a **20 : 2 : 1** importance ratio (mean : variance : covariance). Consequence stated by the authors: *"estimates must be accurate and to be on the safe side, the size of the wagers should be reduced."*
**Claim:** Full Kelly bets can be an enormous fraction of wealth (the paper cites a real 64%-of-wealth racetrack bet).
**Claim:** **Betting exactly 2× Kelly yields zero excess return over the risk-free rate in continuous time** - overbetting destroys growth, and the penalty is asymmetric (overbetting is much worse than underbetting).
**Claim:** Half-Kelly reduces P(double before halving) from 0.67 → 0.50 while cutting relative growth rate only 1.00 → 0.75.
**Source:** MacLean, Thorp & Ziemba, "Good and Bad Properties of the Kelly Criterion" - https://www.stat.berkeley.edu/~aldous/157/Papers/Good_Bad_Kelly.pdf ; https://www.worldscientific.com/doi/abs/10.1142/9789814293501_0039
**Date checked:** 2026-08-15 · **Status: VERIFIED**

**Claim (assumptions Kelly needs, all violated here):** Kelly assumes (i) the probability `p` is *known*, not estimated; (ii) repeated independent bets; (iii) infinitely divisible stakes; (iv) log-utility / long-horizon growth maximisation; (v) no adverse selection.
**Status: INFERRED** (standard; the "known p" assumption is the one [S27] attacks directly).
In prediction markets, (i) is badly false, (ii) is false (correlated markets: many politics markets share a driver), and (v) is false (your fill happens because someone chose to take the other side - see the −31% taker return in [S18]).

**Claim:** With genuine uncertainty about `p` (e.g. a posterior over `p`), the growth-optimal fraction is **strictly smaller** than plugging the posterior mean into the Kelly formula, because `E[log(1 + f·X)]` is concave in the payoff and Jensen's inequality bites.
**Status: INFERRED** (standard result; directionally consistent with [S27]'s "reduce the wagers" prescription). Not separately sourced - flag if it matters.

### C2.4 Recommendation for the widget
- Display **fractional Kelly at ¼ (default) and ½ (aggressive)**, never full. Justification: [S27] half-Kelly growth/security trade-off + estimation-error dominance.
- **Hard cap** per market (e.g. 2% of bankroll) that overrides Kelly.
- **Shrink the estimate before sizing**, not after: blend `p̂` toward the market price in log-odds. This shrinks edge and Kelly simultaneously and is the same operation as the AI+market ensemble in [S16].
- Show the *full-Kelly* number greyed out next to the fractional one, with the 2×-Kelly-⇒-zero-excess-return fact as a tooltip. It is an honest, memorable teaching moment for the demo.

---

## C3. Defensible "NO BET" filters

Each of these is checkable from Polymarket API data at request time and each has a cited justification. **This gate is the most defensible piece of the whole product**: it does not require any resolved outcomes to be correct, so it cannot be accused of contamination.

| # | Filter | Rule of thumb | Justification | Status |
|---|---|---|---|---|
| 1 | **Edge below cost** | `p̂ − (ask + fee + slippage) ≤ 0` | Arithmetic; fee formula [S24] | VERIFIED (formula) / INFERRED (rule) |
| 2 | **Spread too wide** | reject if `(ask − bid)` exceeds a threshold, or exceeds the claimed edge | Median markets have wide quoted spreads; only top-volume stratum tight [S20] | VERIFIED |
| 3 | **Insufficient depth at size** | walk the book; reject if filling the intended size moves price > X | $10 → $1,000 scaling degraded returns [S21] | VERIFIED |
| 4 | **Extreme price band** | reject `price < 0.10` or `> 0.90` in v1 | Contracts <10¢ lose >60% on Kalshi [S18]; spreads 3–4× wider below 0.10 [S20]; Kelly explodes at the top end (§C2.2) | VERIFIED (inputs) |
| 5 | **Long horizon** | flag if resolution > ~1 month | Market compression toward 0.5 rises to 1.32 beyond 1 month [S17]; model news advantage decays | VERIFIED (input) |
| 6 | **Market not uncertain enough for AI to help** | require market price ∈ [0.30, 0.70] for a *positive* recommendation | AI only competitive in that band in Halawi's own conditional analysis [S10] | VERIFIED |
| 7 | **Thin retrieval** | require ≥5 relevant, dated articles | Halawi's ≥5-article condition [S10] | VERIFIED |
| 8 | **High model dispersion** | reject if the 5-sample spread of `p̂` is large | Learned uncertainty predicts forecast error better than verbalized confidence [S14] | VERIFIED |
| 9 | **Ambiguous resolution criteria** | flag markets whose rules are vague / rely on a subjective source | UMA disputes escalate to a 4–6 day token-holder vote; a "50-50" resolution exists where "neither outcome applicable" [S26]; auto-resolution error rate 4.9% (95% CI 1.6–9.8%) and annulment ~3.9–8% [S15] | VERIFIED |
| 10 | **Near-expiry sports** | avoid the final minutes of sports markets | Calibration goes step-like and distorts in the final 10 minutes [S19] | VERIFIED (preprint) |
| 11 | **Category fee** | prefer fee-free geopolitical markets, penalise crypto (0.07) | Fee schedule [S24] | VERIFIED |

**Resolution risk detail (VERIFIED, [S26]):** Polymarket resolves via the UMA optimistic oracle. Undisputed: proposal + **$750 bond**, **2-hour** challenge window, then auto-resolves. One dispute: **4–6 days**. Two disputes: escalation to UMA's DVM token-holder vote (24–48h debate in Discord + ~48h voting). Rare "Unknown/50-50" outcomes pay $0.50 both sides. **This is a real, quantifiable tail risk in any EV calculation and must be disclosed in the widget, not modelled as zero.**

---

# D. RECOMMENDATION - the smallest credible, honest evaluation story for 48 hours

## D1. The direct answer

> **Yes - a live-holdout calibration harness on *unresolved* markets is substantially more defensible than a retrospective backtest, and it is the only option I can recommend without qualification.**

The reason is not aesthetic. It is that a retrospective backtest of an LLM on already-resolved markets is **measuring the wrong thing**, and there is a 2026 paper that quantifies exactly how wrong:

**Claim:** Instructing a model to suppress post-cutoff knowledge ("Simulated Ignorance") does not reproduce genuine ignorance. Across 477 competition-level forecasting questions and 9 LLMs, cutoff instructions left a **52% performance gap between Simulated Ignorance and True Ignorance**. Chain-of-thought did not suppress prior knowledge *even when reasoning traces contained no explicit post-cutoff references*, and **reasoning-optimised models had *worse* SI fidelity**. The authors recommend against retrospective setups using SI entirely and call it "methodologically flawed."
**Source:** https://arxiv.org/abs/2601.13717 (Li, Wang, El Lahib, Xia, Pi; 2026-01-20)
**Date checked:** 2026-08-15 · **Status: VERIFIED**

Combined with [S06]'s survey finding that the strongest "LLMs match superforecasters" claims all rest on retrospective evaluation with admitted leakage, **presenting a retrospective backtest as evidence in this project would be actively misleading, and a knowledgeable reviewer will say so.** Detail and mitigations in `BACKTEST_PLAN.md` §B4.

## D2. What "live-holdout" means concretely, and why it is achievable in 48 hours

The insight that makes this fit in the time budget: **you do not need resolutions to ship a credible harness. You need a tamper-evident commitment.**

1. **Freeze.** At time T, snapshot N unresolved markets (market id, question text, resolution criteria, bid/ask/mid, order-book depth, close date, category, fee rate).
2. **Predict.** Run the pipeline, store `p̂`, per-sample forecasts, retrieved sources with publication dates, the gate decision, and the recommended fractional-Kelly size.
3. **Commit.** Write a manifest and **hash it** (SHA-256 of the JSONL) into the repo and the demo output. This is the anti-cherry-picking device - it costs 10 lines of code and it is the single most persuasive thing in the whole package.
4. **Wait.** Resolutions arrive on their own schedule. Have a `resolve.py` that fills in outcomes later and recomputes metrics.
5. **Report honestly at demo time**: "N=X predictions are locked and hashed as of {timestamp}. Y have resolved. Here is the paired Brier skill score vs market with its 95% CI - and here is why that CI is too wide to conclude anything yet."

**That last sentence is the deliverable.** A team that ships a harness *and correctly states that it has not yet produced a conclusion* is more credible than a team that ships a backtest showing a 12% return.

## D3. The under-appreciated move: metrics that need no resolutions at all

These are measurable **on day one**, are immune to contamination and to look-ahead bias (there is no future to look ahead to), and demo beautifully in five minutes. **Status: INFERRED** (my synthesis; each is grounded in a cited concern).

| Metric | What it measures | Why it's honest | Grounding |
|---|---|---|---|
| **Complementary coherence**: does `p̂(YES) + p̂(NO) = 1` when the model is asked each side independently? | Internal consistency / framing sensitivity | No outcome needed; a genuine failure if violated | Acquiescence bias (>50% skew) documented in [S11] |
| **Multi-outcome coherence**: for a grouped Polymarket event, do independently elicited `p̂` sum to 1? | Same, harder | Directly analogous to the parlay-coherence violations that *are* real detectable mispricings [S19] | [S19] |
| **Sample dispersion** across k seeds | Epistemic uncertainty of the estimate | Feeds the no-bet gate; validated as a better error predictor than verbalized confidence | [S14] |
| **Blind-vs-anchored delta**: `p̂` elicited without the price vs with it | How much the model is just echoing the market | Quantifies whether your "edge" is real or an anchoring artifact | [S11] Study 2 |
| **Disagreement distribution** `|p̂ − mid|` vs market | Whether the system produces any signal at all | If it's a spike at 0, you have a price-echo, not a forecaster | INFERRED |
| **Gate firing rate & reason histogram** | The economics of abstention | Verifiable live against the API | §C3 |
| **Cost-adjusted edge waterfall** for a single market | mid → ask → +fee → +slippage-at-size → surviving edge | Pure arithmetic on live data, checkable on screen | [S24, S20, S21] |

**A five-minute demo built on the above contains zero unverifiable claims.**

## D4. What to demo, in order (5 minutes)

1. **(0:00–0:45) Search + select an outcome.** Live Gamma/CLOB API.
2. **(0:45–1:45) The forecast.** Show the blind estimate, the 5 samples, the dispersion, the retrieved dated sources. Show the market price appearing *after* the estimate.
3. **(1:45–3:00) The edge waterfall.** mid → ask → fee (from API, with the `feeRate·p·(1−p)` formula on screen) → depth walk at the chosen size → surviving edge. Then the sizing panel: ¼-Kelly (default), ½-Kelly, full-Kelly greyed out with the "2× Kelly ⇒ zero excess return" note.
4. **(3:00–4:00) The gate.** Deliberately pick a market that gets rejected. Show *which* rule fired and the citation behind it. **A product that refuses to bet is the most credible thing you can show.**
5. **(4:00–5:00) The harness.** Show the frozen, hashed manifest; N committed, Y resolved; the paired Brier-skill-vs-market plot with its honest, embarrassingly wide CI; and the reliability diagram with visible per-bin counts. Say out loud: *"this is not yet evidence of skill; here is the N we would need."* (See `BACKTEST_PLAN.md` §B2 - roughly **200–500 paired questions** for a 0.01–0.02 Brier difference.)

## D5. Claims we may make, and claims we may not

**MAY (all supported):**
- "The market price is our baseline and we score against it on the same question at the same timestamp."
- "Our pipeline abstains on X% of markets, for these enumerated reasons."
- "Here is the edge net of the actual fee formula and the actual order book at this size."
- "Published evidence says AI *combined with* market consensus beats market consensus alone; that is the design we implemented." [S16]
- "Our forecasts are committed and hashed before resolution."

**MAY NOT:**
- Any profitability claim, backtested or otherwise.
- "Our AI beats the market" - nobody has shown this at scale net of costs [S22, S21, S16, S10].
- Any Brier number computed on markets that resolved before the model's training cutoff [S09].
- Any comparison of our Brier to a published Brier from a different question set [S29].
- Any claim from a run whose configuration was chosen after seeing outcomes.

## D6. Risks specific to this build
- **Anchoring collapse**: if the price leaks into the prompt (via a retrieved article, the market slug, or the question text), `p̂` becomes an echo and every downstream metric is meaningless. Test for it (D3, blind-vs-anchored delta).
- **Resolution latency**: many Polymarket markets close months out. Deliberately seed the frozen set with **short-horizon** markets (days) so *something* resolves before the demo. This is a legitimate design choice, but it must be disclosed as a horizon-selection decision, not hidden.
- **Fee/entity confusion**: global vs US fee schedules differ [S24 vs S25]. Read from the API.
- **The "no bet" answer is the product.** If the gate never fires, the gate is decorative.

---

*End of STRATEGY_RESEARCH.md*
