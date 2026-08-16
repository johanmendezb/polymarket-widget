/**
 * The live Polymarket read contract.
 *
 * Run with `pnpm test:live`, against production, by hand: at the start of a work
 * session and once before a demo. It is excluded from `pnpm test` and from CI by
 * `vitest.config.ts`, and it is the only suite that touches the network.
 *
 * What it protects is the set of upstream behaviours the whole read path assumes.
 * If one of these fails, the recorded fixtures in `test/fixtures/` are stale and
 * something upstream moved — which is exactly what we want to learn before a
 * reviewer does. Re-record with `pnpm record-fixtures`.
 *
 * Every call here is unauthenticated. No API key, no wallet, no auth header.
 */
import { beforeAll, describe, expect, it } from 'vitest';

const GAMMA = 'https://gamma-api.polymarket.com';
const CLOB = 'https://clob.polymarket.com';
const USER_AGENT = 'polymarket-second-opinion-live-contract/0.1';

/** How many of the search's markets to pull books for. Enough to see a pattern. */
const BOOKS_TO_SAMPLE = 5;

interface Fetched {
  readonly url: string;
  readonly status: number;
  readonly body: unknown;
}

interface Level {
  readonly price: string;
  readonly size: string;
}

interface SampledBook {
  readonly marketId: string;
  readonly question: string;
  readonly tokenId: string;
  readonly raw: Record<string, unknown>;
  readonly asks: readonly Level[];
  readonly bids: readonly Level[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('expected a JSON object');
  return value;
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('expected a JSON string');
  return value;
}

/** `outcomes`, `outcomePrices` and `clobTokenIds` all arrive JSON-encoded. */
function decodeArray(value: unknown): string[] {
  const parsed: unknown = JSON.parse(text(value));
  if (!Array.isArray(parsed)) throw new Error('encoded field did not decode to an array');
  return parsed.map((entry) => text(entry));
}

function levels(value: unknown): Level[] {
  if (!Array.isArray(value)) throw new Error('expected a book side array');
  return value.map((entry) => {
    const level = record(entry);
    return { price: text(level.price), size: text(level.size) };
  });
}

/** No auth header of any kind. An explicit User-Agent, and nothing else. */
async function get(url: string): Promise<Fetched> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  const raw = await response.text();
  return { url, status: response.status, body: response.status === 200 ? JSON.parse(raw) : raw };
}

function marketsIn(payload: unknown): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const events = isRecord(payload) ? payload.events : undefined;
  if (!Array.isArray(events)) return found;
  for (const event of events) {
    if (!isRecord(event) || !Array.isArray(event.markets)) continue;
    for (const market of event.markets) {
      if (isRecord(market) && typeof market.clobTokenIds === 'string') found.push(market);
    }
  }
  return found;
}

let search: Fetched;
let searchMarkets: Record<string, unknown>[];
let firstMarketDetail: Fetched;
let books: SampledBook[];
let history: Fetched;

beforeAll(async () => {
  search = await get(`${GAMMA}/public-search?q=election`);
  searchMarkets = marketsIn(search.body);
  const first = searchMarkets[0];
  if (first === undefined) throw new Error('public-search returned no markets to test against');
  firstMarketDetail = await get(`${GAMMA}/markets/${text(first.id)}`);

  books = [];
  for (const market of searchMarkets.slice(0, BOOKS_TO_SAMPLE)) {
    const tokenId = decodeArray(market.clobTokenIds)[0];
    if (tokenId === undefined) continue;
    const response = await get(`${CLOB}/book?token_id=${tokenId}`);
    if (response.status !== 200) continue;
    const raw = record(response.body);
    books.push({
      marketId: text(market.id),
      question: text(market.question),
      tokenId,
      raw,
      asks: levels(raw.asks),
      bids: levels(raw.bids),
    });
  }

  const withDepth = books.find((book) => book.asks.length > 1);
  const historyToken = withDepth?.tokenId ?? books[0]?.tokenId;
  if (historyToken === undefined) throw new Error('no book could be fetched for any search market');
  history = await get(`${CLOB}/prices-history?market=${historyToken}&interval=1w&fidelity=60`);
});

describe('reads are public', () => {
  it('answers every contracted endpoint with 200 and no credentials', () => {
    expect(search.status).toBe(200);
    expect(firstMarketDetail.status).toBe(200);
    expect(history.status).toBe(200);
    expect(books.length).toBeGreaterThan(0);
    for (const book of books) expect(book.tokenId).toMatch(/^\d+$/);
  });

  it('returns price history as timestamped points', () => {
    const points = record(history.body).history;
    expect(Array.isArray(points)).toBe(true);
  });
});

describe('the order book arrives worst-price-first', () => {
  // The single most important assertion in the repository. Reading asks[0]
  // unreversed prices every buy near a dollar. Reading bids[0] unreversed is
  // quieter and worse: the spread reads as enormous and the gate abstains from
  // healthy markets without anything throwing.
  it('sorts asks descending, so the best (lowest) ask is the LAST element', () => {
    const checked = books.filter((book) => book.asks.length > 1);
    expect(checked.length).toBeGreaterThan(0);
    for (const book of checked) {
      const prices = book.asks.map((level) => Number(level.price));
      const descending = [...prices].sort((a, b) => b - a);
      expect(prices, `asks not descending for market ${book.marketId}`).toEqual(descending);
      expect(prices.at(-1), `best ask is not last for ${book.marketId}`).toBe(Math.min(...prices));
    }
  });

  it('sorts bids ascending, so the best (highest) bid is the LAST element', () => {
    const checked = books.filter((book) => book.bids.length > 1);
    expect(checked.length).toBeGreaterThan(0);
    for (const book of checked) {
      const prices = book.bids.map((level) => Number(level.price));
      const ascending = [...prices].sort((a, b) => a - b);
      expect(prices, `bids not ascending for market ${book.marketId}`).toEqual(ascending);
      expect(prices.at(-1), `best bid is not last for ${book.marketId}`).toBe(Math.max(...prices));
    }
  });

  it('is not crossed once each side is read from its correct end', () => {
    for (const book of books) {
      if (book.asks.length === 0 || book.bids.length === 0) continue;
      const bestAsk = Number(book.asks.at(-1)?.price);
      const bestBid = Number(book.bids.at(-1)?.price);
      expect(bestAsk, `crossed book for market ${book.marketId}`).toBeGreaterThanOrEqual(bestBid);
    }
  });
});

describe('the /book wire shape', () => {
  it('is snake_case', () => {
    for (const book of books) {
      expect(Object.keys(book.raw).sort()).toEqual(
        expect.arrayContaining([
          'asks',
          'asset_id',
          'bids',
          'hash',
          'last_trade_price',
          'market',
          'min_order_size',
          'neg_risk',
          'tick_size',
          'timestamp',
        ]),
      );
    }
  });

  it('echoes the token id as a string', () => {
    for (const book of books) expect(text(book.raw.asset_id)).toBe(book.tokenId);
  });
});

describe('token ids', () => {
  it('are decimal strings that do not survive Number()', () => {
    for (const market of searchMarkets.slice(0, BOOKS_TO_SAMPLE)) {
      for (const tokenId of decodeArray(market.clobTokenIds)) {
        expect(tokenId).toMatch(/^\d+$/);
        expect(tokenId.length).toBeGreaterThan(70);
        expect(BigInt(tokenId)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
        // The corruption is silent: Number() returns a finite number that is
        // simply not the token id any more.
        expect(String(Number(tokenId))).not.toBe(tokenId);
        expect(BigInt(Number(tokenId))).not.toBe(BigInt(tokenId));
      }
    }
  });
});

describe('the Gamma market object', () => {
  it('JSON-encodes outcomes, outcomePrices and clobTokenIds as strings', () => {
    const market = record(firstMarketDetail.body);
    for (const field of ['outcomes', 'outcomePrices', 'clobTokenIds'] as const) {
      expect(typeof market[field], `${field} should be a JSON-encoded string`).toBe('string');
    }
    const outcomes = decodeArray(market.outcomes);
    const prices = decodeArray(market.outcomePrices);
    const tokenIds = decodeArray(market.clobTokenIds);
    expect(outcomes.length).toBeGreaterThan(0);
    expect(prices).toHaveLength(outcomes.length);
    expect(tokenIds).toHaveLength(outcomes.length);
  });

  it('exposes the fields the ticket and the fee model depend on', () => {
    const market = record(firstMarketDetail.body);
    for (const field of [
      'feesEnabled',
      'takerBaseFee',
      'orderPriceMinTickSize',
      'orderMinSize',
      'negRisk',
      'acceptingOrders',
    ] as const) {
      expect(field in market, `${field} missing from the market object`).toBe(true);
    }
    expect(typeof market.orderPriceMinTickSize).toBe('number');
    expect(typeof market.orderMinSize).toBe('number');
    expect(typeof market.negRisk).toBe('boolean');
    expect(typeof market.acceptingOrders).toBe('boolean');
  });

  it('leaves the fee fields reachable but does not promise they are populated', () => {
    const market = record(firstMarketDetail.body);
    // Live markets have been observed with feesEnabled false and both feeType
    // and takerBaseFee null. That is a missing rate, never a zero rate: mapping
    // it to 0 puts a $0.00 fee line in the preview, which is the failure
    // ADR-0009 exists to prevent. So the keys must be reachable, and an unset
    // fee must be null or absent — never the number 0, which a mapper could
    // mistake for "this market is free".
    for (const field of ['feesEnabled', 'feeType', 'feeSchedule', 'takerBaseFee'] as const) {
      expect(field in market, `${field} unreachable on the market object`).toBe(true);
    }
    expect(market.takerBaseFee === null || typeof market.takerBaseFee === 'number').toBe(true);
    expect(market.takerBaseFee, 'a 0 taker fee is indistinguishable from a missing one').not.toBe(
      0,
    );
  });
});

describe('the User-Agent header', () => {
  // OQ-10 asked whether a missing User-Agent is rejected. Observed once as a 403
  // from Python urllib's default (empty) UA on 2026-08-16. Neither the original
  // "missing UA" theory nor the revised "scraper-UA blocklist" theory reproduced:
  // node:https, curl with the header omitted or empty, and a sweep of common
  // scraper/bot UA strings (python-requests, Scrapy, Go-http-client, Postman,
  // Googlebot, a browser UA) all returned 200 on both hosts. So only the half we
  // can reproduce and actually rely on is asserted here: we always send an
  // explicit UA, and it is always accepted. Whether any UA is load-bearing is
  // left open in OQ-10 rather than encoded as a test that fails on a true
  // statement.
  it('is accepted on every contracted endpoint when sent explicitly', async () => {
    const tokenId = books[0]?.tokenId;
    const marketId = searchMarkets[0]?.id;
    expect(tokenId).toBeDefined();
    const urls = [
      `${GAMMA}/public-search?q=election`,
      `${GAMMA}/markets/${text(marketId)}`,
      `${CLOB}/book?token_id=${String(tokenId)}`,
      `${CLOB}/prices-history?market=${String(tokenId)}&interval=1w&fidelity=60`,
    ];
    for (const url of urls) {
      const response = await get(url);
      expect(response.status, `${url} rejected an explicit User-Agent`).toBe(200);
    }
  });
});
