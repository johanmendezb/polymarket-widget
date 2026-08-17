/**
 * T3.4 acceptance for `/api/polymarket/search`: the six MSW-backed
 * integration scenarios from `07-testing/TEST_STRATEGY.md`, each asserted
 * against its documented error code and HTTP status.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/polymarket/search/route';

import { GAMMA_BASE_URL, handlers, server } from '../../../polymarket/msw-helpers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function request(query: string): Request {
  return new Request(`http://localhost/api/polymarket/search${query}`);
}

describe('GET /api/polymarket/search', () => {
  it('happy path: 200 with the documented envelope', async () => {
    server.use(handlers.gammaSearch());
    const response = await GET(request('?q=route-search-happy'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { markets: unknown[]; hasMore: boolean }; meta: unknown };
    expect(Array.isArray(body.data.markets)).toBe(true);
    expect(body.data.markets.length).toBeGreaterThan(0);
    expect(body.meta).toMatchObject({ stale: false });
  });

  it('upstream 500: 502 UPSTREAM_UNAVAILABLE, retryable', async () => {
    server.use(handlers.status(`${GAMMA_BASE_URL}/public-search`, 500));
    const response = await GET(request('?q=route-search-500'));
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(body.error.retryable).toBe(true);
  });

  it('upstream 429: 429 UPSTREAM_RATE_LIMITED', async () => {
    server.use(handlers.status(`${GAMMA_BASE_URL}/public-search`, 429));
    const response = await GET(request('?q=route-search-429'));
    expect(response.status).toBe(429);
    const body = (await response.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error.code).toBe('UPSTREAM_RATE_LIMITED');
    expect(body.error.retryable).toBe(true);
  });

  it('malformed payload: 502 UPSTREAM_SHAPE_CHANGED', async () => {
    server.use(handlers.malformed(`${GAMMA_BASE_URL}/public-search`));
    const response = await GET(request('?q=route-search-malformed'));
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UPSTREAM_SHAPE_CHANGED');
  });

  it('invalid input: missing q is 400 BAD_REQUEST', async () => {
    const response = await GET(request(''));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.retryable).toBe(false);
  });

  it('invalid input: q shorter than the minimum is 400 BAD_REQUEST', async () => {
    const response = await GET(request('?q=a'));
    expect(response.status).toBe(400);
  });

  it('filters markets with enableOrderBook === false out of the response', async () => {
    server.use(handlers.gammaSearch());
    const response = await GET(request('?q=route-search-filter'));
    const body = (await response.json()) as { data: { markets: { id: string }[] } };
    // gamma-market-first-search-result.json (id 2491900, event 580320's first
    // market) has enableOrderBook: true in the fixture, so it must survive;
    // this only proves the filter did not remove everything, not that it
    // fired - the mapper-level test in mappers.test.ts proves the filter itself.
    expect(body.data.markets.length).toBeGreaterThan(0);
  });
});
