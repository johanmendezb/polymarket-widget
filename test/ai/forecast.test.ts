import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';

import { composeForecastRecommendation, REFERENCE_FILL_USDC } from '@/ai/forecast';
import { BLEND_WEIGHT } from '@/ai/blend';
import type { AnthropicTransport } from '@/ai';
import {
  asFeeRate,
  asPrice,
  asShares,
  asUsdc,
  probabilityValue,
  type FeeConfig,
  type Market,
  type MarketOutcome,
  type OrderBook,
} from '@/domain';

const NOW = 1_700_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

// --- Fake Anthropic transport, mirroring test/ai/sampling.test.ts's own copy ---

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

function successMessage(probability: number, overrides: Record<string, unknown> = {}): Anthropic.Message {
  return fixtureMessage([toolUseBlock(validForecastInput({ probability, ...overrides }))]);
}

function proseOnlyMessage(): Anthropic.Message {
  return fixtureMessage([{ type: 'text', text: 'no tool call', citations: [] }]);
}

type QueuedResponse = () => Promise<Anthropic.Message>;

function immediate(message: Anthropic.Message): QueuedResponse {
  return () => Promise.resolve(message);
}

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
    const next = this.queue[this.callCount];
    this.callCount += 1;
    if (!next) throw new Error('FakeTransport queue exhausted');
    return next();
  }
}

// --- Domain fixtures ---

const feeConfig: FeeConfig = {
  enabled: true,
  takerRate: asFeeRate(0.04),
  makerRate: asFeeRate(0),
  displayLabel: 'Politics · 4% taker rate',
  source: 'market-object',
  estimated: false,
};

const yesOutcome: MarketOutcome = {
  label: 'Yes',
  tokenId: '5615282760875985231868508008056959876238536896643315063916840237042205273721',
  indicativePrice: asPrice(0.5),
};

const noOutcome: MarketOutcome = {
  label: 'No',
  tokenId: '97050921740416192996389806693742575608111328819185493163189880975611314813724',
  indicativePrice: asPrice(0.5),
};

function fixtureMarket(): Market {
  return {
    id: '2252244',
    slug: 'test-market',
    conditionId: 'cond1',
    question: 'Will X happen?',
    description: 'A test market.',
    resolutionSource: null,
    resolutionCriteria: 'Resolves YES if X happens.',
    outcomes: [yesOutcome, noOutcome],
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
  };
}

/** One level each side, deep enough that a $100 reference fill never partials. */
function fixtureBook(): OrderBook {
  return {
    tokenId: yesOutcome.tokenId,
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

function fiveEvidenceItems(): Record<string, unknown>[] {
  return Array.from({ length: 5 }, (_, i) => ({
    claim: `Claim ${i}`,
    source_url: `https://example.com/${i}`,
    source_title: `Source ${i}`,
    published_at: '2026-08-01',
    supports: 'yes',
  }));
}

describe('composeForecastRecommendation', () => {
  it('produces a CONSIDER Recommendation with the blend computed in log-odds, matching a hand-computed value', async () => {
    // Blind sample first (k=1, drives the aggregate), anchored second (k=1
    // diagnostic) - runBlindSampling's k calls are issued synchronously
    // before runAnchoredDiagnostic's single call, since both start inside
    // the same Promise.all.
    const transport = new FakeTransport([
      immediate(successMessage(0.75, { evidence: fiveEvidenceItems(), resolution_ambiguity: 'low' })),
      immediate(successMessage(0.7)),
    ]);

    const result = await composeForecastRecommendation(fixtureMarket(), yesOutcome, fixtureBook(), 1, {
      transport,
      now: NOW,
    });

    expect(result.kind).toBe('recommendation');
    if (result.kind !== 'recommendation') throw new Error('unreachable');
    const { recommendation } = result;

    // marketProbability = (0.49 + 0.51) / 2 = 0.50 -> logit = 0
    // logit(0.75) = ln(3) = 1.0986123
    // blended log-odds = 0.65*0 + 0.35*1.0986123 = 0.3845143
    // sigmoid(0.3845143) = 0.5949614
    expect(probabilityValue(recommendation.forecast.marketProbability)).toBeCloseTo(0.5, 9);
    expect(probabilityValue(recommendation.forecast.blindProbability)).toBeCloseTo(0.75, 9);
    expect(probabilityValue(recommendation.forecast.blendedProbability)).toBeCloseTo(0.594961, 5);
    expect(recommendation.forecast.blendWeight).toBe(BLEND_WEIGHT);
    expect(recommendation.forecast.anchoredProbability).not.toBeNull();
    expect(probabilityValue(recommendation.forecast.anchoredProbability!)).toBeCloseTo(0.7, 9);
    expect(recommendation.forecast.dispersion).toBe(0);
    expect(recommendation.forecast.confidence).toBe('high');
    expect(recommendation.forecast.samples).toHaveLength(1);
    expect(recommendation.forecast.evidence).toHaveLength(5);
    expect(recommendation.forecast.modelId).toBe('claude-opus-5');
    expect(recommendation.forecast.promptVersion).toBe('blind-v1');
    expect(recommendation.forecast.createdAt).toBe(new Date(NOW).toISOString());

    // fee per share at averagePrice 0.51, rate 0.04: 0.04*0.51*0.49 = 0.009996 -> 0.01
    // effectiveCostPerShare = 0.52; edge = 0.5949614 - 0.52 = 0.0749614
    expect(recommendation.estimatedEdge).toBeCloseTo(0.074961, 5);
    expect(recommendation.verdict).toBe('CONSIDER');
    expect(recommendation.reasons).toEqual([]);
    // quarter Kelly at p=0.5949614, q=0.51: (0.0849614/0.49)*0.25 = 0.04335, capped at 0.02
    expect(recommendation.suggestedFractionOfBankroll).toBeCloseTo(0.02, 9);

    expect(recommendation.fill.requested).toEqual({ kind: 'usdc', value: REFERENCE_FILL_USDC });
    expect(recommendation.fill.partial).toBe(false);
  });

  it('names every reason code when the gate fires', async () => {
    const transport = new FakeTransport([
      // Deliberately low blind estimate and thin evidence so the blend
      // survives cost but the gate still has real reasons to name.
      immediate(successMessage(0.5, { evidence: [], resolution_ambiguity: 'high' })),
      immediate(successMessage(0.5)),
    ]);

    const result = await composeForecastRecommendation(fixtureMarket(), yesOutcome, fixtureBook(), 1, {
      transport,
      now: NOW,
    });

    expect(result.kind).toBe('recommendation');
    if (result.kind !== 'recommendation') throw new Error('unreachable');
    expect(result.recommendation.verdict).toBe('NO_BET');
    expect(result.recommendation.reasons).toEqual(
      expect.arrayContaining(['EDGE_BELOW_COST', 'THIN_EVIDENCE', 'AMBIGUOUS_RESOLUTION']),
    );
    expect(result.recommendation.suggestedFractionOfBankroll).toBeNull();
  });

  it('maps a strict majority of insufficient_evidence samples to AI_NO_EVIDENCE', async () => {
    const transport = new FakeTransport([
      immediate(successMessage(0.5, { insufficient_evidence: true, evidence: [] })),
      immediate(successMessage(0.6, { insufficient_evidence: true, evidence: [] })),
      immediate(successMessage(0.7, { insufficient_evidence: false, evidence: fiveEvidenceItems() })),
      immediate(successMessage(0.5)), // anchored
    ]);

    const result = await composeForecastRecommendation(fixtureMarket(), yesOutcome, fixtureBook(), 3, {
      transport,
      now: NOW,
    });

    expect(result.kind).toBe('no_evidence');
  });

  it('degrades to a null anchoredProbability, without failing the forecast, when the anchored diagnostic fails', async () => {
    const transport = new FakeTransport([
      immediate(successMessage(0.75, { evidence: fiveEvidenceItems() })),
      immediate(proseOnlyMessage()), // anchored attempt 1: schema violation
      immediate(proseOnlyMessage()), // anchored attempt 2 (its one retry): also a violation
    ]);

    const result = await composeForecastRecommendation(fixtureMarket(), yesOutcome, fixtureBook(), 1, {
      transport,
      now: NOW,
    });

    expect(result.kind).toBe('recommendation');
    if (result.kind !== 'recommendation') throw new Error('unreachable');
    expect(result.recommendation.forecast.anchoredProbability).toBeNull();
  });

  it('propagates AI_INVALID_OUTPUT when the blind sampling itself never produces a valid sample', async () => {
    // The blind (k=1) and anchored (k=1) calls run concurrently and each may
    // retry once, so up to 4 calls interleave without a guaranteed order.
    // Every queued response is a schema violation so the outcome does not
    // depend on which call consumes which slot.
    const transport = new FakeTransport([
      immediate(proseOnlyMessage()),
      immediate(proseOnlyMessage()),
      immediate(proseOnlyMessage()),
      immediate(proseOnlyMessage()),
    ]);

    await expect(
      composeForecastRecommendation(fixtureMarket(), yesOutcome, fixtureBook(), 1, { transport, now: NOW }),
    ).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
  });

  it('propagates AI_TIMEOUT when the blind sampling exceeds its deadline', async () => {
    const transport = new FakeTransport([hangsForever(), hangsForever(), hangsForever()]);

    await expect(
      composeForecastRecommendation(fixtureMarket(), yesOutcome, fixtureBook(), 1, {
        transport,
        now: NOW,
        timeoutMs: 20,
      }),
    ).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
  });
});
