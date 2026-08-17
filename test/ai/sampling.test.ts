import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';

import {
  AiClientError,
  createAnthropicTransport,
  defaultSamplingConfig,
  runAnchoredDiagnostic,
  runBlindSampling,
  sampleCountFromEnv,
  timeoutMsFromEnv,
  type AnthropicTransport,
} from '@/ai';
import { asProbability } from '@/domain';

function toolUseBlock(input: Record<string, unknown>): Anthropic.ToolUseBlock {
  return { id: 'toolu_test', type: 'tool_use', name: 'submit_forecast', input };
}

function validForecastInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    probability: 0.6,
    reasoning_summary: 'A fixture answer.',
    evidence: [],
    resolution_ambiguity: 'low',
    insufficient_evidence: false,
    ...overrides,
  };
}

function fixtureMessage(content: Anthropic.ContentBlock[]): Anthropic.Message {
  return {
    id: 'msg_test',
    content,
    model: 'claude-opus-5',
    role: 'assistant',
    stop_reason: 'tool_use',
    stop_sequence: null,
    type: 'message',
    usage: {
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      input_tokens: 100,
      output_tokens: 50,
      server_tool_use: null,
      service_tier: null,
    },
  };
}

/** A message that succeeds schema validation with the given probability. */
function successMessage(probability: number, overrides: Record<string, unknown> = {}): Anthropic.Message {
  return fixtureMessage([toolUseBlock(validForecastInput({ probability, ...overrides }))]);
}

/** A prose-only message: no tool_use block, which the sampler treats as a schema violation. */
function proseOnlyMessage(): Anthropic.Message {
  return fixtureMessage([{ type: 'text', text: 'I have an answer but did not call the tool.', citations: [] }]);
}

type QueuedResponse = () => Promise<Anthropic.Message>;

function immediate(message: Anthropic.Message): QueuedResponse {
  return () => Promise.resolve(message);
}

function delayed(message: Anthropic.Message, delayMs: number): QueuedResponse {
  return () => new Promise((resolve) => setTimeout(() => resolve(message), delayMs));
}

/** Never settles on its own - only `raceAgainstAbort`'s deadline can resolve a call built on this. */
function hangsForever(): QueuedResponse {
  return () => new Promise<Anthropic.Message>(() => {});
}

class FakeTransport implements AnthropicTransport {
  callCount = 0;
  private readonly queue: QueuedResponse[];

  constructor(queue: QueuedResponse[]) {
    this.queue = queue;
  }

  createMessage(): Promise<Anthropic.Message> {
    this.callCount += 1;
    const next = this.queue.shift();
    if (!next) throw new Error('FakeTransport queue exhausted - test wired too few responses');
    return next();
  }
}

const blindInput = {
  question: 'Will it happen?',
  outcomeLabel: 'Yes',
  resolutionCriteria: 'Resolves YES if it happens.',
  endDate: '2026-12-31',
  category: 'Politics',
  todayIso: '2026-08-16',
};

const anchoredInput = { ...blindInput, marketProbability: asProbability(0.5) };

describe('runBlindSampling', () => {
  it('runs k samples genuinely concurrently, not sequentially', async () => {
    const k = 5;
    const delayMs = 20;
    const transport = new FakeTransport(
      Array.from({ length: k }, () => delayed(successMessage(0.5), delayMs)),
    );

    const started = Date.now();
    await runBlindSampling(blindInput, defaultSamplingConfig(transport), k);
    const elapsed = Date.now() - started;

    // Sequential execution of 5 x 20ms calls would take >= 100ms. A generous
    // margin below that (well under double one call's delay) is only
    // reachable if the calls actually overlapped.
    expect(elapsed).toBeLessThan(delayMs * 3);
    expect(transport.callCount).toBe(k);
  });

  it('one failing sample does not fail the batch, and the surviving count is reported', async () => {
    const transport = new FakeTransport([
      immediate(successMessage(0.5)),
      immediate(successMessage(0.55)),
      immediate(proseOnlyMessage()), // sample 3, attempt 1: schema violation
      immediate(successMessage(0.6)),
      immediate(successMessage(0.65)),
      immediate(proseOnlyMessage()), // sample 3, attempt 2 (its one retry): also a violation
    ]);

    const result = await runBlindSampling(blindInput, defaultSamplingConfig(transport), 5);

    expect(result.requestedK).toBe(5);
    expect(result.succeededCount).toBe(4);
    expect(result.failedCount).toBe(1);
    expect(result.survivingSamples).toHaveLength(4);
    expect(transport.callCount).toBe(6);
  });

  it('a schema violation retries exactly once, then AI_INVALID_OUTPUT, for a persistently bad sample', async () => {
    const transport = new FakeTransport([immediate(proseOnlyMessage()), immediate(proseOnlyMessage())]);

    await expect(runBlindSampling(blindInput, defaultSamplingConfig(transport), 1)).rejects.toMatchObject({
      code: 'AI_INVALID_OUTPUT',
    });
    // Exactly the original call plus one retry - never a retry loop.
    expect(transport.callCount).toBe(2);
  });

  it('a sample that violates schema once and then succeeds on its retry counts as a success', async () => {
    const transport = new FakeTransport([immediate(proseOnlyMessage()), immediate(successMessage(0.5))]);

    const result = await runBlindSampling(blindInput, defaultSamplingConfig(transport), 1);

    expect(result.succeededCount).toBe(1);
    expect(transport.callCount).toBe(2);
  });

  it('times out and returns AI_TIMEOUT without hanging, even when the transport never settles', async () => {
    const transport = new FakeTransport([hangsForever(), hangsForever()]);
    const config = { transport, modelId: 'claude-opus-5', timeoutMs: 15 };

    const started = Date.now();
    await expect(runBlindSampling(blindInput, config, 2)).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
    const elapsed = Date.now() - started;

    // Bounded by the configured timeout, not by the (never-resolving) call.
    expect(elapsed).toBeLessThan(500);
  });

  it('insufficient_evidence: true is a valid abstention result, not an error', async () => {
    const transport = new FakeTransport([
      immediate(successMessage(0.5, { insufficient_evidence: true, evidence: [] })),
    ]);

    const result = await runBlindSampling(blindInput, defaultSamplingConfig(transport), 1);

    expect(result.succeededCount).toBe(1);
    expect(result.survivingSamples[0]?.insufficientEvidence).toBe(true);
    expect(result.insufficientEvidenceCount).toBe(1);
  });

  it('aggregates the surviving samples with median-of-log-odds (k=1 passes the single sample through)', async () => {
    const transport = new FakeTransport([immediate(successMessage(0.7))]);

    const result = await runBlindSampling(blindInput, defaultSamplingConfig(transport), 1);

    expect(result.aggregate.dispersion).toBe(0);
    expect(result.promptVersion).toBe('blind-v1');
  });
});

describe('runAnchoredDiagnostic', () => {
  it('runs a single call against the anchored prompt, structurally separate from the blind result', async () => {
    const transport = new FakeTransport([immediate(successMessage(0.55))]);

    const result = await runAnchoredDiagnostic(anchoredInput, defaultSamplingConfig(transport));

    expect(result.promptVersion).toBe('anchored-v1');
    expect(result.anchoredProbability).toBeDefined();
    expect(result.sample.insufficientEvidence).toBe(false);
    // Not a KSampledForecast: no `aggregate`, no `samples` array, no k accounting.
    expect(result).not.toHaveProperty('aggregate');
    expect(result).not.toHaveProperty('survivingSamples');
    expect(transport.callCount).toBe(1);
  });

  it('times out and returns AI_TIMEOUT without hanging', async () => {
    const transport = new FakeTransport([hangsForever(), hangsForever()]);
    const config = { transport, modelId: 'claude-opus-5', timeoutMs: 15 };

    await expect(runAnchoredDiagnostic(anchoredInput, config)).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
  });
});

describe('createAnthropicTransport', () => {
  it('throws a clean AiClientError, not a stack trace, when ANTHROPIC_API_KEY is unset', () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(() => createAnthropicTransport()).toThrow(AiClientError);
      try {
        createAnthropicTransport();
      } catch (error) {
        expect(error).toBeInstanceOf(AiClientError);
        expect((error as AiClientError).code).toBe('INTERNAL');
      }
    } finally {
      if (original === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = original;
    }
  });
});

describe('env-derived config defaults', () => {
  it('sampleCountFromEnv falls back to the default when AI_SAMPLES is unset or invalid', () => {
    const original = process.env.AI_SAMPLES;
    try {
      delete process.env.AI_SAMPLES;
      expect(sampleCountFromEnv()).toBe(5);
      process.env.AI_SAMPLES = 'not-a-number';
      expect(sampleCountFromEnv()).toBe(5);
      process.env.AI_SAMPLES = '3';
      expect(sampleCountFromEnv()).toBe(3);
    } finally {
      if (original === undefined) delete process.env.AI_SAMPLES;
      else process.env.AI_SAMPLES = original;
    }
  });

  it('timeoutMsFromEnv falls back to the default (45000) when AI_TIMEOUT_MS is unset or invalid', () => {
    const original = process.env.AI_TIMEOUT_MS;
    try {
      delete process.env.AI_TIMEOUT_MS;
      expect(timeoutMsFromEnv()).toBe(45_000);
      process.env.AI_TIMEOUT_MS = '0';
      expect(timeoutMsFromEnv()).toBe(45_000);
      process.env.AI_TIMEOUT_MS = '20000';
      expect(timeoutMsFromEnv()).toBe(20_000);
    } finally {
      if (original === undefined) delete process.env.AI_TIMEOUT_MS;
      else process.env.AI_TIMEOUT_MS = original;
    }
  });
});
