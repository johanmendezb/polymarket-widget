/**
 * T9.4's complementary direction to `test/ai/prompts.test.ts`. That suite
 * proves the loaded text is byte-identical to one named file each. This
 * suite proves the reverse: every `promptVersion` string the application can
 * actually emit — on an `AssembledPrompt` or on a persisted `Forecast` —
 * names a file that exists in `prompts/runtime/`. A version that names a
 * file which does not exist would only surface at request time, in
 * production, against a real market.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  ANCHORED_PROMPT_VERSION,
  BLIND_PROMPT_VERSION,
  buildAnchoredPrompt,
  buildBlindPrompt,
  composeForecastRecommendation,
  toAnchoredPromptInput,
  toBlindPromptInput,
  type AnthropicTransport,
} from '@/ai';
import {
  asFeeRate,
  asPrice,
  asShares,
  asUsdc,
  priceToProbability,
  type FeeConfig,
  type Market,
  type OrderBook,
} from '@/domain';

import type Anthropic from '@anthropic-ai/sdk';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUNTIME_PROMPTS_DIR = path.join(repoRoot, 'prompts', 'runtime');

function runtimePromptFileExists(version: string): boolean {
  try {
    readFileSync(path.join(RUNTIME_PROMPTS_DIR, `${version}.md`), 'utf8');
    return true;
  } catch {
    return false;
  }
}

const fees: FeeConfig = {
  enabled: true,
  takerRate: asFeeRate(0.04),
  makerRate: asFeeRate(0),
  displayLabel: 'Politics · 4% taker rate',
  source: 'market-object',
  estimated: false,
};

function fixtureMarket(): Market {
  const price = asPrice(0.6);
  return {
    id: '1',
    slug: 'promptversion-fixture',
    conditionId: '0xabc',
    question: 'Does every promptVersion name a file that exists?',
    description: 'Fixture market for the T9.4 prompt-inventory test.',
    resolutionSource: null,
    resolutionCriteria: 'Resolves YES if every file check passes.',
    outcomes: [
      { label: 'Yes', tokenId: '10000000000000000000000000000000000000000000000000000000000000000000000001', indicativePrice: price },
      { label: 'No', tokenId: '10000000000000000000000000000000000000000000000000000000000000000000000002', indicativePrice: asPrice(1 - 0.6) },
    ],
    negRisk: false,
    acceptingOrders: true,
    closed: false,
    active: true,
    endDate: '2026-12-31',
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    fees,
    liquidityUsd: 50000,
    volume24hUsd: 12000,
    bestBid: asPrice(0.59),
    bestAsk: price,
    spread: asPrice(0.01),
    lastTradePrice: price,
    eventId: '2',
    eventTitle: 'Fixture event',
    category: 'Politics',
  };
}

function fixtureBook(): OrderBook {
  return {
    tokenId: fixtureMarket().outcomes[0]!.tokenId,
    bids: [{ price: asPrice(0.59), size: asShares(1000) }],
    asks: [{ price: asPrice(0.6), size: asShares(1000) }],
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    negRisk: false,
    lastTradePrice: asPrice(0.6),
    fetchedAt: Date.parse('2026-08-16T00:00:00.000Z'),
    upstreamTimestamp: '2026-08-16T00:00:00.000Z',
  };
}

function toolUseMessage(input: Record<string, unknown>): Anthropic.Message {
  return {
    id: 'msg_test',
    content: [{ id: 'toolu_test', type: 'tool_use', name: 'submit_forecast', input }],
    model: 'claude-opus-5',
    role: 'assistant',
    stop_reason: 'tool_use',
    stop_sequence: null,
    type: 'message',
    usage: {
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      input_tokens: 10,
      output_tokens: 10,
      server_tool_use: null,
      service_tier: null,
    },
  };
}

function forecastInput(probability: number): Record<string, unknown> {
  return {
    probability,
    reasoning_summary: 'Fixture reasoning.',
    evidence: [
      {
        claim: 'A claim.',
        source_url: 'https://example.com/1',
        source_title: 'Example',
        published_at: '2026-08-01',
        supports: 'yes',
      },
    ],
    resolution_ambiguity: 'low',
    insufficient_evidence: false,
  };
}

class FakeTransport implements AnthropicTransport {
  createMessage(): Promise<Anthropic.Message> {
    return Promise.resolve(toolUseMessage(forecastInput(0.6)));
  }
}

describe('every promptVersion the application can emit names a file that exists', () => {
  it('BLIND_PROMPT_VERSION and ANCHORED_PROMPT_VERSION, the two version constants exported from src/ai, both resolve', () => {
    for (const version of [BLIND_PROMPT_VERSION, ANCHORED_PROMPT_VERSION]) {
      expect(runtimePromptFileExists(version)).toBe(true);
    }
  });

  it('an assembled blind prompt names a file that exists', () => {
    const market = fixtureMarket();
    const input = toBlindPromptInput(market, market.outcomes[0]!, '2026-08-16');
    const assembled = buildBlindPrompt(input);
    expect(runtimePromptFileExists(assembled.promptVersion)).toBe(true);
  });

  it('an assembled anchored prompt names a file that exists', () => {
    const market = fixtureMarket();
    const blindInput = toBlindPromptInput(market, market.outcomes[0]!, '2026-08-16');
    const marketProbability = priceToProbability(market.outcomes[0]!.indicativePrice ?? asPrice(0.5));
    const assembled = buildAnchoredPrompt(toAnchoredPromptInput(blindInput, marketProbability));
    expect(runtimePromptFileExists(assembled.promptVersion)).toBe(true);
  });

  it('a Forecast produced end to end by composeForecastRecommendation records a promptVersion that names a file that exists', async () => {
    const { kind, recommendation } = (await composeForecastRecommendation(
      fixtureMarket(),
      fixtureMarket().outcomes[0]!,
      fixtureBook(),
      1,
      { transport: new FakeTransport(), now: Date.parse('2026-08-16T00:00:00.000Z') },
    )) as { kind: 'recommendation'; recommendation: { forecast: { promptVersion: string } } };

    expect(kind).toBe('recommendation');
    expect(runtimePromptFileExists(recommendation.forecast.promptVersion)).toBe(true);
  });
});
