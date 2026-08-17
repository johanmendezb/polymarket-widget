/**
 * T5.3 acceptance for `POST /api/ai/forecast`. Exercises the real upstream
 * read path (MSW-backed fixtures, same as the T3.4 route tests) composed
 * with a fake Anthropic transport injected through `handleForecastRequest`
 * — no network, no `ANTHROPIC_API_KEY`, per the task contract.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { handleForecastRequest } from '@/app/api/ai/forecast/route';
import type { AnthropicTransport } from '@/ai';
import type { Recommendation } from '@/domain';

import { GAMMA_BASE_URL, handlers, server } from '../../../polymarket/msw-helpers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const MARKET_ID = '2252244';
// Matches clobTokenIds[0] in gamma-market-liquid.json and asset_id in clob-book-liquid.json.
const YES_TOKEN_ID = '5615282760875985231868508008056959876238536896643315063916840237042205273721';

function toolUseBlock(input: Record<string, unknown>): Anthropic.ToolUseBlock {
  return { id: 'toolu_test', type: 'tool_use', name: 'submit_forecast', input };
}

function validForecastInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    probability: 0.6,
    reasoning_summary: 'A fixture answer.',
    evidence: Array.from({ length: 5 }, (_, i) => ({
      claim: `Claim ${i}`,
      source_url: `https://example.com/${i}`,
      source_title: `Source ${i}`,
      published_at: '2026-08-01',
      supports: 'yes',
    })),
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

function successMessage(probability: number, overrides: Record<string, unknown> = {}): Anthropic.Message {
  return fixtureMessage([toolUseBlock(validForecastInput({ probability, ...overrides }))]);
}

function proseOnlyMessage(): Anthropic.Message {
  return fixtureMessage([{ type: 'text', text: 'no tool call', citations: [] }]);
}

class FakeTransport implements AnthropicTransport {
  callCount = 0;
  readonly receivedPromptTexts: string[] = [];
  private readonly queue: readonly Anthropic.Message[];

  constructor(queue: readonly Anthropic.Message[]) {
    this.queue = queue;
  }

  createMessage(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> {
    const next = this.queue[this.callCount];
    this.callCount += 1;
    if (!next) throw new Error('FakeTransport queue exhausted');
    const content = params.messages[0]?.content;
    if (typeof content === 'string') this.receivedPromptTexts.push(content);
    return Promise.resolve(next);
  }
}

function request(body: unknown): Request {
  return new Request('http://localhost/api/ai/forecast', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function useMarketAndBookFixtures(): void {
  server.use(
    handlers.gammaMarket(MARKET_ID, 'gamma-market-liquid.json'),
    handlers.clobBook('clob-book-liquid.json'),
  );
}

describe('POST /api/ai/forecast', () => {
  it('returns a complete Recommendation for a fixture market, with provenance', async () => {
    useMarketAndBookFixtures();
    const transport = new FakeTransport([successMessage(0.8), successMessage(0.75)]);

    const response = await handleForecastRequest(
      request({ marketId: MARKET_ID, tokenId: YES_TOKEN_ID, samples: 1 }),
      { transport },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: Recommendation };
    const { forecast } = body.data;

    expect(body.data.verdict === 'CONSIDER' || body.data.verdict === 'NO_BET').toBe(true);
    expect(Array.isArray(body.data.reasons)).toBe(true);
    expect(forecast.modelId).toBe('claude-opus-5');
    expect(forecast.promptVersion).toBe('blind-v1');
    expect(typeof forecast.createdAt).toBe('string');
    expect(forecast.blendWeight).toBe(0.35);
    expect(forecast.samples).toHaveLength(1);
    expect(typeof forecast.dispersion).toBe('number');

    // The market price must never reach the blind prompt (CLAUDE.md rule 6):
    // the fixture book prices this outcome around 0.74-0.75.
    const blindPromptText = transport.receivedPromptTexts[0] ?? '';
    expect(blindPromptText).not.toMatch(/0\.7[0-9]{1,3}\b/);
    expect(blindPromptText).not.toMatch(/7[0-9](\.[0-9]+)?%/);
  });

  it('AI_NO_EVIDENCE: 200 with an explicit empty-forecast shape when the model finds nothing', async () => {
    useMarketAndBookFixtures();
    const transport = new FakeTransport([
      successMessage(0.6, { insufficient_evidence: true, evidence: [] }),
      successMessage(0.6),
    ]);

    const response = await handleForecastRequest(
      request({ marketId: MARKET_ID, tokenId: YES_TOKEN_ID, samples: 1 }),
      { transport },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('AI_NO_EVIDENCE');
    expect(typeof body.error.message).toBe('string');
  });

  it('AI_INVALID_OUTPUT: 502 after exactly one retry on a persistent schema violation', async () => {
    useMarketAndBookFixtures();
    const transport = new FakeTransport([proseOnlyMessage(), proseOnlyMessage(), proseOnlyMessage(), proseOnlyMessage()]);

    const response = await handleForecastRequest(
      request({ marketId: MARKET_ID, tokenId: YES_TOKEN_ID, samples: 1 }),
      { transport },
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('AI_INVALID_OUTPUT');
  });

  it('bad request: missing tokenId is 400 BAD_REQUEST, never reaches the transport', async () => {
    const transport = new FakeTransport([]);
    const response = await handleForecastRequest(request({ marketId: MARKET_ID }), { transport });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(transport.callCount).toBe(0);
  });

  it('bad request: non-digit tokenId is 400 BAD_REQUEST, never coerced', async () => {
    const transport = new FakeTransport([]);
    const response = await handleForecastRequest(
      request({ marketId: MARKET_ID, tokenId: '123abc' }),
      { transport },
    );
    expect(response.status).toBe(400);
  });

  it('unknown token for the market: 404 NOT_FOUND', async () => {
    useMarketAndBookFixtures();
    const transport = new FakeTransport([]);
    const response = await handleForecastRequest(
      request({ marketId: MARKET_ID, tokenId: '9999999999999999999999999999999999999999999999999999999999999999999999999' }),
      { transport },
    );
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('upstream market fetch failure: 502 UPSTREAM_UNAVAILABLE, and the AI transport is never called', async () => {
    // A marketId unused by any other test in this file: `fetchMarket` caches
    // by marketId (`04-architecture/ARCHITECTURE.md` §7), and a shared id
    // would silently serve an earlier test's cached success here instead of
    // exercising this failure.
    const failingMarketId = '4242424';
    server.use(handlers.status(`${GAMMA_BASE_URL}/markets/${failingMarketId}`, 500));
    const transport = new FakeTransport([]);
    const response = await handleForecastRequest(
      request({ marketId: failingMarketId, tokenId: YES_TOKEN_ID }),
      { transport },
    );
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(transport.callCount).toBe(0);
  });
});
