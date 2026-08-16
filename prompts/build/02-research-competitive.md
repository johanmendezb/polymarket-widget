# Build prompt 02 - Competitive and UX research agent

**Sent:** 2026-08-15, research phase
**Model:** claude-opus-5, general-purpose subagent with web search
**Produced:** `docs/02-research/COMPETITIVE_RESEARCH.md`, `docs/02-research/UX_RESEARCH.md`, and 58 of the 91 source records in `docs/02-research/RESEARCH_SOURCES.md`
**Ran in parallel with:** build prompt 03

Verbatim, as sent.

---

You are the COMPETITIVE / UX RESEARCH AGENT for a 48-hour engineering challenge: build a "Polymarket widget" that lets a user search markets, select an outcome, simulate placing a bet, and use AI to assist in choosing a market and/or outcome. The deliverable this week is a documentation package; another agent will implement later.

Your job is RESEARCH ONLY. Do not write application code.

Use WebSearch and WebFetch extensively (today is August 2026, prefer current sources). Investigate:

1. Polymarket's own product surface: how the market list, market detail, order ticket / bet slip, orderbook and price chart are presented on polymarket.com. Whether Polymarket offers official embeds, widgets, or an oEmbed/iframe product. Whether there is a public "Polymarket widget" or embed documentation.
2. Third-party Polymarket widgets, embeds, terminals, dashboards, browser extensions, Telegram/Discord bots, and open-source clones. What do they do well, what is missing.
3. Adjacent prediction-market interfaces: Kalshi, Manifold, Metaculus, Limitless, Myriad, and any newer entrants. Note specifically how each communicates probability, uncertainty, liquidity and cost-to-trade.
4. AI forecasting / decision-support products and research demos (e.g. AI forecasting bots on Metaculus, LLM forecasting tools, Perplexity-style evidence UIs). How do they present a probability estimate, its evidence, and its uncertainty without overclaiming?
5. UX patterns for order preview / execution preview in trading UIs generally: how do good ones show expected fill price, slippage, fees, and net cost. Look at DEX swap UIs (Uniswap, 1inch, Jupiter) since these are the best-in-class "preview before you commit" interfaces.
6. Accessibility and embeddability constraints for a widget: iframe embedding, dark/light theming, small viewport (e.g. 380x600), keyboard nav.

For each finding, capture: the claim, the source URL, the date you checked, and a status label from VERIFIED / INFERRED / UNKNOWN / CONFLICTING. Never state a product capability as fact without a source. If you cannot verify something, label it UNKNOWN rather than guessing.

Write your full findings to TWO files:
- /home/claude/research/COMPETITIVE_RESEARCH.md
- /home/claude/research/UX_RESEARCH.md

COMPETITIVE_RESEARCH.md should cover items 1-4: who exists, what they do, feature comparison table, gaps and differentiation opportunities for a widget, and an explicit "what we should NOT copy" section.

UX_RESEARCH.md should cover items 5-6 plus concrete interaction recommendations: recommended widget information architecture, the order-preview pattern we should adopt, how to present AI probability vs market probability vs execution price so a user is not misled, loading/empty/error state guidance, and small-viewport layout guidance. Include a short list of specific UI anti-patterns to avoid.

Both files must include a Sources section with URL + date checked.

Also append every source you used to /home/claude/research/SOURCES_UX.md in this YAML-ish record format, one block per source:
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

Then return a handoff of UNDER 500 WORDS in exactly this shape (details belong in the files, not the handoff):
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
