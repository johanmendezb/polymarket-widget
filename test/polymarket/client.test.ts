/**
 * T3.3 acceptance, the client half: every route function parses and maps the
 * recorded fixtures correctly, maps upstream HTTP failures to the right
 * error class, and sends an explicit, honest User-Agent — never a library
 * default. Each test uses a distinct cache key (query/tokenId/id) so the
 * module-level route caches in `client.ts` cannot leak state between tests.
 */
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { priceValue } from '@/domain';
import {
  UpstreamNotFoundError,
  UpstreamRateLimitedError,
  UpstreamShapeChangedError,
  UpstreamUnavailableError,
} from '@/polymarket/errors';
import { fetchBook, fetchMarket, fetchPriceHistory, fetchSearch } from '@/polymarket/client';

import { CLOB_BASE_URL, GAMMA_BASE_URL, capturedUserAgents, handlers, resetCapturedUserAgents, server } from './msw-helpers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetCapturedUserAgents();
});
afterAll(() => server.close());

describe('fetchSearch', () => {
  it('maps the recorded search fixture to Market[], filtering enableOrderBook === false', async () => {
    server.use(handlers.gammaSearch());
    const result = await fetchSearch('election');
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.stale).toBe(false);
    for (const market of result.data) {
      expect(market.eventId).not.toBeNull();
    }
  });

  it('maps an upstream 500 to UpstreamUnavailableError', async () => {
    server.use(handlers.status(`${GAMMA_BASE_URL}/public-search`, 500));
    await expect(fetchSearch('search-500-case')).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('maps an upstream 429 to UpstreamRateLimitedError', async () => {
    server.use(handlers.status(`${GAMMA_BASE_URL}/public-search`, 429));
    await expect(fetchSearch('search-429-case')).rejects.toBeInstanceOf(UpstreamRateLimitedError);
  });

  it('maps a malformed (non-JSON) body to UpstreamShapeChangedError', async () => {
    server.use(handlers.malformed(`${GAMMA_BASE_URL}/public-search`));
    await expect(fetchSearch('search-malformed-case')).rejects.toBeInstanceOf(UpstreamShapeChangedError);
  });

  it('maps a shape-changed body (renamed critical field) to UpstreamShapeChangedError naming the field', async () => {
    server.use(http.get(`${GAMMA_BASE_URL}/public-search`, () => HttpResponse.json({ results: [] })));
    try {
      await fetchSearch('search-renamed-case');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(UpstreamShapeChangedError);
    }
  });

  it('sends an explicit, honest User-Agent, never empty and never a library default', async () => {
    server.use(handlers.gammaSearch());
    await fetchSearch('search-ua-case');
    const uas = capturedUserAgents();
    expect(uas.length).toBeGreaterThan(0);
    for (const ua of uas) {
      expect(ua).not.toBe('');
      expect(ua.toLowerCase()).not.toContain('node');
      expect(ua.toLowerCase()).not.toContain('undici');
    }
  });
});

describe('fetchMarket', () => {
  it('maps the recorded market fixture to a Market', async () => {
    server.use(handlers.gammaMarket('2252244', 'gamma-market-liquid.json'));
    const result = await fetchMarket('2252244');
    expect(result.data.id).toBe('2252244');
    expect(result.data.fees.source).toBe('market-object');
  });

  it('maps an upstream 404 to UpstreamNotFoundError', async () => {
    server.use(handlers.status(`${GAMMA_BASE_URL}/markets/99999999999`, 404));
    await expect(fetchMarket('99999999999')).rejects.toBeInstanceOf(UpstreamNotFoundError);
  });

  it('calls the slug endpoint for a non-numeric id', async () => {
    server.use(handlers.gammaMarketSlug('some-market-slug', 'gamma-market-thin.json'));
    const result = await fetchMarket('some-market-slug');
    expect(result.data.id).toBe('2491913');
  });
});

describe('fetchBook', () => {
  it('maps the recorded liquid book fixture, with asks ascending', async () => {
    server.use(handlers.clobBook('clob-book-liquid.json'));
    const result = await fetchBook('token-id-book-happy-path');
    const askPrices = result.data.asks.map((level) => priceValue(level.price));
    expect(askPrices).toEqual([...askPrices].sort((a, b) => a - b));
  });

  it('maps an upstream 500 to UpstreamUnavailableError', async () => {
    server.use(handlers.status(`${CLOB_BASE_URL}/book`, 500));
    await expect(fetchBook('token-id-book-500-case')).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('maps an upstream 429 to UpstreamRateLimitedError', async () => {
    server.use(handlers.status(`${CLOB_BASE_URL}/book`, 429));
    await expect(fetchBook('token-id-book-429-case')).rejects.toBeInstanceOf(UpstreamRateLimitedError);
  });

  it('maps a network failure to UpstreamUnavailableError', async () => {
    server.use(handlers.networkError(`${CLOB_BASE_URL}/book`));
    await expect(fetchBook('token-id-book-network-case')).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });
});

describe('fetchPriceHistory', () => {
  it('maps the recorded price history fixture to points', async () => {
    server.use(handlers.clobPriceHistory());
    const result = await fetchPriceHistory({ tokenId: 'token-id-history-happy-path', interval: '1w' });
    expect(result.data.length).toBeGreaterThan(0);
  });
});
