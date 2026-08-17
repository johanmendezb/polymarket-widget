/**
 * The thin-book scenario for T6.2 #3: a real recorded market with genuinely
 * shallow depth (`gamma-market-thin.json` / `clob-book-thin.json`, T1.4 —
 * "Will Trump not endorse a Party in the 2026 Israeli Election?", total ask
 * depth 2,338.2 shares across 21 levels, about $1,590 to buy out entirely).
 * Small enough that a plain preset amount exceeds it.
 */
import { bestFirst, decodedOutcomes, readClobBook, readGammaMarket } from './rawFixtures';
import type { WireFeeConfig, WireMarket, WireOrderBook } from './wireTypes';

const rawMarket = readGammaMarket('gamma-market-thin.json');
const rawBook = readClobBook('clob-book-thin.json');
const outcomes = decodedOutcomes(rawMarket);

export const THIN_YES_TOKEN_ID = outcomes[0]!.tokenId;

const thinFees: WireFeeConfig = {
  enabled: true,
  takerRate: 0.04,
  makerRate: 0,
  displayLabel: 'Politics · 4% taker rate',
  source: 'market-object',
  estimated: false,
};

export const thinMarket: WireMarket = {
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
  fees: thinFees,
  liquidityUsd: rawMarket.liquidityNum,
  volume24hUsd: rawMarket.volume24hr,
  bestBid: rawMarket.bestBid,
  bestAsk: rawMarket.bestAsk,
  spread: rawMarket.spread,
  lastTradePrice: rawMarket.lastTradePrice,
  eventId: 'e2e-thin-event',
  eventTitle: 'E2E thin-book event',
  category: 'politics',
};

/** All 21 real recorded levels, best first — total depth 2,338.2 shares. */
export const thinBook: WireOrderBook = {
  tokenId: rawBook.asset_id,
  bids: bestFirst(rawBook.bids),
  asks: bestFirst(rawBook.asks),
  tickSize: Number(rawBook.tick_size),
  minOrderSize: Number(rawBook.min_order_size),
  negRisk: rawBook.neg_risk,
  lastTradePrice: rawBook.last_trade_price != null ? Number(rawBook.last_trade_price) : null,
  fetchedAt: Date.now(),
  upstreamTimestamp: rawBook.timestamp,
};

export const THIN_TOTAL_DEPTH_SHARES = thinBook.asks.reduce((sum, level) => sum + level.size, 0);
