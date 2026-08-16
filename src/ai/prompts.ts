import { probabilityValue, type Market, type MarketOutcome, type Probability } from '@/domain';

import { loadPromptFile, loadRuntimeTextFile } from './promptLoader';
import { interpolate } from './template';
import type { AnchoredPromptInput, AssembledPrompt, BlindPromptInput } from './promptTypes';

const BLIND_PROMPT_FILE = loadPromptFile('blind-v1.md');
const ANCHORED_PROMPT_FILE = loadPromptFile('anchored-v1.md');
const SUBMIT_FORECAST_SCHEMA_TEXT = loadRuntimeTextFile('submit_forecast.schema.json');

export const BLIND_PROMPT_VERSION = BLIND_PROMPT_FILE.version;
export const BLIND_PROMPT_TEXT = BLIND_PROMPT_FILE.text;
export const ANCHORED_PROMPT_VERSION = ANCHORED_PROMPT_FILE.version;
export const ANCHORED_PROMPT_TEXT = ANCHORED_PROMPT_FILE.text;

/** The forced tool schema. `tool_choice` requires it; prose responses are not accepted. */
export const SUBMIT_FORECAST_TOOL_SCHEMA = JSON.parse(SUBMIT_FORECAST_SCHEMA_TEXT) as Readonly<
  Record<string, unknown>
>;

function blindPlaceholders(input: BlindPromptInput): Record<string, string> {
  return {
    question: input.question,
    outcomeLabel: input.outcomeLabel,
    resolutionCriteria: input.resolutionCriteria,
    endDate: input.endDate,
    category: input.category,
    todayIso: input.todayIso,
  };
}

/** Interpolates `blind-v1.md`. The market price cannot appear: `BlindPromptInput` has no field to carry it. */
export function buildBlindPrompt(input: BlindPromptInput): AssembledPrompt {
  return {
    text: interpolate(BLIND_PROMPT_TEXT, blindPlaceholders(input)),
    promptVersion: BLIND_PROMPT_VERSION,
  };
}

/** Renders the market price for the diagnostic-only anchored prompt. Never used on the blind path. */
export function formatMarketProbabilityForPrompt(probability: Probability): string {
  return `${(probabilityValue(probability) * 100).toFixed(1)}%`;
}

/** Interpolates `anchored-v1.md`. Diagnostic only: never displayed as the estimate, never enters the blend. */
export function buildAnchoredPrompt(input: AnchoredPromptInput): AssembledPrompt {
  return {
    text: interpolate(ANCHORED_PROMPT_TEXT, {
      ...blindPlaceholders(input),
      marketProbability: formatMarketProbabilityForPrompt(input.marketProbability),
    }),
    promptVersion: ANCHORED_PROMPT_VERSION,
  };
}

const NOT_SPECIFIED = 'Not specified.';

/**
 * Extracts exactly the fields `blind-v1.md` needs from a domain `Market` and
 * one of its outcomes. Does not read `indicativePrice`, `bestBid`, `bestAsk`,
 * `lastTradePrice` or any other price field on either — `BlindPromptInput`
 * has no parameter that could carry one through even if this function tried.
 */
export function toBlindPromptInput(
  market: Market,
  outcome: MarketOutcome,
  todayIso: string,
): BlindPromptInput {
  return {
    question: market.question,
    outcomeLabel: outcome.label,
    resolutionCriteria: market.resolutionCriteria ?? NOT_SPECIFIED,
    endDate: market.endDate ?? NOT_SPECIFIED,
    category: market.category ?? NOT_SPECIFIED,
    todayIso,
  };
}

/** Adds the one field the anchored prompt needs on top of an already-built blind input. */
export function toAnchoredPromptInput(
  blindInput: BlindPromptInput,
  marketProbability: Probability,
): AnchoredPromptInput {
  return { ...blindInput, marketProbability };
}
