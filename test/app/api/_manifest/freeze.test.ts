/**
 * T8.1 acceptance. No network, no ANTHROPIC_API_KEY: `transport` and
 * `marketSource` are both fakes, mirroring test/ai/forecast.test.ts's own
 * FakeTransport (which itself mirrors test/ai/sampling.test.ts's copy).
 */
import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';

import { runFreeze } from '@/app/api/_manifest/freeze';
import type { MarketCandidateSource } from '@/app/api/_manifest/marketSource';
import type { AnthropicTransport } from '@/ai';
import { asFeeRate, asPrice, asShares, asUsdc, priceValue, type FeeConfig, type Market, type OrderBook } from '@/domain';

const NOW = 1_700_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Every queued message is used for both the blind sample and the anchored diagnostic, in order. */
class FakeTransport implements AnthropicTransport {
  callCount = 0;
  private readonly queue: readonly Anthropic.Message[];

  constructor(queue: readonly Anthropic.Message[]) {
    this.queue = queue;
  }

  createMessage(): Promise<Anthropic.Message> {
    const next = this.queue[this.callCount % this.queue.length];
    this.callCount += 1;
    if (!next) throw new Error('FakeTransport queue exhausted');
    return Promise.resolve(next);
  }
}

const feeConfig: FeeConfig = {
  enabled: true,
  takerRate: asFeeRate(0.04),
  makerRate: asFeeRate(0),
  displayLabel: 'Politics · 4% taker rate',
  source: 'market-object',
  estimated: false,
};

function fixtureMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: overrides.id ?? '1',
    slug: 'test-market',
    conditionId: 'cond1',
    question: 'Will X happen?',
    description: 'A test market.',
    resolutionSource: null,
    resolutionCriteria: 'Resolves YES if X happens.',
    outcomes: [
      { label: 'Yes', tokenId: `${overrides.id ?? '1'}-yes`, indicativePrice: asPrice(0.5) },
      { label: 'No', tokenId: `${overrides.id ?? '1'}-no`, indicativePrice: asPrice(0.5) },
    ],
    negRisk: false,
    acceptingOrders: true,
    closed: false,
    active: true,
    endDate: new Date(NOW + 10 * DAY_MS).toISOString(),
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    fees: feeConfig,
    liquidityUsd: null,
    volume24hUsd: null,
    bestBid: null,
    bestAsk: null,
    spread: null,
    lastTradePrice: null,
    eventId: null,
    eventTitle: null,
    category: 'Politics',
    ...overrides,
  };
}

function fixtureBook(tokenId: string): OrderBook {
  return {
    tokenId,
    bids: [{ price: asPrice(0.49), size: asShares(1000) }],
    asks: [{ price: asPrice(0.51), size: asShares(1000) }],
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    negRisk: false,
    lastTradePrice: asPrice(0.5),
    fetchedAt: NOW,
    upstreamTimestamp: String(NOW),
  };
}

function fakeMarketSource(markets: readonly Market[]): MarketCandidateSource {
  return { fetchCandidates: () => Promise.resolve(markets) };
}

function fakeFetchBook(): (tokenId: string) => Promise<{ data: OrderBook }> {
  return (tokenId: string) => Promise.resolve({ data: fixtureBook(tokenId) });
}

describe('runFreeze', () => {
  it('freezes every field the manifest entry requires, for a market that clears the gate', async () => {
    const market = fixtureMarket({ id: '1' });
    const transport = new FakeTransport([successMessage(0.75), successMessage(0.7)]);

    const report = await runFreeze(
      { n: 1, maxHorizonDays: 21 },
      { marketSource: fakeMarketSource([market]), fetchBook: fakeFetchBook(), transport, now: NOW, k: 1 },
    );

    expect(report.entries).toHaveLength(1);
    const entry = report.entries[0]!;
    expect(entry.marketId).toBe('1');
    expect(entry.question).toBe('Will X happen?');
    expect(entry.tokenId).toBe('1-yes');
    expect(entry.outcomeLabel).toBe('Yes');
    expect(entry.k).toBe(1);
    expect(entry.forecast.promptVersion).toBe('blind-v1');
    expect(entry.forecast.modelId).toBe('claude-opus-5');
    expect(typeof entry.forecast.dispersion).toBe('number');
    expect(entry.forecast.samples).toHaveLength(1);
    expect(['CONSIDER', 'NO_BET']).toContain(entry.gateVerdict);
    expect(Array.isArray(entry.gateReasons)).toBe(true);
    expect(entry.frozenAt).toBe(new Date(NOW).toISOString());
    // marketPriceAtFreeze = (0.49 + 0.51) / 2 = 0.5, recorded but never fed to the blind prompt.
    expect(priceValue(entry.marketPriceAtFreeze)).toBe(0.5);
  });

  it('refuses a resolved (closed) market, skipping it with a reason naming why', async () => {
    const resolved = fixtureMarket({ id: '1', closed: true });
    const transport = new FakeTransport([successMessage(0.6), successMessage(0.6)]);

    const report = await runFreeze(
      { n: 1, maxHorizonDays: 21 },
      { marketSource: fakeMarketSource([resolved]), fetchBook: fakeFetchBook(), transport, now: NOW, k: 1 },
    );

    expect(report.entries).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0]?.marketId).toBe('1');
    expect(report.skipped[0]?.reason).toMatch(/closed \(resolved\)/i);
    expect(transport.callCount).toBe(0);
  });

  it('skips a market the AI reports insufficient evidence for, and keeps going', async () => {
    const noEvidenceMarket = fixtureMarket({ id: '1' });
    const goodMarket = fixtureMarket({ id: '2', endDate: new Date(NOW + 11 * DAY_MS).toISOString() });
    const transport = new FakeTransport([
      successMessage(0.6, { insufficient_evidence: true, evidence: [] }), // market 1 blind
      successMessage(0.6, { insufficient_evidence: true, evidence: [] }), // market 1 anchored
      successMessage(0.75), // market 2 blind
      successMessage(0.7), // market 2 anchored
    ]);

    const report = await runFreeze(
      { n: 5, maxHorizonDays: 21 },
      {
        marketSource: fakeMarketSource([noEvidenceMarket, goodMarket]),
        fetchBook: fakeFetchBook(),
        transport,
        now: NOW,
        k: 1,
      },
    );

    expect(report.entries).toHaveLength(1);
    expect(report.entries[0]?.marketId).toBe('2');
    expect(report.skipped).toEqual([{ marketId: '1', reason: expect.stringMatching(/AI_NO_EVIDENCE/) }]);
  });

  it('stops once n entries are frozen, even with more eligible candidates available', async () => {
    const markets = Array.from({ length: 3 }, (_, i) =>
      fixtureMarket({ id: String(i + 1), endDate: new Date(NOW + (i + 1) * DAY_MS).toISOString() }),
    );
    const transport = new FakeTransport([successMessage(0.6), successMessage(0.6)]);

    const report = await runFreeze(
      { n: 1, maxHorizonDays: 21 },
      { marketSource: fakeMarketSource(markets), fetchBook: fakeFetchBook(), transport, now: NOW, k: 1 },
    );

    expect(report.entries).toHaveLength(1);
    expect(report.entries[0]?.marketId).toBe('1');
    expect(report.skipped).toHaveLength(0);
  });

  it('produces an empty report, honestly, when no candidates are eligible', async () => {
    const report = await runFreeze(
      { n: 5, maxHorizonDays: 21 },
      {
        marketSource: fakeMarketSource([]),
        fetchBook: fakeFetchBook(),
        transport: new FakeTransport([]),
        now: NOW,
        k: 1,
      },
    );

    expect(report.entries).toEqual([]);
    expect(report.candidatesConsidered).toBe(0);
  });
});
