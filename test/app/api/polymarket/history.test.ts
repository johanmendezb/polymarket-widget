/**
 * T3.4 acceptance for `/api/polymarket/history`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/polymarket/history/route';

import { CLOB_BASE_URL, handlers, server } from '../../../polymarket/msw-helpers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function request(query: string): Request {
  return new Request(`http://localhost/api/polymarket/history${query}`);
}

const TOKEN = (n: number): string => `2000000000000000000000000000000000000000000000000000000000000000000000000${n}`;

describe('GET /api/polymarket/history', () => {
  it('happy path: 200 with the documented envelope', async () => {
    server.use(handlers.clobPriceHistory());
    const response = await GET(request(`?tokenId=${TOKEN(1)}&interval=1w`));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { points: { t: number; p: number }[] } };
    expect(body.data.points.length).toBeGreaterThan(0);
  });

  it('upstream 500: 502 UPSTREAM_UNAVAILABLE, retryable', async () => {
    server.use(handlers.status(`${CLOB_BASE_URL}/prices-history`, 500));
    const response = await GET(request(`?tokenId=${TOKEN(2)}`));
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', retryable: true });
  });

  it('upstream 429: 429 UPSTREAM_RATE_LIMITED', async () => {
    server.use(handlers.status(`${CLOB_BASE_URL}/prices-history`, 429));
    const response = await GET(request(`?tokenId=${TOKEN(3)}`));
    expect(response.status).toBe(429);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UPSTREAM_RATE_LIMITED');
  });

  it('malformed payload: 502 UPSTREAM_SHAPE_CHANGED', async () => {
    server.use(handlers.malformed(`${CLOB_BASE_URL}/prices-history`));
    const response = await GET(request(`?tokenId=${TOKEN(4)}`));
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UPSTREAM_SHAPE_CHANGED');
  });

  it('unknown token: 404 NOT_FOUND', async () => {
    server.use(handlers.status(`${CLOB_BASE_URL}/prices-history`, 404));
    const response = await GET(request(`?tokenId=${TOKEN(5)}`));
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('invalid input: missing tokenId is 400 BAD_REQUEST', async () => {
    const response = await GET(request(''));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('invalid input: bad interval is 400 BAD_REQUEST', async () => {
    const response = await GET(request(`?tokenId=${TOKEN(6)}&interval=1y`));
    expect(response.status).toBe(400);
  });

  it('defaults interval to 1w when omitted', async () => {
    server.use(handlers.clobPriceHistory());
    const response = await GET(request(`?tokenId=${TOKEN(7)}`));
    expect(response.status).toBe(200);
  });
});
