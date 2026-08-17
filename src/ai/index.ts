// Prompt assembly, tool schema, k-sampling and blending.
// May import: domain, simulation. Populated by T5.x.

export {
  ANCHORED_PROMPT_TEXT,
  ANCHORED_PROMPT_VERSION,
  BLIND_PROMPT_TEXT,
  BLIND_PROMPT_VERSION,
  SUBMIT_FORECAST_TOOL_SCHEMA,
  buildAnchoredPrompt,
  buildBlindPrompt,
  formatMarketProbabilityForPrompt,
  toAnchoredPromptInput,
  toBlindPromptInput,
} from './prompts';

export type { AnchoredPromptInput, AssembledPrompt, BlindPromptInput } from './promptTypes';

export {
  ANTHROPIC_MODEL_ID,
  DEFAULT_SAMPLE_COUNT,
  DEFAULT_TIMEOUT_MS,
  createAnthropicTransport,
  sampleCountFromEnv,
  timeoutMsFromEnv,
} from './client';
export type { AnthropicTransport } from './client';

export { AiClientError } from './errors';

export { aggregateBlindSamples, fromLogOdds, interquartileRange, toLogOdds } from './aggregate';
export type { BlindAggregate } from './aggregate';

export { parseSubmitForecastToolInput } from './schema';
export type { ForecastSample } from './schema';

export { defaultSamplingConfig, runAnchoredDiagnostic, runBlindSampling } from './sampling';
export type { AnchoredDiagnosticResult, KSampledForecast, SamplingConfig } from './sampling';
