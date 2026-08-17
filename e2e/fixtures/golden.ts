/**
 * The golden-path scenario's fixture data: one liquid market
 * ("Will there be no change in Fed interest rates after the September 2026
 * meeting?", id 2252244) built from the real recorded fixtures in
 * `test/fixtures/` (`gamma-market-liquid.json` / `clob-book-liquid.json`,
 * T1.4). The book keeps only the top three ask levels — real prices and
 * sizes, just truncated — which is ample depth for every amount this suite
 * requests.
 *
 * `market.fees` mirrors exactly what `deriveFeeConfig` (T3.2,
 * `src/polymarket/mappers.ts`) computes from this market's own
 * `feesEnabled: true` / `feeSchedule: { rate: 0.05, ... }` / `feeType:
 * "economics_fees"`: `source: 'market-object'`, 5% taker rate, label
 * "Economics · 5% taker rate". This is asserted directly in
 * `test/polymarket/mappers.test.ts`; it is not re-derived here.
 */
import { bestFirst, decodedOutcomes, readClobBook, readGammaMarket } from './rawFixtures';
import type { WireFeeConfig, WireMarket, WireOrderBook, WireRecommendation } from './wireTypes';

const rawMarket = readGammaMarket('gamma-market-liquid.json');
const rawBook = readClobBook('clob-book-liquid.json');
const outcomes = decodedOutcomes(rawMarket);

export const GOLDEN_YES_TOKEN_ID = outcomes[0]!.tokenId;
export const GOLDEN_NO_TOKEN_ID = outcomes[1]!.tokenId;
export const GOLDEN_MARKET_ID = rawMarket.id;

const goldenFees: WireFeeConfig = {
  enabled: true,
  takerRate: 0.05,
  makerRate: 0,
  displayLabel: 'Economics · 5% taker rate',
  source: 'market-object',
  estimated: false,
};

export function buildGoldenMarket(overrides: Partial<WireMarket> = {}): WireMarket {
  return {
    id: rawMarket.id,
    slug: rawMarket.slug,
    conditionId: rawMarket.conditionId,
    question: rawMarket.question,
    description: rawMarket.description,
    resolutionSource: null,
    resolutionCriteria: rawMarket.description,
    outcomes: outcomes.map((o) => ({ label: o.label, tokenId: o.tokenId, indicativePrice: Number(o.priceText) })),
    negRisk: rawMarket.negRisk ?? false,
    acceptingOrders: rawMarket.acceptingOrders,
    closed: rawMarket.closed,
    active: rawMarket.active,
    endDate: rawMarket.endDate,
    tickSize: rawMarket.orderPriceMinTickSize,
    minOrderSize: rawMarket.orderMinSize,
    fees: goldenFees,
    liquidityUsd: rawMarket.liquidityNum,
    volume24hUsd: rawMarket.volume24hr,
    bestBid: rawMarket.bestBid,
    bestAsk: rawMarket.bestAsk,
    spread: rawMarket.spread,
    lastTradePrice: rawMarket.lastTradePrice,
    eventId: 'e2e-golden-event',
    eventTitle: 'E2E golden path event',
    category: 'economics',
    ...overrides,
  };
}

export const goldenMarket = buildGoldenMarket();

/** Top three real ask levels (best first): 0.75 / 0.76 / 0.77 — see the module doc. */
export function buildGoldenBook(overrides: Partial<WireOrderBook> = {}): WireOrderBook {
  return {
    tokenId: rawBook.asset_id,
    bids: bestFirst(rawBook.bids).slice(0, 3),
    asks: bestFirst(rawBook.asks).slice(0, 3),
    tickSize: Number(rawBook.tick_size),
    minOrderSize: Number(rawBook.min_order_size),
    negRisk: rawBook.neg_risk,
    lastTradePrice: rawBook.last_trade_price != null ? Number(rawBook.last_trade_price) : null,
    fetchedAt: Date.now(),
    upstreamTimestamp: rawBook.timestamp,
    ...overrides,
  };
}

export const goldenBook = buildGoldenBook();

/**
 * The AI second-opinion fixture for the golden path. Its own `fill` is not
 * rendered by `AiPanel` (only `forecast` and the verdict are) and is
 * therefore not tied to the order-preview numbers computed independently in
 * `golden-path.spec.ts` — the AI panel is documented as an independent data
 * path (`USER_FLOWS.md` State B) and this fixture keeps that boundary.
 */
export const goldenRecommendation: WireRecommendation = {
  verdict: 'CONSIDER',
  reasons: [],
  estimatedEdge: 0.018,
  suggestedFractionOfBankroll: 0.02,
  forecast: {
    tokenId: GOLDEN_YES_TOKEN_ID,
    outcomeLabel: 'Yes',
    blindProbability: 0.71,
    dispersion: 0.05,
    samples: [0.68, 0.7, 0.71, 0.72, 0.74],
    anchoredProbability: 0.73,
    blendedProbability: 0.734,
    blendWeight: 0.35,
    marketProbability: 0.745,
    confidence: 'medium',
    evidence: [
      {
        claim: 'The most recent FOMC commentary leaned toward holding rates steady through September.',
        sourceUrl: 'https://example.org/fomc-commentary',
        sourceTitle: 'Example FOMC Commentary Tracker',
        publishedAt: '2026-08-12T00:00:00.000Z',
        supports: 'yes',
      },
      {
        claim: 'A surprise inflation print could shift committee sentiment before the meeting.',
        sourceUrl: 'https://example.org/inflation-print',
        sourceTitle: 'Example Inflation Report',
        publishedAt: null,
        supports: 'context',
      },
    ],
    risks: ['Resolution depends on the committee statement text, which can be read multiple ways.'],
    modelId: 'claude-opus-5',
    promptVersion: 'blind-v1',
    createdAt: '2026-08-16T12:00:00.000Z',
  },
  fill: {
    requested: { kind: 'usdc', value: 25 },
    legs: [{ price: 0.75, shares: 33.33 }],
    sharesFilled: 33.33,
    averagePrice: 0.75,
    topOfBookPrice: 0.75,
    priceImpact: 0,
    grossCost: 25,
    fee: 0.234375,
    totalCost: 25.234375,
    payoutIfWin: 33.33,
    netProfitIfWin: 8.095625,
    partial: false,
    maxFillableShares: 90953.73,
    bookFetchedAt: Date.now(),
  },
};
