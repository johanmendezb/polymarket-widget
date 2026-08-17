/**
 * The upstream HTTP client. Every call goes through here, through the cache,
 * so a route handler never touches `fetch` directly.
 *
 * Every request sends an explicit, honest User-Agent and never falls back to
 * a library default. A missing UA has been observed to return 200; a
 * scraper-pattern UA (`Python-urllib/3.9`) has been observed blocklisted
 * (403) where `curl/8.7.1` or an omitted header both get 200 — see the
 * `polymarket-domain` skill and OQ-10. Sending an honest UA is a no-cost
 * defensive measure and a courtesy to identify our traffic; it is not known
 * to be load-bearing on every call, but there is no reason not to.
 */
import {
  mapMarket,
  mapOrderBook,
  mapPriceHistory,
  mapSearchResults,
  type PricePoint,
} from './mappers';
import { TtlCache } from './cache';
import { UpstreamNotFoundError, UpstreamRateLimitedError, UpstreamShapeChangedError, UpstreamUnavailableError } from './errors';
import { parseClobBook, parseClobPriceHistory, parseGammaMarket, parseGammaSearchResponse } from './schemas';
import type { Market, OrderBook } from '@/domain';

const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com';
const CLOB_BASE_URL = 'https://clob.polymarket.com';
const USER_AGENT = 'polymarket-second-opinion-read-path/0.1';

/** `04-architecture/ARCHITECTURE.md` §7. */
const SEARCH_TTL_MS = 15_000;
const MARKET_TTL_MS = 15_000;
const BOOK_TTL_MS = 3_000;
const HISTORY_TTL_MS = 60_000;

const searchCache = new TtlCache<unknown>({ ttlMs: SEARCH_TTL_MS });
const marketCache = new TtlCache<unknown>({ ttlMs: MARKET_TTL_MS });
const bookCache = new TtlCache<unknown>({ ttlMs: BOOK_TTL_MS });
const historyCache = new TtlCache<unknown>({ ttlMs: HISTORY_TTL_MS });

export interface UpstreamCallResult<T> {
  readonly data: T;
  readonly fetchedAt: number;
  readonly stale: boolean;
  readonly cached: boolean;
}

async function rawFetch(url: string, context: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  } catch {
    throw new UpstreamUnavailableError(context, null);
  }

  if (response.status === 404) throw new UpstreamNotFoundError(context);
  if (response.status === 429) throw new UpstreamRateLimitedError(context);
  if (response.status < 200 || response.status >= 300) {
    throw new UpstreamUnavailableError(context, response.status);
  }
  return response.text();
}

async function fetchJson(url: string, context: string): Promise<unknown> {
  const text = await rawFetch(url, context);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new UpstreamShapeChangedError(context, '(body)', 'response was not valid JSON');
  }
}

/** `GET gamma /public-search?q=` */
export async function fetchSearch(query: string): Promise<UpstreamCallResult<readonly Market[]>> {
  const url = `${GAMMA_BASE_URL}/public-search?q=${encodeURIComponent(query)}`;
  const cacheKey = `search:${query}`;
  const result = await searchCache.get(cacheKey, () => fetchJson(url, 'gamma public-search'));
  const parsed = parseGammaSearchResponse(result.data);
  return { data: mapSearchResults(parsed.events), fetchedAt: result.fetchedAt, stale: result.stale, cached: result.cached };
}

const NUMERIC_ID_PATTERN = /^\d+$/;

/** `GET gamma /markets/{id}` or `GET gamma /markets/slug/{slug}` */
export async function fetchMarket(idOrSlug: string): Promise<UpstreamCallResult<Market>> {
  const url = NUMERIC_ID_PATTERN.test(idOrSlug)
    ? `${GAMMA_BASE_URL}/markets/${idOrSlug}`
    : `${GAMMA_BASE_URL}/markets/slug/${encodeURIComponent(idOrSlug)}`;
  const cacheKey = `market:${idOrSlug}`;
  const result = await marketCache.get(cacheKey, () => fetchJson(url, 'gamma market'));
  const parsed = parseGammaMarket(result.data);
  return { data: mapMarket(parsed), fetchedAt: result.fetchedAt, stale: result.stale, cached: result.cached };
}

/** `GET clob /book?token_id=` */
export async function fetchBook(tokenId: string): Promise<UpstreamCallResult<OrderBook>> {
  const url = `${CLOB_BASE_URL}/book?token_id=${tokenId}`;
  const cacheKey = `book:${tokenId}`;
  const result = await bookCache.get(cacheKey, () => fetchJson(url, 'clob book'));
  const parsed = parseClobBook(result.data);
  return {
    data: mapOrderBook(parsed, result.fetchedAt),
    fetchedAt: result.fetchedAt,
    stale: result.stale,
    cached: result.cached,
  };
}

export interface PriceHistoryParams {
  readonly tokenId: string;
  readonly interval: '1h' | '6h' | '1d' | '1w' | 'max';
  readonly fidelity?: number;
}

/** `GET clob /prices-history?market=&interval=&fidelity=` */
export async function fetchPriceHistory(
  params: PriceHistoryParams,
): Promise<UpstreamCallResult<readonly PricePoint[]>> {
  const query = new URLSearchParams({ market: params.tokenId, interval: params.interval });
  if (params.fidelity !== undefined) query.set('fidelity', String(params.fidelity));
  const url = `${CLOB_BASE_URL}/prices-history?${query.toString()}`;
  const cacheKey = `history:${params.tokenId}:${params.interval}:${params.fidelity ?? ''}`;
  const result = await historyCache.get(cacheKey, () => fetchJson(url, 'clob prices-history'));
  const parsed = parseClobPriceHistory(result.data);
  return {
    data: mapPriceHistory(parsed),
    fetchedAt: result.fetchedAt,
    stale: result.stale,
    cached: result.cached,
  };
}
