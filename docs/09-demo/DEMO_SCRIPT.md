# DEMO SCRIPT

**Target: under 5 minutes. Rehearsed twice against the deployed URL, not localhost.**

The demo is not a feature tour. It is an argument, delivered in order, where each section sets up the next. The argument is: *the market number is not the whole story, and here is what the rest of it costs.*

---

## Before you start

```
[ ] pnpm warm   <-- MANDATORY. The Render free tier sleeps after ~15 min idle and
                   the first request then takes tens of seconds. Run this at least
                   5 minutes before the demo, and again if you idle before starting.
[ ] /api/health shows uptimeSeconds > 60, confirming the instance is warm
[ ] pnpm test:live passes (fixtures are not stale, upstream has not drifted)
[ ] Staging URL loads and /api/health is ok
[ ] MARKET A identified: liquid, politics or geopolitics, price between 0.30 and 0.70,
    resolving within ~3 weeks. This one should pass the gate.
[ ] MARKET B identified: wide spread or extreme price. This one should be rejected.
[ ] Fallback for each, verified in the same session
[ ] Browser at a width that shows the widget at its 380px embedded size,
    with the host page visible around it
```

Record the chosen slugs here at T9.2:

```
MARKET A:  ______________________   fallback: ______________________
MARKET B:  ______________________   fallback: ______________________
```

---

## 0:00 to 0:30 - The frame

> "A Polymarket market shows you one number. Sixty-two percent. That number is doing three jobs at once: it is what the crowd believes, it is not what you would pay, and it is not an independent estimate. This widget keeps those three apart."

Show the widget embedded in a host page. Say that it is a widget, that it is running against live Polymarket data, and that nothing in it places a real trade.

**Do not** open with the architecture. Open with the problem.

---

## 0:30 to 1:15 - Search and select

Search for MARKET A. Open it.

Point out, briefly, without dwelling:
- the freshness stamp
- resolution criteria in the primary flow, not buried
- the order book, available rather than hidden

> "Resolution criteria are up here rather than in a footer, because if you do not trust how a market resolves, nothing else on the screen matters."

---

## 1:15 to 2:15 - The second opinion

Request the AI second opinion. While it runs, say what it is doing:

> "It is estimating this blind. The market price is not in its context, and that is enforced by the type system, not by asking the model nicely. If the price were in there, the estimate would just be an echo of the price and any edge we computed would be an artifact."

When it returns, walk the three registers:

1. **Market probability.** What the crowd says.
2. **AI estimate**, as a range, with its dispersion across five samples, and its dated sources.
3. The **blend**, at a weight that is written in the repository and was fixed before any evaluation ran.

> "The published evidence is that an AI forecaster on its own underperforms market consensus, but an AI combined with market consensus beats consensus alone. So we combine. We are not claiming to beat the market, and there is a claims policy in the repo that says so explicitly."

Point at the provenance footer: timestamp, model, prompt version, sample count, blend weight.

---

## 2:15 to 3:15 - What it actually costs

Select the outcome. Enter an amount large enough to move past the top of book.

Walk the waterfall out loud, pointing at each number:

> "Midpoint sixty-one. But you buy at the ask, so sixty-two. Your size does not fit at the top of the book, so your volume-weighted fill is sixty-two point four. Then the fee: Polymarket charges takers `C × feeRate × p × (1 − p)`, which is four percent in politics, and it peaks at even odds. That is about one cent per share here, roughly two percent of stake. Most tooling still says Polymarket is fee-free. It has not been for a while."

> "So the edge you thought you had is smaller than you thought, and on most markets it is gone entirely."

Show the five-line preview. Place the simulated bet. Point at the label at the point of commitment.

> "Simulated. No funds move. There is no signing code in this repository at all."

---

## 3:15 to 4:00 - The refusal

**This is the most important minute of the demo.**

Go back and open MARKET B. Request the second opinion. It returns NO_BET.

> "This is the part I would most want you to look at. The product is allowed to say no. Here are the reason codes that fired, and each one links to the research and the threshold behind it. Sub-ten-cent contracts lose more than sixty percent of the time on comparable platforms. The spread here is wider than any edge we claim."

> "A gate that never fires is decorative, so we ship its firing rate as a diagnostic."

---

## 4:00 to 4:40 - Why you can believe any of this

If E8 shipped, show the diagnostics view:

> "None of these need a resolved market, so none of them can be contaminated or cherry-picked. Complementary coherence: ask it for YES and NO separately, do they sum to one. Blind versus anchored: how much does the estimate move when we show it the price. If that number is near zero, the model is echoing the market and we say so."

> "And the forecasts are frozen and hashed before anything resolves. Here is the hash. It is in the repo."

If E8 was cut, use those forty seconds on the failure paths instead: kill the AI, show the widget still works; request more shares than the book holds, show the input cap and the explanation.

---

## 4:40 to 5:00 - Close

> "What I did not build: real trading, a wallet, a backtest. The backtest is the interesting omission. You can mechanically do one, the price history API supports it. But an LLM scored on markets that resolved before its training cutoff is not measuring forecasting skill, and there is a 2026 paper measuring exactly how badly that fails. So there is no performance number in this demo, and that is the point."

---

## Questions to be ready for

| Question | Answer |
|---|---|
| "Why not a monorepo?" | ADR-0001. One deployable, one consumer. Boundaries are enforced by ESLint. Extraction later is mechanical. |
| "Why no live trading?" | ADR-0004 and the sixteen-item gate in `SECURITY.md` §8. Also, Polymarket blocks 39 countries including the US, so a simulation is the only version you can use. |
| "Is the AI any good?" | Unknown, and I will not claim otherwise. Published evaluations of LLMs trading real capital in 2026 are mostly negative. The product is built so that this being true does not make it dishonest. |
| "Why not stream prices?" | ADR-0012. The WebSocket is public and documented. Polling with a visible staleness stamp is more honest and cheaper for a five-minute demo. It is the first thing I would add. |
| "What would you do next?" | WebSocket prices, sell and close, the harness running on a schedule with a public results page, and negative-risk group coherence, which is the one place an automated system plausibly has an edge that does not require out-forecasting people. |
| "What is the weakest part?" | The forecast itself. Everything downstream of it is verifiable arithmetic; the estimate is not. That is why the gate and the diagnostics exist. |

## Failure recovery

| If | Do |
|---|---|
| MARKET A has resolved or gone illiquid | Switch to the fallback. This is why fallbacks exist. |
| The AI call times out live | Do not hide it. "That is the timeout doing its job. The widget still works." Then continue with the cost section. It is a stronger demo, not a weaker one. |
| Upstream returns 429 | Point at the "refreshing paused" state. Explain that rate limits are undocumented so we assume they exist. |
| The deployed URL is down | Fall back to localhost, and say so. Do not pretend. |
| The first page load hangs for 30 seconds | The instance went cold. Say so plainly: free tier, it sleeps after fifteen minutes, it is documented in ADR-0015. Do not apologise for a disclosed tradeoff. This is why the warm-up step exists. |
