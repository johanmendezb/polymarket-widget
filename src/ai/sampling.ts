import type Anthropic from '@anthropic-ai/sdk';

import type { Probability } from '@/domain';

import { aggregateBlindSamples, type BlindAggregate } from './aggregate';
import { ANTHROPIC_MODEL_ID, DEFAULT_SAMPLE_COUNT, DEFAULT_TIMEOUT_MS, type AnthropicTransport } from './client';
import { AiClientError } from './errors';
import { buildAnchoredPrompt, buildBlindPrompt, SUBMIT_FORECAST_TOOL_SCHEMA } from './prompts';
import type { AnchoredPromptInput, BlindPromptInput } from './promptTypes';
import { parseSubmitForecastToolInput, type ForecastSample } from './schema';

/**
 * Generous but bounded: `reasoning_summary` is capped at 400 chars and
 * `evidence` at 8 items by the schema, so the model's own output is small.
 * Most of the budget covers the web-search tool-use loop preceding it.
 */
const MAX_OUTPUT_TOKENS = 4096;

const SUBMIT_FORECAST_TOOL: Anthropic.Tool = {
  name: SUBMIT_FORECAST_TOOL_SCHEMA.name as string,
  description: SUBMIT_FORECAST_TOOL_SCHEMA.description as string,
  input_schema: SUBMIT_FORECAST_TOOL_SCHEMA.input_schema as Anthropic.Tool.InputSchema,
};

/**
 * `web_search_20250305` is the version this SDK's stable (non-beta)
 * `messages.create` surface supports. No beta header, no dynamic filtering -
 * see the polymarket-domain/claude-api skill notes recorded alongside this
 * task's handoff.
 */
const WEB_SEARCH_TOOL: Anthropic.WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
};

/**
 * `tool_choice` forces `submit_forecast`; a prose-only response is therefore
 * always a schema violation, never a distinct "no tool call" case.
 *
 * Deliberately omits both `temperature` and `thinking`:
 * - `temperature` is a 400 on `claude-opus-5` (sampling parameters were
 *   removed from the model). The task contract's "temperature 1" predates
 *   this and is corrected in ADR-0005 - sample diversity across the k calls
 *   comes from the model's own inference, not a temperature knob.
 * - Omitting `thinking` runs adaptive thinking by default on `claude-opus-5`,
 *   which is the desired behaviour; there is no `{type: "adaptive"}` request
 *   shape in this SDK version's stable types to set explicitly.
 */
function buildRequestParams(
  promptText: string,
  modelId: string,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: modelId,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [{ role: 'user', content: promptText }],
    tools: [SUBMIT_FORECAST_TOOL, WEB_SEARCH_TOOL],
    tool_choice: { type: 'tool', name: 'submit_forecast' },
  };
}

export interface SamplingConfig {
  readonly transport: AnthropicTransport;
  readonly modelId: string;
  readonly timeoutMs: number;
}

/** Convenience default: env-derived timeout, the ADR-0005 model id, an injected transport. */
export function defaultSamplingConfig(transport: AnthropicTransport): SamplingConfig {
  return { transport, modelId: ANTHROPIC_MODEL_ID, timeoutMs: DEFAULT_TIMEOUT_MS };
}

type SampleAttempt =
  | { readonly outcome: 'success'; readonly sample: ForecastSample }
  | { readonly outcome: 'schema_violation'; readonly reason: string }
  | { readonly outcome: 'aborted' }
  | { readonly outcome: 'transport_error'; readonly reason: string };

async function attemptOnce(
  params: Anthropic.MessageCreateParamsNonStreaming,
  transport: AnthropicTransport,
  signal: AbortSignal,
): Promise<SampleAttempt> {
  let response: Anthropic.Message;
  try {
    response = await transport.createMessage(params, { signal });
  } catch (error) {
    // Whether the transport itself throws an abort-flavoured error is not
    // load-bearing here: `signal.aborted` is the single source of truth, so
    // this works the same whether the fake test transport understands
    // AbortSignal or not.
    if (signal.aborted) return { outcome: 'aborted' };
    return { outcome: 'transport_error', reason: error instanceof Error ? error.message : String(error) };
  }

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'submit_forecast',
  );
  if (!toolUseBlock) {
    return { outcome: 'schema_violation', reason: 'no submit_forecast tool_use block in the response' };
  }

  try {
    return { outcome: 'success', sample: parseSubmitForecastToolInput(toolUseBlock.input) };
  } catch (error) {
    return { outcome: 'schema_violation', reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * One elicitation, with the retry policy from `docs/06-execution/BACKLOG.md`
 * T5.2: a schema violation retries exactly once, then surfaces
 * `AI_INVALID_OUTPUT`. Never retries in a loop, never partially renders.
 *
 * `insufficient_evidence: true` in a successfully parsed sample is not a
 * schema violation - it is a valid, complete answer, so it returns here
 * exactly like any other sample. See {@link ForecastSample}.
 */
async function sampleForecastOnce(
  params: Anthropic.MessageCreateParamsNonStreaming,
  transport: AnthropicTransport,
  signal: AbortSignal,
): Promise<ForecastSample> {
  const first = await attemptOnce(params, transport, signal);
  if (first.outcome === 'success') return first.sample;
  if (first.outcome === 'aborted') throw new AiClientError('AI_TIMEOUT', 'sample aborted before completion');
  if (first.outcome === 'transport_error') {
    throw new AiClientError('UPSTREAM_UNAVAILABLE', `Anthropic request failed: ${first.reason}`);
  }

  // Exactly one retry, only for a schema violation.
  const second = await attemptOnce(params, transport, signal);
  if (second.outcome === 'success') return second.sample;
  if (second.outcome === 'aborted') throw new AiClientError('AI_TIMEOUT', 'sample aborted before completion');
  if (second.outcome === 'transport_error') {
    throw new AiClientError('UPSTREAM_UNAVAILABLE', `Anthropic request failed: ${second.reason}`);
  }
  throw new AiClientError(
    'AI_INVALID_OUTPUT',
    `schema violation persisted after one retry: ${second.reason}`,
  );
}

/**
 * Races `promise` against `signal` firing `abort`, independent of whether
 * `promise` itself ever settles. This is what makes the 45s ceiling a hard
 * guarantee rather than a best effort that depends on the transport (real or
 * faked in a test) honouring the signal it was given.
 */
function raceAgainstAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new AiClientError('AI_TIMEOUT', 'operation already exceeded its timeout'));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new AiClientError('AI_TIMEOUT', 'operation exceeded its timeout'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error as Error);
      },
    );
  });
}

export interface KSampledForecast {
  readonly aggregate: BlindAggregate;
  readonly survivingSamples: readonly ForecastSample[];
  readonly promptVersion: string;
  readonly requestedK: number;
  readonly succeededCount: number;
  readonly failedCount: number;
  /** How many of the surviving samples declared `insufficient_evidence: true`. Transparency only; no policy decision is made here - see T5.3. */
  readonly insufficientEvidenceCount: number;
}

/**
 * k parallel blind elicitations against `blind-v1.md`, aggregated by median
 * of log-odds with IQR dispersion. One failing sample never fails the batch:
 * every call starts concurrently, and aggregation runs over whatever
 * survives the shared timeout and each sample's own retry.
 *
 * @throws {AiClientError} `AI_TIMEOUT` when zero samples survive because the
 *   timeout fired, or `AI_INVALID_OUTPUT` when zero samples survive for any
 *   other reason (every one exhausted its retry).
 */
export async function runBlindSampling(
  input: BlindPromptInput,
  config: SamplingConfig,
  k: number = DEFAULT_SAMPLE_COUNT,
): Promise<KSampledForecast> {
  const assembled = buildBlindPrompt(input);
  const requestParams = buildRequestParams(assembled.text, config.modelId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const attempts = await Promise.allSettled(
      Array.from({ length: k }, () =>
        raceAgainstAbort(
          sampleForecastOnce(requestParams, config.transport, controller.signal),
          controller.signal,
        ),
      ),
    );

    const survivors: ForecastSample[] = [];
    let anyTimedOut = false;
    for (const attempt of attempts) {
      if (attempt.status === 'fulfilled') {
        survivors.push(attempt.value);
      } else if (attempt.reason instanceof AiClientError && attempt.reason.code === 'AI_TIMEOUT') {
        anyTimedOut = true;
      }
    }

    if (survivors.length === 0) {
      if (anyTimedOut) throw new AiClientError('AI_TIMEOUT', 'no samples completed before the timeout');
      throw new AiClientError('AI_INVALID_OUTPUT', 'no sample produced a valid submit_forecast response');
    }

    const probabilities: readonly Probability[] = survivors.map((sample) => sample.probability);

    return {
      aggregate: aggregateBlindSamples(probabilities),
      survivingSamples: survivors,
      promptVersion: assembled.promptVersion,
      requestedK: k,
      succeededCount: survivors.length,
      failedCount: k - survivors.length,
      insufficientEvidenceCount: survivors.filter((sample) => sample.insufficientEvidence).length,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A single (k=1) call against `anchored-v1.md`, which does receive the
 * market price. Diagnostic only: this result is never displayed as the
 * estimate and never enters the blend (T5.3's job). Its shape is
 * deliberately distinct from {@link KSampledForecast} so the two cannot be
 * confused at a call site or in a type signature.
 */
export interface AnchoredDiagnosticResult {
  readonly anchoredProbability: Probability;
  readonly promptVersion: string;
  readonly sample: ForecastSample;
}

/**
 * @throws {AiClientError} `AI_TIMEOUT` or `AI_INVALID_OUTPUT`, same policy as
 *   a single sample in {@link runBlindSampling}.
 */
export async function runAnchoredDiagnostic(
  input: AnchoredPromptInput,
  config: SamplingConfig,
): Promise<AnchoredDiagnosticResult> {
  const assembled = buildAnchoredPrompt(input);
  const requestParams = buildRequestParams(assembled.text, config.modelId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const sample = await raceAgainstAbort(
      sampleForecastOnce(requestParams, config.transport, controller.signal),
      controller.signal,
    );
    return { anchoredProbability: sample.probability, promptVersion: assembled.promptVersion, sample };
  } finally {
    clearTimeout(timer);
  }
}
