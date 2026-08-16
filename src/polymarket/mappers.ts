import {
  asFeeRate,
  asPrice,
  asShares,
  asUsdc,
  feeRateValue,
  isTokenId,
  type FeeConfig,
  type Market,
  type MarketOutcome,
  type OrderBook,
} from '@/domain';

import type { ClobBook, ClobPriceHistory, GammaEvent, GammaMarket } from './schemas';

/**
 * Category taker rates, published by Polymarket. Used only as the
 * `category-fallback` source in `deriveFeeConfig` below, never as the
 * arithmetic input when the market object itself carries a rate. See
 * `02-research/COMPETITIVE_RESEARCH.md` §1.4c and ADR-0009.
 */
const CATEGORY_TAKER_RATES: Readonly<Record<string, number>> = {
  crypto: 0.07,
  sports: 0.05,
  economics: 0.05,
  culture: 0.05,
  weather: 0.05,
  other: 0.05,
  finance: 0.04,
  politics: 0.04,
  mentions: 0.04,
  tech: 0.04,
  geopolitics: 0,
};

/** The bucket used when `feeType` is absent and so carries no category signal at all. */
const DEFAULT_CATEGORY = 'other';

/** `feeType` arrives as `"politics_fees"`, `"economics_fees"`, etc. */
function categoryFromFeeType(feeType: string | null): string | null {
  if (feeType === null) return null;
  const category = feeType.replace(/_fees$/, '').trim().toLowerCase();
  return category.length > 0 ? category : null;
}

function displayCategory(category: string | null): string {
  const label = category ?? DEFAULT_CATEGORY;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * `FeeConfig` derivation. Reads `feesEnabled`/`feeSchedule` from the market
 * object when present; falls back to the published category table only when
 * they are absent. **An absent field is never a zero rate** — this is the
 * single highest-likelihood correctness bug in the project (ADR-0009).
 */
function deriveFeeConfig(market: GammaMarket): FeeConfig {
  const category = categoryFromFeeType(market.feeType);
  const makerRate = asFeeRate(0); // Makers pay nothing. See FeeConfigBase.

  if (market.feesEnabled === true && market.feeSchedule !== null) {
    const takerRate = asFeeRate(market.feeSchedule.rate);
    return {
      enabled: true,
      takerRate,
      makerRate,
      displayLabel: `${displayCategory(category)} · ${Math.round(feeRateValue(takerRate) * 100)}% taker rate`,
      source: 'market-object',
      estimated: false,
    };
  }

  const fallbackRate = category !== null ? (CATEGORY_TAKER_RATES[category] ?? CATEGORY_TAKER_RATES[DEFAULT_CATEGORY]) : CATEGORY_TAKER_RATES[DEFAULT_CATEGORY];
  const takerRate = asFeeRate(fallbackRate ?? 0);
  return {
    enabled: feeRateValue(takerRate) > 0,
    takerRate,
    makerRate,
    displayLabel: `${displayCategory(category)} · ${Math.round(feeRateValue(takerRate) * 100)}% taker rate (estimated)`,
    source: 'category-fallback',
    estimated: true,
  };
}

function mapOutcomes(market: GammaMarket): readonly MarketOutcome[] {
  // The schema's superRefine already guarantees equal lengths; this loop
  // fails loudly a second time rather than trusting that invariant silently
  // if this function is ever called on an object built by hand (e.g. a test).
  if (market.outcomes.length !== market.clobTokenIds.length || market.outcomes.length !== market.outcomePrices.length) {
    throw new Error(
      `mapMarket: outcomes (${market.outcomes.length}), clobTokenIds (${market.clobTokenIds.length}) and ` +
        `outcomePrices (${market.outcomePrices.length}) must be the same length`,
    );
  }

  return market.outcomes.map((label, index) => {
    const tokenId = market.clobTokenIds[index];
    const priceText = market.outcomePrices[index];
    if (tokenId === undefined || priceText === undefined) {
      throw new Error(`mapMarket: missing outcome data at index ${index}`);
    }
    if (!isTokenId(tokenId)) {
      throw new Error(`mapMarket: outcome ${index} has a malformed token id: "${tokenId}"`);
    }
    const priceValue = Number(priceText);
    const indicativePrice = Number.isFinite(priceValue) ? asPrice(priceValue) : null;
    return { label, tokenId, indicativePrice };
  });
}

/**
 * Maps one Gamma market object to the domain `Market`. `bestBid`, `bestAsk`,
 * `spread` and `lastTradePrice` on the result are indicative only — good
 * enough to render, never to price a fill. See ADR-0008.
 */
export function mapMarket(
  market: GammaMarket,
  event?: { readonly eventId: string; readonly eventTitle: string },
): Market {
  return {
    id: market.id,
    slug: market.slug,
    conditionId: market.conditionId,
    question: market.question,
    description: market.description,
    resolutionSource: market.resolutionSource,
    resolutionCriteria: market.description,
    outcomes: mapOutcomes(market),
    negRisk: market.negRisk,
    acceptingOrders: market.acceptingOrders,
    closed: market.closed,
    active: market.active,
    endDate: market.endDate,
    tickSize: asPrice(market.orderPriceMinTickSize),
    minOrderSize: asUsdc(market.orderMinSize),
    fees: deriveFeeConfig(market),
    liquidityUsd: market.liquidityNum,
    volume24hUsd: market.volume24hr,
    bestBid: market.bestBid !== null ? asPrice(market.bestBid) : null,
    bestAsk: market.bestAsk !== null ? asPrice(market.bestAsk) : null,
    spread: market.spread !== null ? asPrice(market.spread) : null,
    lastTradePrice: market.lastTradePrice !== null ? asPrice(market.lastTradePrice) : null,
    eventId: event?.eventId ?? null,
    eventTitle: event?.eventTitle ?? null,
    category: categoryFromFeeType(market.feeType),
  };
}

/**
 * Flattens Gamma's event-nested search response into `Market[]`, carrying
 * `eventId`/`eventTitle` onto each market. Markets with `enableOrderBook ===
 * false` are excluded: we cannot price a fill for them, so surfacing them in
 * search is a dead end. See `04-architecture/API_CONTRACTS.md`.
 */
export function mapSearchResults(events: readonly GammaEvent[]): readonly Market[] {
  const markets: Market[] = [];
  for (const event of events) {
    for (const market of event.markets) {
      if (!market.enableOrderBook) continue;
      markets.push(mapMarket(market, { eventId: event.id, eventTitle: event.title }));
    }
  }
  return markets;
}

/**
 * The normalization contract. Upstream orders **both** sides worst-price-
 * first: asks descending, bids ascending, so the best level of each is the
 * LAST element on the wire. This reverses both, so within our domain
 * `asks[0]` is the best (lowest) ask and `bids[0]` is the best (highest)
 * bid. This is the most important function in the read path — see
 * `03-domain/POLYMARKET_DOMAIN_MODEL.md` §2 and the `polymarket-domain`
 * skill for what happens when only one side is reversed.
 */
export function mapOrderBook(book: ClobBook, fetchedAt: number): OrderBook {
  return {
    tokenId: book.asset_id,
    asks: [...book.asks].reverse().map((level) => ({ price: asPrice(level.price), size: asShares(level.size) })),
    bids: [...book.bids].reverse().map((level) => ({ price: asPrice(level.price), size: asShares(level.size) })),
    tickSize: asPrice(book.tick_size),
    minOrderSize: asUsdc(book.min_order_size),
    negRisk: book.neg_risk,
    lastTradePrice: book.last_trade_price !== null && book.last_trade_price !== undefined ? asPrice(book.last_trade_price) : null,
    fetchedAt,
    upstreamTimestamp: book.timestamp,
  };
}

export interface PricePoint {
  readonly t: number;
  readonly p: number;
}

export function mapPriceHistory(history: ClobPriceHistory): readonly PricePoint[] {
  return history.history.map((point) => ({ t: point.t, p: point.p }));
}
