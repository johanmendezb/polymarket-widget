# BACKTEST / EVALUATION PLAN - Polymarket Widget (Section B + executable plan)

Research agent output. **Research only - no application code.**
Date of research: **2026-08-15**. Companion: `STRATEGY_RESEARCH.md` (A, C, D), `SOURCES_STRATEGY.md`.

Status labels: **VERIFIED** / **INFERRED** / **UNKNOWN** / **CONFLICTING**.

---

## The one-paragraph version

Score the AI against the **market price on the same market at the same timestamp**, paired, using Brier score and log loss, with **bootstrap confidence intervals**, on markets whose outcomes were **unknown at prediction time**. Report a reliability diagram with visible per-bin counts. Expect the confidence intervals to be uninformative at any N you can gather in 48 hours - **say so**. A retrospective backtest of an LLM on already-resolved markets is not a valid substitute; there is 2026 evidence that "pretend you don't know the answer" prompting leaves a **52%** performance gap versus true ignorance. The deliverable is a *harness plus a pre-committed frozen forecast set*, not a result.

---

# B1. Metrics - what to use and what each one actually tells you

## B1.1 Brier score

`BS = (1/N) Σ (pᵢ − yᵢ)²`, y ∈ {0,1}, range [0,1], lower better.

**Use it because** it is the field standard: ForecastBench, Metaculus, and every paper in `SOURCES_STRATEGY.md` report it, so our numbers are at least *shaped* like the literature's.

**But know its five documented misconceptions** (Hoessly, *Global Epidemiology*, 2026-01-07 - https://pmc.ncbi.nlm.nih.gov/articles/PMC12818272/, **VERIFIED**):
1. BS = 0 does not mean "perfect model" - it means model misspecification (requires 0/1 predictions).
2. **Lower BS does not always mean better model** - comparisons across datasets with different outcome distributions are misleading.
3. **Low BS does not imply good calibration.** These measure different things; calibration needs dedicated metrics.
4. BS near `ȳ − ȳ²` does not mean the model is useless.
5. BS *can* exceed `ȳ − ȳ²` by chance.

The paper's core point: BS simultaneously reflects (a) the underlying true-probability distribution, (b) prediction accuracy, and (c) random Bernoulli variation. Their recommendation: **combine metrics** - calibration curves, calibration-in-the-large, discrimination (c-index), decision-curve/net-benefit, and bootstrap CIs - and restrict comparisons to identical populations. They explicitly do **not** recommend cross-dataset comparison even with the scaled Brier.

**Direct consequence for us (INFERRED):** we may never say "our Brier of 0.14 beats the 0.149 crowd figure in Halawi et al." Different questions, different difficulty. **The only legitimate comparison is paired, on our own question set.**

**Real-world illustration of misconception #3 (VERIFIED, [S17]):** politics markets have the *lowest* Brier of any domain (0.119) and the *worst* calibration error (ECE 0.117, "five to fifteen times any other domain").

## B1.2 Log loss (negative log score)

`LL = −(1/N) Σ [yᵢ log pᵢ + (1−yᵢ) log(1−pᵢ)]`

- **Pro:** strictly proper, the natural score in log-odds space (which is where you should be blending and shrinking anyway), heavily penalises confident errors.
- **Con:** infinite at p ∈ {0,1}. **Clip to [0.01, 0.99]** and state the clipping - the clip is a modelling choice that materially changes the number.
- **Recommendation:** report both. Brier for comparability with the field, log loss because a single overconfident blow-up on a 0.02-priced market should hurt visibly and Brier under-penalises it. **INFERRED.**

## B1.3 Murphy decomposition (reliability / resolution / uncertainty)

`BS = Reliability − Resolution + Uncertainty`, computed over K bins:
- **Uncertainty** `= ȳ(1 − ȳ)` - a property of the *question set*, not the forecaster. This is the term that makes cross-dataset Brier comparison invalid.
- **Reliability** `= (1/N) Σ nₖ (p̄ₖ − ȳₖ)²` - miscalibration. Lower better. **Fixable by post-hoc recalibration.**
- **Resolution** `= (1/N) Σ nₖ (ȳₖ − ȳ)²` - discrimination/sharpness. Higher better. **Not fixable by recalibration - this is the real skill.**

**Why this matters more than the headline Brier for our use case (INFERRED, supported by [S06]):** Metaculus's Q4 2024 analysis concluded *"the Pro advantage is discrimination, not calibration."* If our AI's deficit vs the market is **reliability**, it is a solvable calibration problem. If it is **resolution**, the AI has no information the market lacks and the product has no forecasting edge (though it may still have UX value). **Report the decomposition; it is the diagnostic that tells the build team what to do next.**

**⚠️ Binned decomposition is biased at small N.** With few samples per bin, reliability is biased upward and resolution downward. There is a literature on variance estimation and extra decomposition terms - see https://ar5iv.arxiv.org/html/1303.6182 and https://journals.ametsoc.org/doi/abs/10.1175/2007WAF2006116.1 (Ferro & Fricker; Stephenson et al., "Two Extra Components in the Brier Score Decomposition", *Weather and Forecasting* 2008). **Status: VERIFIED (that these papers exist and address this); INFERRED (magnitude at our N).** At N < ~200 **treat the decomposition as directional only.**

## B1.4 Calibration curves / reliability diagrams

Bin forecasts (equal-width or equal-count), plot mean forecast vs observed frequency, with the 45° line.

**Mandatory presentation rules (INFERRED, from binomial arithmetic + [S29]'s "combine metrics" recommendation):**
- **Always show per-bin counts** (histogram beneath, or point size ∝ n). A reliability diagram without counts is the single most common way to mislead with a small sample.
- **Always show per-bin binomial CIs** (Wilson or Jeffreys - not Wald, which is broken at extremes and small n).
- Do the arithmetic: with N=100 and 10 equal-width bins, ~10 forecasts/bin, binomial SE at p=0.5 is `√(0.25/10) ≈ 0.158`. **A ±16-point error bar on every point.** Getting to SE ≈ 0.05 needs ~100 per bin, i.e. **~1,000 forecasts for a 10-bin diagram.**
- With N < 200, use **3–5 equal-count bins**, not 10 equal-width bins.
- **Equal-count binning** is more honest at small N than equal-width, because equal-width bins in the extremes will be empty or nearly so - and the extremes are exactly where prediction-market prices concentrate.

## B1.5 Expected Calibration Error (ECE)
Useful as a single number (and [S17] uses it), but binning-dependent and biased at small N. Report it **with** the bin scheme stated, never alone.

## B1.6 Which metrics for a *small demo dataset* - the recommendation

| Priority | Metric | Rationale |
|---|---|---|
| 1 | **Paired Brier difference vs market**, mean + bootstrap 95% CI | The only comparison immune to question-difficulty confounding (§B1.1) |
| 2 | **Brier Skill Score vs market**, bootstrap CI | Interpretable framing of the same thing (§B3) |
| 3 | **Log loss** (clipped), paired | Catches confident blow-ups |
| 4 | **Reliability diagram**, 3–5 equal-count bins, counts + Wilson CIs visible | Honest calibration picture |
| 5 | **Murphy decomposition**, labelled "directional only at this N" | Tells you *what* to fix |
| 6 | **Resolution-free diagnostics** (see §B7) | The only things with useful precision at N≈50 |

**Do NOT lead with:** accuracy, AUC/c-index, win rate, or simulated P&L. Accuracy discards probability information. Win rate is trivially gameable by only betting favourites. Simulated P&L at small N is dominated by a handful of lucky resolutions and is the number a reviewer will attack first.

---

# B2. Sample size - how many resolved markets do you actually need?

## B2.1 The published answer

**Claim:** "verification sample sizes of a **few hundred** forecast–observation pairs are needed to establish that a forecast is skillful." With **50 pairs** and a rare (5%) event, the estimated 95% CI for the Brier Skill Score covers **[−0.26, +0.57]**. Reliable estimates generally need **400+** samples; below ~300 significant deviations occur for rare events.
**Source:** Bradley, Schwartz & Hashino, "Sampling Uncertainty and Confidence Intervals for the Brier Score and Brier Skill Score", *Weather and Forecasting* 23(5), 2008 - https://journals.ametsoc.org/view/journals/wefo/23/5/2007waf2007049_1.xml
**Date checked:** 2026-08-15 · **Status: VERIFIED**

**Read that CI again: [−0.26, +0.57] at N=50.** That interval contains "much worse than the baseline" and "dramatically better than the baseline" simultaneously. **Any single-number claim from a 50-market demo is noise.**

## B2.2 Power calculation for *our* comparison

We are doing a **paired** test, which is much more efficient than the unpaired case above, because the AI and market forecasts on the same market are highly correlated - most of the question-difficulty variance cancels.

Per market, define `dᵢ = (p_aiᵢ − yᵢ)² − (p_mktᵢ − yᵢ)²`. Test `mean(d) < 0`.

`n ≈ (z_{1−α/2} + z_{1−β})² · σ_d² / δ²`, with `(1.96 + 0.84)² = 7.84` for 80% power at α=0.05 two-sided.

| Detectable Brier difference δ | σ_d = 0.05 | σ_d = 0.08 | σ_d = 0.12 |
|---|---|---|---|
| 0.005 | 784 | 2,007 | 4,516 |
| **0.010** | **196** | **502** | **1,129** |
| **0.020** | **49** | **126** | **282** |
| 0.050 | 8 | 20 | 46 |

**Status: INFERRED** (standard paired-t power formula; σ_d must be estimated from our own data).

**Calibrating expectations against the literature (VERIFIED inputs):**
- The superforecaster-vs-best-LLM gap in ForecastBench is **0.017–0.026 Brier** [S02, S04].
- Platt-scaling recalibration bought **0.016 Brier** [S06].
- The best prompting techniques bought **0.011–0.019 Brier** [S12].
- The "Silicon Crowd" ensemble-vs-crowd difference was **0.01 Brier at N=31, p=0.850** [S11].

So the effects we care about are **~0.01–0.02 Brier**, which the table says needs **roughly 130–500 paired markets** - and that assumes we did not peek. **In 48 hours we will have tens, not hundreds.** This is the central, non-negotiable limitation of the deliverable.

**Also note [S11] as the cautionary tale:** a published *Science Advances* paper reported a 0.20 vs 0.19 difference at **N=31** and correctly declined to call it a difference (p=0.850). We should behave the same way, with less data.

## B2.3 Effective N is smaller than nominal N
**INFERRED.** Prediction markets are correlated: multiple markets on one election, one match, one Fed decision share a single underlying event. Twenty markets on the same election night are closer to **one** independent observation than twenty. Mitigations: (i) cap markets per event/day; (ii) **cluster-bootstrap by event, not by market**; (iii) report both nominal N and number of distinct events. Failing to do this is the most likely way our own numbers will be wrong in our favour.

---

# B3. Comparing AI against the market baseline honestly

## B3.1 The comparison the field already uses

**Claim:** ForecastBench's difficulty-adjusted Brier for market questions is `γ̂ⱼ = w_mkt·b_mkt,j + (1 − w_mkt)·γ̂ᴼᴸˢⱼ`, with the public leaderboard using **w_mkt = 1**, then rescaled so that always-0.5 maps back to 0.25.
**Source:** https://www.forecastbench.org/assets/pdfs/forecastbench_updated_methodology.pdf · **Status: VERIFIED**
**Meaning:** the leading benchmark's headline market-question metric **is** "your Brier minus the market's Brier on the same question." We should do exactly this, and we can say we are following ForecastBench's methodology - which is good for the write-up.

## B3.2 The three numbers to report

1. **Paired mean difference**: `mean(BS_ai − BS_mkt)`, negative = AI better. Report with **cluster-bootstrap 95% CI** (10,000 resamples, resampled by *event*).
2. **Brier Skill Score vs market**: `BSS = 1 − BS_ai / BS_mkt`. Positive = AI better. Report with bootstrap CI. **⚠️ BSS is a ratio of two noisy quantities and is skewed/heavy-tailed at small N - bootstrap it, never use a normal approximation.** [S28] **VERIFIED** that BSS sampling uncertainty is the paper's subject.
3. **A blend**: `BS` of `logit⁻¹(w·logit(p_ai) + (1−w)·logit(p_mkt))` for w ∈ {0, 0.1, …, 1}. **This is the honest form of the question.** The AIA Forecaster result - AI alone loses to market consensus, AI+consensus beats consensus alone [S16, **VERIFIED**] - predicts that the curve has a minimum at an interior `w`. If it does, *that* is our finding, and it is a real one.
   **⚠️ `w` must be pre-registered or reported as a curve, never selected post hoc and quoted as if it were fixed in advance.** Choosing the best `w` after seeing outcomes is a multiple-comparison violation (§B4.5).

## B3.3 Pairing rules - the details that decide whether the comparison is honest
1. **Same timestamp.** `p_mkt` must be the price at the instant the AI's context window closed. Prices from later are look-ahead.
2. **Which price?** `mid` is the fairest *probability* baseline; the **executable** price is the ask. Report the metric against **mid** and report the *economics* against the **ask + fee** (§C1 of the strategy doc). Mixing them (probability metrics against ask, or EV against mid) flatters us in both directions.
3. **Same resolution source.** Score both against Polymarket's resolution, including 50-50 outcomes.
4. **Pre-declared handling of annulled/50-50 markets.** Options: drop, or score both at y=0.5. **Declare before seeing outcomes.** Auto-resolution error rates are ~4.9% (95% CI 1.6–9.8%) and annulment ~3.9% (FutureSearch) vs Metaculus's historical ~8% [S15] **VERIFIED** - this is not a negligible category.
5. **No abstention filtering in the headline metric.** If the gate rejects a market, that market **still gets scored** in a secondary "all markets" table with `p_ai = p_mkt` imputed (the honest interpretation of "no view"). Reporting only the markets the gate accepted, without also reporting the full set, *is* cherry-picking. **INFERRED**, and directly analogous to ForecastBench's own imputation policy: market questions with missing LLM forecasts are imputed with the **crowd forecast**, dataset questions with 0.5 [S02] **VERIFIED**.

---

# B4. Standard pitfalls - with the specific 2026 evidence

## B4.1 Training-data contamination / look-ahead bias - **THE** problem (see also B5)
Covered in depth in §B5. Headline: 52% SI-vs-TI gap [S09].

## B4.2 Retrieval-time leakage - the sneakier one
Even on a genuinely post-cutoff question, the *search tool* can leak the answer.
**VERIFIED failure modes** from https://forum.effectivealtruism.org/posts/Spyz3wESZu2eeqhDj/ai-forecasting-in-2026-what-11-analyses-say:
- Google's date-range filter is "known for temporal leakage" (Reasoning-and-Tools, Aug 2024).
- Phan et al. ("539 paper"): results did not replicate on different question sets (Halawi, Sep 2024); leakage suspected via "cutoff-date confusion and faulty Google date indexing."
- AIA Forecaster (Nov 2025) authors acknowledged leakage affecting **~1.65% of search results**, on a retrospective evaluation of already-resolved questions.
**Mitigation:** enforce publication-date cutoffs *ourselves* on retrieved documents (don't trust the provider's filter), **log every retrieved URL with its parsed publication date**, and manually spot-check. Halawi et al. did exactly this: news collected with publish-date filters, plus manual verification on 20 recent events that models had no post-cutoff knowledge [S10] **VERIFIED**.

## B4.3 Survivorship / selection bias in the market set
**INFERRED**, supported by [S15, S26]:
- Markets that get **annulled, disputed, or 50-50'd** disappear from naive "resolved markets" pulls. These are disproportionately the *ambiguous* ones - i.e. exactly the ones where our AI is most likely to be wrong. Dropping them makes us look better.
- Markets with **no liquidity** never get a meaningful price and may be filtered out by an API query, removing the hardest cases.
- **Mitigation:** define the universe **prospectively** by a mechanical rule (e.g. "all binary markets with volume > $X and close date in [T+1d, T+30d] as of timestamp T"), snapshot it, and **report attrition explicitly**: how many of the frozen N never resolved, were annulled, or resolved 50-50.

## B4.4 Cherry-picking
The specific temptations here: picking the demo market after seeing which one worked; picking the category; picking the horizon; re-running the model until a good sample.
**Mitigation:** the **hashed frozen manifest** (§D2 of the strategy doc). Commit `sha256(predictions.jsonl)` into git before any resolution is known. This is ~10 lines of code and it neutralises the entire class of objection.

## B4.5 Multiple comparisons / researcher degrees of freedom
Every knob - prompt variant, sample count, blend weight `w`, gate thresholds, bin scheme, inclusion filters - is a comparison. With 6 binary knobs there are 64 configurations, and the best of 64 noise draws looks impressive.
**Reference framework:** Bailey & López de Prado's work on backtest overfitting and the **Deflated Sharpe Ratio**, which explicitly corrects a performance statistic for the *number of configurations tried*.
Sources: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2460551 ; https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253 ; https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf
**Date checked:** 2026-08-15 · **Status: VERIFIED (that these are the standard references for the correction).** I did **not** verify a prediction-market-specific application. **Status: UNKNOWN** for a Brier-score analogue of the deflated Sharpe ratio.
**Mitigation for 48 hours:** don't attempt a correction - just **count and report the number of configurations evaluated**, and pre-declare a single primary metric and a single primary configuration. "We tried 1 configuration" is a stronger statement than any p-value.

## B4.6 Small-N noise
See §B2. The concrete number to keep on a sticky note: **BSS 95% CI = [−0.26, +0.57] at N=50** [S28].

## B4.7 Difficulty confounding across question sets
**VERIFIED** [S29]: raw Brier is not comparable across datasets with different outcome prevalence; the authors do not even recommend the *scaled* Brier for cross-dataset comparison.
Live example from our own sources: Janna Lu (2025) reports expert forecasters at **0.0225** Brier on 157 Metaculus questions while frontier LLMs scored 0.135–0.274 on 464 questions - and the author explicitly notes Brier scores are *"not directly comparable across different question sets due to differences in question difficulty."*
Source: https://arxiv.org/html/2507.04562v3 · **VERIFIED**.
And within ForecastBench, market questions are much easier than dataset questions for everyone (superforecasters 0.074 vs 0.118) [S02].

## B4.8 Look-ahead in the market price itself
**INFERRED.** If you pull "the price" from a historical API without pinning the timestamp, you may get a price from *after* news broke. Then the market baseline is unbeatable and your AI looks terrible - or, if you pin the AI's price late and its context early, your AI looks great. **Both directions of this error have occurred in published work.** Pin one timestamp `T` and derive everything from it.

## B4.9 Overfitting the gate
**INFERRED.** The abstention gate is where a 48-hour team will unconsciously overfit: tune thresholds until the accepted set looks good. Set thresholds from **cited priors** (§C3 of the strategy doc - Halawi's 0.3–0.7 band and ≥5 articles; Kalshi's <10¢ result; the fee formula), **not** from our own outcomes. Then the gate has a defensible provenance even with N=0 resolutions.

---

# B5. **CRITICAL: is backtesting an LLM on already-resolved markets even valid?**

## Short answer: **No, not as evidence of forecasting skill. Be blunt about this.**

## B5.1 The direct evidence

**Claim:** Instructing an LLM to suppress its post-cutoff knowledge ("Simulated Ignorance", SI) does not reproduce genuine ignorance ("True Ignorance", TI). Across **477 competition-level forecasting questions and 9 LLMs**, cutoff instructions left a **52% performance gap between SI and TI**. Chain-of-thought **fails to suppress prior knowledge even when reasoning traces contain no explicit post-cutoff references**. Counterintuitively, **reasoning-optimised models exhibit worse SI fidelity** despite better reasoning traces. Authors' conclusion: prompts "cannot reliably 'rewind' model knowledge"; SI-based benchmarking is "methodologically flawed"; they recommend **prospective evaluation** instead, despite its latency cost.
**Source:** https://arxiv.org/abs/2601.13717 (Li, Wang, El Lahib, Xia, Pi; 2026-01-20)
**Date checked:** 2026-08-15 · **Status: VERIFIED**

**Corroboration:** the survey of 11 AI-forecasting analyses concludes that superforecaster-parity claims "rely on retrospective backtesting against already-resolved questions" and that "many admit to problems with information leakage", and that **forward-looking leaderboard standings contradict the strongest claims** [S06] **VERIFIED**.

**Structural corroboration:** ForecastBench was built specifically to escape this. It evaluates models "solely on questions about future events that have no known answer at the time of submission", which "eliminates data leakage by construction." Question bank: 6,435 questions (2,060 market from Metaculus/Polymarket/Manifold/RFI, selected for liquidity; 4,375 dataset from ACLED/FRED/DBnomics/Wikipedia/Yahoo Finance), 1,000 released to LLMs every two weeks, 200-question human subset, updated nightly.
**Source:** https://faculty.wharton.upenn.edu/wp-content/uploads/2026/02/ForecastBench_A_Dynamic_.pdf · **Status: VERIFIED**
**Reading:** the field's flagship benchmark chose to pay a *multi-month latency cost* rather than backtest. That is the strongest available signal about which design is defensible.

## B5.2 The mitigations, ranked by how much they actually help

| Mitigation | Effectiveness | Evidence |
|---|---|---|
| **Prospective / live-holdout** (predict, then wait) | **Full** - the only complete solution | ForecastBench design [S02]; SI paper's own recommendation [S09] |
| **Restrict to markets resolved strictly after the model's stated cutoff** | **Good, and the best retrospective option**. Halawi et al. used only questions resolving ≥ Jun 2023, trained/validated on pre-Jun-2023, and **manually verified on 20 recent events** that the models had no later knowledge. Beta-Bernoulli used a test set resolving after Aug 2025. | [S10, S14] VERIFIED |
| **Hard publication-date filter on retrieval, self-enforced** | Necessary but not sufficient | [S06] leakage modes; [S10] method |
| **Auto-generated fresh questions from post-cutoff news** | Good, but expensive and quality-limited: FutureSearch generated 1,499 questions from GDELT/Media Cloud seeds with ReAct agents + verifier agents; resolution by 3× Gemini 3 Pro + Opus 4.5 tiebreak; **manual check showed 4.9% resolution error (95% CI 1.6–9.8%)** and **human experts rated only 75.2% of sampled questions acceptable** | [S15] VERIFIED |
| **Hiding the resolution / "pretend you don't know"** | **Does not work. 52% gap.** | [S09] VERIFIED |
| Asking the model to state its cutoff and self-police | Does not work - same mechanism | [S09] INFERRED from the CoT finding |

## B5.3 The limits, stated bluntly

Even the *best* retrospective design (post-cutoff resolution + strict retrieval date filters) leaves these holes, and I want them written down so nobody oversells:

1. **Published cutoffs are approximate and models absorb later information** through post-training, RLHF data, tool-use traces, and system prompts. A "post-cutoff" question may still be partially known.
2. **Post-cutoff questions are not a random sample of questions.** They skew recent, skew toward whatever was newsworthy in a narrow window, and often skew short-horizon.
3. **The retrieval index is contemporaneous.** Search rankings, page titles, "related articles", and even URL slugs reflect what happened. Date-filtering the *documents* does not date-filter the *index*.
4. **The market price we use as the baseline may itself be contaminated** if pulled at the wrong timestamp (§B4.8).
5. **We cannot audit the model.** We have no way to prove a frontier model does not know the outcome. The 52% figure says our priors should be pessimistic.

**Therefore:** any retrospective run we produce is an **engineering smoke test of the pipeline**, not evidence about forecasting quality. Label it that way in the UI, in the README, and out loud in the demo.

---

# B6. THE EXECUTABLE PLAN

## B6.0 Design principle
**Ship a harness and a pre-committed frozen forecast set. Do not ship a result.**

## B6.1 Dataset definition (mechanical, pre-registered)

**Primary universe - "LIVE-HOLDOUT" (this is the real one):**
```
As of frozen timestamp T (recorded to the second, UTC):
  include every Polymarket binary market where
    - active AND not closed
    - 24h volume        >= V_min          (e.g. $10,000)
    - orderbook has both bid and ask
    - quoted spread     <= S_max          (e.g. 0.05)
    - mid price         in [0.05, 0.95]
    - end_date          in [T + 24h, T + 30d]
  cap at M markets per parent event (e.g. 2) to limit correlation
  cap at N_total (e.g. 150) by descending volume, deterministic tie-break on market id
```
Record for every market: `market_id, condition_id, slug, question, description/resolution criteria, category, feeRate, bid, ask, mid, book depth (>=10 levels each side), 24h volume, open interest, end_date, T`.

**Secondary universe - "SMOKE-TEST" (explicitly non-evidential):**
Resolved markets, used only to prove the plumbing works end to end. **Every artefact from this set must carry a `CONTAMINATED=true` flag and must never appear in a metrics claim.**

**Tertiary (optional, if time) - "POST-CUTOFF RETROSPECTIVE":**
Markets that both *opened and resolved* strictly after the model's stated training cutoff, with retrieval hard-limited to documents published before each market's `T_pred`. **Still label it "weak evidence, see B5.3."** Only attempt if the primary harness is done.

## B6.2 Prediction protocol

For each market in the universe, at time T:
1. Retrieve news with a **hard publication-date filter ≤ T**; store every URL + parsed publication date + snippet. Target 10–15 ranked items [S10].
2. Elicit `p̂` **blind to the market price** - strip price from the prompt, and check the retrieved snippets for price leakage [S11].
3. Take **k = 5 independent samples**; store all five; aggregate by **median of log-odds**; store dispersion (IQR of log-odds) [S10, S06, S14].
4. Compute the **cost-aware edge** and the **gate decision** with the reason code (§C3 of strategy doc).
5. Compute **fractional-Kelly size** at ¼ Kelly with a 2% hard cap (§C2).
6. Write one JSONL line per market. Include the model id, prompt hash, and code git SHA.

## B6.3 The freeze / commit step (do not skip)
```
predictions_T.jsonl          # one line per market, as above
manifest_T.json              # T, universe rule params, N, model id, prompt hash, git SHA,
                             # sha256(predictions_T.jsonl)
```
Commit `manifest_T.json` to git **before** any resolution exists. Print the hash in the demo. **This single artefact is what converts "trust us" into "verify us".**

## B6.4 Resolution & scoring step (runs later, unattended)
- Poll for resolution; record `outcome ∈ {0, 1, 0.5(annulled/50-50), unresolved}`.
- Handle annulment per the **pre-declared** rule (§B3.3.4).
- Compute, on the paired set:
  - `BS_ai`, `BS_mkt(mid)`, paired difference + **cluster bootstrap CI by event**
  - `BSS = 1 − BS_ai/BS_mkt` + bootstrap CI
  - clipped log loss for both
  - Murphy decomposition for both, flagged "directional only"
  - reliability diagram, 3–5 equal-count bins, counts + Wilson CIs
  - the blend curve over `w ∈ [0,1]`, reported **as a curve**
  - attrition table: frozen N → resolved → annulled → still open
  - "all markets" table with `p_ai = p_mkt` imputed on gated-out markets

## B6.5 Baselines (all must appear in the report)
| Baseline | Definition | Why |
|---|---|---|
| **Market mid at T** | primary | The thing we must beat |
| **Market ask + fee at T** | economics | The price a user actually gets |
| Always 0.5 | 0.25 Brier by construction | Sanity floor; ForecastBench uses it as the rescaling anchor [S02] |
| Base rate `ȳ` | constant = observed frequency | Detects a model that only learned the prevalence |
| **Blend(w)** | logit-space AI/market mix | The AIA-Forecaster-motivated hypothesis [S16] |
| No-retrieval AI | same prompt, no news | Isolates retrieval's contribution (Halawi: 0.020 Brier) [S10] |
| Single-sample AI | k=1 | Isolates the ensemble's contribution |

## B6.6 Reporting template (fill in literally)
```
Frozen at T = <ISO8601 UTC>.  manifest sha256 = <hash>
Universe rule: <verbatim params>.  N frozen = <n>.  Distinct events = <e>.
Configurations evaluated before freezing: <count>.
Resolved as of <report time>: <r>.  Annulled/50-50: <a>.  Still open: <o>.

Paired Brier difference (AI − market mid): <d>  [95% CI <lo>, <hi>]  (cluster bootstrap by event, 10k)
Brier skill score vs market:               <s>  [95% CI <lo>, <hi>]
Log loss (clipped 0.01/0.99): AI <x>  market <y>
Best blend weight w on this sample:        <w>   (POST HOC - reported as a curve, not a selected value)

Required N for 80% power at delta=0.01 given observed sigma_d=<sd>: <n_req>
=> This sample is / is not adequately powered.

CONCLUSION: <one of>
  (a) "Underpowered. No claim of skill or lack of skill is supported."
  (b) "AI significantly worse than market."
  (c) "Inconclusive but directionally X."
Note: (a) is the expected and acceptable outcome at 48-hour scale.
```

## B6.7 Timebox (of the eval work only)
| Hours | Task |
|---|---|
| 0–2 | Universe snapshot + freeze/hash script |
| 2–5 | Prediction runner (retrieval, k=5, blind elicitation, JSONL) |
| 5–6 | Gate + edge/Kelly computation with reason codes |
| 6–8 | Resolution poller + scoring (Brier, log loss, bootstrap CI, reliability diagram) |
| 8–10 | Resolution-free diagnostics (§B7) - **this is what the demo actually shows** |
| 10–12 | Report generation + limitations text |

---

# B7. Resolution-free diagnostics - the only things with useful precision at 48-hour scale

These need **no outcomes**, so they are immune to contamination *and* to small-N-of-resolutions. **Status: INFERRED synthesis**, each grounded in a cited concern.

| Diagnostic | Computation | Fails if | Grounding |
|---|---|---|---|
| **Complementary coherence** | ask for `p̂(YES)` and `p̂(NO)` in separate calls; measure `|p̂(YES) + p̂(NO) − 1|` | mean > ~0.05 ⇒ framing-dependent, not a probability | Acquiescence bias / >50% skew [S11] |
| **Multi-outcome coherence** | for a grouped event, `|Σ p̂ᵢ − 1|` | large ⇒ no coherent world model | analogous to parlay coherence violations [S19] |
| **Blind-vs-anchored delta** | `p̂_blind` vs `p̂_shown_price` | near-zero delta ⇒ the model is echoing the price and "edge" is an artifact | [S11] Study 2 |
| **Sample dispersion** | IQR of the 5 log-odds samples | wide ⇒ gate should fire | dispersion predicts error better than verbalized confidence [S14] |
| **Disagreement distribution** | histogram of `p̂ − mid` | spike at 0 ⇒ no signal; fat tails ⇒ overconfidence | INFERRED |
| **Prompt-perturbation stability** | reorder retrieved docs, re-ask | large swing ⇒ retrieval-order artifact | INFERRED |
| **Gate reason histogram** | count of each reject code | all-accept ⇒ decorative gate | §C3 |
| **Cost waterfall** | mid→ask→fee→depth-walk→edge | edge vanishes ⇒ correct answer is no-bet | [S24, S20, S21] VERIFIED inputs |

**These are demoable on day one and every number in them is verifiable live on screen.**

---

# B8. CLAIMS PERMITTED AND CLAIMS FORBIDDEN

## ✅ We MAY claim
1. "We score the AI against the market price on the same market at the same frozen timestamp, following ForecastBench's market-question methodology (w_mkt = 1)." [S02]
2. "Our forecasts were committed and hashed before any resolution was known; here is the hash."
3. "Our abstention gate rejects X% of markets; here are the reason codes and the cited justification for each threshold."
4. "Net of Polymarket's actual taker fee formula `C·feeRate·p·(1−p)` and the actual order book at size S, the surviving edge on this market is E." [S24]
5. "Published evidence indicates AI *combined with* market consensus outperforms consensus alone, while AI alone does not; we implemented the combination." [S16]
6. "At our current N, the 95% CI on Brier skill vs market is [lo, hi], which is too wide to support any conclusion. To detect a 0.01 Brier difference at 80% power we would need ~N_req markets." [S28]
7. "Our retrospective run is a pipeline smoke test, not evidence, because prompting a model to ignore post-cutoff knowledge leaves a measured 52% performance gap." [S09]
8. Any resolution-free diagnostic from §B7, at face value.

## ❌ We MAY NOT claim
1. **Any profitability claim.** Real-capital and order-book-simulated studies in 2026 were mostly negative: Kalshi −16% to −30.8%, Polymarket −1.1% average [S22]; only 2 of 7 models positive at $10 lots and degrading at $1,000 [S21].
2. **"Our AI beats the market."** No credible published result supports this at scale net of costs [S16, S22, S21, S10].
3. **"Our AI matches superforecasters."** Even the optimistic source frames it as *"more consistent with superforecaster parity than with outperformance"* against a **2024** human snapshot [S03], while live forward-looking tournaments show pros beating bots by a widening margin (Q2 2025: −20.03, p=0.00001) [S07].
4. **Any Brier number from markets resolved before the model's cutoff.** [S09]
5. **Any comparison of our Brier to a published Brier from a different question set.** [S29, S13]
6. **Any statement of the form "X is better than Y"** where the CI on the difference includes zero. Cite [S11] as precedent for reporting a null honestly.
7. **Any result from a configuration selected after seeing outcomes**, including the blend weight `w` and gate thresholds. [S31]
8. **"Prompt engineering made our forecasts much better."** Measured effects are ~0.011–0.019 Brier at best, several popular techniques are significantly *harmful*, and Metaculus's own prompt-optimisation result failed to replicate live. [S12, S06]
9. **Any market-price-as-truth claim** ("the market says 92% so it's 92%") without noting that politics markets have the worst ECE (0.117) despite the best Brier. [S17]

## ⚠️ Wording that will get us caught
- "backtest" → say **"pipeline smoke test on resolved markets (contaminated)"**
- "accuracy" → say **"Brier score"** and give the CI
- "profitable" → say **"positive expected value under stated assumptions, unvalidated"**
- "beats the market" → say **"paired Brier difference of d, CI [lo, hi]"**
- "calibrated" → show the reliability diagram **with bin counts**

---

# B9. Open questions for the implementing agent
1. What is `σ_d` empirically on our market set? Everything in §B2.2 depends on it. Measure it on the first ~30 resolved pairs, even though 30 is too few to trust.
2. Does the Polymarket API expose a historical price at an arbitrary timestamp with sufficient granularity to pin `p_mkt` at `T`? If not, we must snapshot prices live and the harness is prospective-only. **UNKNOWN.**
3. What is the actual annulment/50-50 rate on the markets we select? Literature gives 3.9%–8% on other platforms [S15]. **UNKNOWN for Polymarket.**
4. Is there a published Brier-score analogue of the deflated Sharpe ratio? I could not find one. **UNKNOWN.**
5. What are the current ForecastBench leaderboard raw Brier values? The site renders them client-side and CSV endpoints were blocked by the proxy; I have Jan 2026 values (superforecasters 0.086, best LLM 0.103) and Jul 2026 qualitative parity claims, but not the live table. **UNKNOWN as of 2026-08-15.**

---

*End of BACKTEST_PLAN.md*
