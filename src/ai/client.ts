import Anthropic from '@anthropic-ai/sdk';

import { AiClientError } from './errors';

/**
 * Fixed by ADR-0005. Server-side only - see `CLAUDE.md` rule 7 and
 * `docs/08-operations/SECRETS.md`.
 */
export const ANTHROPIC_MODEL_ID = 'claude-opus-5';

/**
 * `AI_SAMPLES` from `.env.example`. k independent blind samples per forecast.
 */
export const DEFAULT_SAMPLE_COUNT = 5;

/**
 * `AI_TIMEOUT_MS` from `.env.example`. Hard ceiling on the whole k-sampling
 * operation, not per call - a hung upstream call must not hang the route.
 */
export const DEFAULT_TIMEOUT_MS = 45_000;

export function sampleCountFromEnv(): number {
  const raw = process.env.AI_SAMPLES;
  const parsed = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SAMPLE_COUNT;
}

export function timeoutMsFromEnv(): number {
  const raw = process.env.AI_TIMEOUT_MS;
  const parsed = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/**
 * The minimal surface `src/ai` needs from the Anthropic SDK. Injectable so
 * every test runs against a fake transport - no network, no API key, ever.
 * See `docs/06-execution/TEST_STRATEGY.md`.
 */
export interface AnthropicTransport {
  createMessage(
    params: Anthropic.MessageCreateParamsNonStreaming,
    options?: { readonly signal?: AbortSignal },
  ): Promise<Anthropic.Message>;
}

/**
 * Wraps a real `Anthropic` client. The key is read here, lazily, on first
 * use - never at module load - so importing `src/ai` never requires
 * `ANTHROPIC_API_KEY` to be set (tests inject {@link AnthropicTransport}
 * directly and never reach this function).
 *
 * @throws {AiClientError} with code `INTERNAL` when the key is unset. This
 *   is the "clean handled error, not a stack trace" the task contract
 *   requires - never a printed key, prefix, length or hash.
 */
export function createAnthropicTransport(): AnthropicTransport {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiClientError('INTERNAL', 'ANTHROPIC_API_KEY is not configured');
  }

  const client = new Anthropic({ apiKey });

  return {
    createMessage: (params, options) => client.messages.create(params, options),
  };
}
