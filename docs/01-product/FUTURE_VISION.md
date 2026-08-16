# FUTURE VISION

What this becomes if it stops being a challenge submission. Ordered by how much each one changes the product rather than by effort.

---

## 1. Calibration as a public, compounding artifact

The strongest version of this product is not a better forecast. It is a **public, tamper-evident record of its own forecasts and their outcomes**, updated continuously.

Every forecasting tool asserts that it is good. Almost none of them can be checked. A system that freezes and hashes its predictions before resolution, then publishes the paired comparison against the market on the same questions at the same timestamps, becomes more credible every week without anyone having to argue for it.

The challenge version ships the mechanism (freeze, hash, resolve, score) with a sample size too small to conclude anything, and says so. The real version just waits.

What it needs: the harness on a schedule, a results page with confidence intervals that are honest about width, and enough time to accumulate the few hundred resolved pairs that make a Brier comparison meaningful.

---

## 2. Negative-risk group coherence

**The most interesting technical direction, and the one place where an automated system plausibly has a real edge that does not require out-forecasting people.**

In a negative-risk group, only one outcome can resolve YES. A NO share in any market converts to a YES share in every other. This creates a hard arithmetic relationship between prices across the group.

When that relationship is violated, it is not a difference of opinion. It is a mispricing, mechanically detectable, with no forecasting involved. Detecting and surfacing those is a genuinely different product from "the AI thinks YES", and it is defensible in a way that a forecast never fully is.

What it needs: multi-market state, the conversion mechanics, and depth-aware sizing across several books at once, since a coherence gap that vanishes at any executable size is not an opportunity.

---

## 3. Live execution

Not a feature, a project. Sixteen prerequisites in `04-architecture/SECURITY.md` §8, starting with a fail-closed server-side geographic eligibility check.

The architecture is shaped for it: `ExecutionProvider` exists, the UI renders `provider.mode`, and nothing in the widget assumes simulation except the simulation provider itself. What it deliberately does not have is a `LiveExecutionProvider` file, because a stub is an invitation to skip the gate.

The honest position is that live execution should only be built once the calibration record in (1) says the system is worth acting on. Building it first would be doing the impressive part before the part that justifies it.

---

## 4. Evidence-first market discovery

Today, market discovery everywhere is ranked by volume, which is a proxy for attention rather than for opportunity.

A more useful ranking: **where does an outside view most disagree with the crowd, on markets where the disagreement survives execution costs?** That is a different search index, and it is only computable once the forecast and cost pipelines exist, which they now do.

The failure mode to guard against is obvious and severe: ranking by disagreement selects for markets where the model is confidently wrong. It only becomes safe once (1) has produced enough calibration data to know where the model is trustworthy.

---

## 5. A real widget platform

The challenge version is one embeddable page. The product version is a script tag, a documented host API, theme configuration, height negotiation, per-publisher market curation, and analytics for the host.

Unglamorous, and it is what turns a demo into something a newsletter or a news site actually deploys.

---

## 6. Sell, close and a real portfolio

A simulated position with no exit is only half a lifecycle. Selling requires walking the bid side, which is the same arithmetic mirrored, and it makes PnL over time meaningful.

Together with persistence, this turns the widget from a calculator into a paper-trading environment, which is the natural bridge to (3): a documented paper-trading record is one of the sixteen gate items.

---

## What deliberately stays out

| Not in the vision | Why |
|---|---|
| Social features, leaderboards, streaks | Gamifying a betting interface is a product decision with consequences we do not want to own |
| Copy trading | Amplifies whoever is currently lucky |
| Auto-trading | Would require a calibration record we do not have and probably will not have for a long time |
| Sports betting positioning | The interesting part of prediction markets is the questions that do not have a bookmaker |
