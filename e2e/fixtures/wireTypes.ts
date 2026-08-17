/**
 * JSON wire shapes for the E2E mocks.
 *
 * These mirror the field names of the domain types in `src/domain`, but use
 * plain `number`/`string` instead of the branded primitives (`Price`,
 * `Shares`, `Usdc`, ...). Branding is a TypeScript-only nominal-typing device
 * — see `src/domain/brand.ts` — with a plain number at runtime, so nothing is
 * lost by typing the wire payload this way: it is exactly the shape that
 * crosses `JSON.stringify`/`JSON.parse` at the browser boundary, which is all
 * `page.route()` ever sees.
 *
 * `e2e/` sits outside `src/`, so the import-boundary ESLint rule
 * (`04-architecture/ARCHITECTURE.md` §3) does not apply here.
 */

export interface WireMeta {
  readonly fetchedAt: number;
  readonly stale: boolean;
  readonly cached: boolean;
}

export interface WireSuccessEnvelope<T> {
  readonly data: T;
  readonly meta: WireMeta;
}

export type WireErrorCode =
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_RATE_LIMITED'
  | 'UPSTREAM_SHAPE_CHANGED'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'AI_TIMEOUT'
  | 'AI_INVALID_OUTPUT'
  | 'AI_NO_EVIDENCE'
  | 'INTERNAL';

export interface WireErrorEnvelope {
  readonly error: {
    readonly code: WireErrorCode;
    readonly message: string;
    readonly retryable: boolean;
  };
}

/** HTTP status per code — must match `src/lib/api-envelope.ts`'s table exactly. */
export const HTTP_STATUS_BY_CODE: Readonly<Record<WireErrorCode, number>> = {
  UPSTREAM_UNAVAILABLE: 502,
  UPSTREAM_RATE_LIMITED: 429,
  UPSTREAM_SHAPE_CHANGED: 502,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  AI_TIMEOUT: 504,
  AI_INVALID_OUTPUT: 502,
  AI_NO_EVIDENCE: 200,
  INTERNAL: 500,
};

const RETRYABLE_CODES: ReadonlySet<WireErrorCode> = new Set([
  'UPSTREAM_UNAVAILABLE',
  'UPSTREAM_RATE_LIMITED',
  'AI_TIMEOUT',
]);

export function errorEnvelope(code: WireErrorCode, message: string): WireErrorEnvelope {
  return { error: { code, message, retryable: RETRYABLE_CODES.has(code) } };
}

export function successEnvelope<T>(data: T, meta?: Partial<WireMeta>): WireSuccessEnvelope<T> {
  return { data, meta: { fetchedAt: Date.now(), stale: false, cached: false, ...meta } };
}

export interface WireMarketOutcome {
  readonly label: string;
  readonly tokenId: string;
  readonly indicativePrice: number | null;
}

export interface WireFeeConfig {
  readonly enabled: boolean;
  readonly takerRate: number;
  readonly makerRate: number;
  readonly displayLabel: string;
  readonly source: 'market-object' | 'clob-fee-rate-endpoint' | 'category-fallback';
  readonly estimated: boolean;
}

export interface WireMarket {
  readonly id: string;
  readonly slug: string;
  readonly conditionId: string;
  readonly question: string;
  readonly description: string;
  readonly resolutionSource: string | null;
  readonly resolutionCriteria: string | null;
  readonly outcomes: readonly WireMarketOutcome[];
  readonly negRisk: boolean;
  readonly acceptingOrders: boolean;
  readonly closed: boolean;
  readonly active: boolean;
  readonly endDate: string | null;
  readonly tickSize: number;
  readonly minOrderSize: number;
  readonly fees: WireFeeConfig;
  readonly liquidityUsd: number | null;
  readonly volume24hUsd: number | null;
  readonly bestBid: number | null;
  readonly bestAsk: number | null;
  readonly spread: number | null;
  readonly lastTradePrice: number | null;
  readonly eventId: string | null;
  readonly eventTitle: string | null;
  readonly category: string | null;
}

export interface WireBookLevel {
  readonly price: number;
  readonly size: number;
}

export interface WireOrderBook {
  readonly tokenId: string;
  readonly bids: readonly WireBookLevel[];
  readonly asks: readonly WireBookLevel[];
  readonly tickSize: number;
  readonly minOrderSize: number;
  readonly negRisk: boolean;
  readonly lastTradePrice: number | null;
  readonly fetchedAt: number;
  readonly upstreamTimestamp: string;
}

export interface WireEvidenceItem {
  readonly claim: string;
  readonly sourceUrl: string;
  readonly sourceTitle: string;
  readonly publishedAt: string | null;
  readonly supports: 'yes' | 'no' | 'context';
}

export interface WireFillEstimate {
  readonly requested: { readonly kind: 'shares' | 'usdc'; readonly value: number };
  readonly legs: readonly { readonly price: number; readonly shares: number }[];
  readonly sharesFilled: number;
  readonly averagePrice: number;
  readonly topOfBookPrice: number;
  readonly priceImpact: number;
  readonly grossCost: number;
  readonly fee: number;
  readonly totalCost: number;
  readonly payoutIfWin: number;
  readonly netProfitIfWin: number;
  readonly partial: boolean;
  readonly maxFillableShares: number;
  readonly bookFetchedAt: number;
}

export interface WireForecast {
  readonly tokenId: string;
  readonly outcomeLabel: string;
  readonly blindProbability: number;
  readonly dispersion: number;
  readonly samples: readonly number[];
  readonly anchoredProbability: number | null;
  readonly blendedProbability: number;
  readonly blendWeight: number;
  readonly marketProbability: number;
  readonly confidence: 'low' | 'medium' | 'high';
  readonly evidence: readonly WireEvidenceItem[];
  readonly risks: readonly string[];
  readonly modelId: string;
  readonly promptVersion: string;
  readonly createdAt: string;
}

export type WireGateReason =
  | 'EDGE_BELOW_COST'
  | 'SPREAD_TOO_WIDE'
  | 'INSUFFICIENT_DEPTH'
  | 'EXTREME_PRICE_BAND'
  | 'HORIZON_TOO_LONG'
  | 'MARKET_TOO_CERTAIN'
  | 'THIN_EVIDENCE'
  | 'HIGH_MODEL_DISPERSION'
  | 'AMBIGUOUS_RESOLUTION'
  | 'NEAR_EXPIRY_SPORTS'
  | 'MARKET_NOT_ACCEPTING_ORDERS';

export interface WireRecommendation {
  readonly verdict: 'CONSIDER' | 'NO_BET';
  readonly reasons: readonly WireGateReason[];
  readonly estimatedEdge: number;
  readonly suggestedFractionOfBankroll: number | null;
  readonly forecast: WireForecast;
  readonly fill: WireFillEstimate;
}

export interface WireSearchResponse {
  readonly markets: readonly WireMarket[];
  readonly hasMore: boolean;
}

export interface WireHistoryResponse {
  readonly points: readonly { readonly t: number; readonly p: number }[];
}
