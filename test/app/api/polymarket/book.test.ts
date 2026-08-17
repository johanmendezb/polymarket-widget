/**
 * T3.4 acceptance for `/api/polymarket/book`. Covers acceptance criterion 2
 * of the E3 read path: `asks` is ascending in every response.
 */
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/polymarket/book/route';

import { CLOB_BASE_URL, handlers, readFixture, server } from '../../../polymarket/msw-helpers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function request(query: string): Request {
  return new Request(`http://localhost/api/polymarket/book${query}`);
}

describe('GET /api/polymarket/book', () => {
  it('happy path: 200 with asks ascending', async () => {
    server.use(handlers.clobBook('clob-book-liquid.json'));
    const response = await GET(request('?tokenId=1000000000000000000000000000000000000000000000000000000000000000000000001'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { asks: { price: number }[]; tokenId: string } };
    const askPrices = body.data.asks.map((level) => level.price);
    expect(askPrices).toEqual([...askPrices].sort((a, b) => a - b));
    expect(askPrices[0]).toBe(Math.min(...askPrices));
  });

  it('upstream 500: 502 UPSTREAM_UNAVAILABLE, retryable', async () => {
    server.use(handlers.status(`${CLOB_BASE_URL}/book`, 500));
    const response = await GET(request('?tokenId=1000000000000000000000000000000000000000000000000000000000000000000000002'));
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', retryable: true });
  });

  it('upstream 429: 429 UPSTREAM_RATE_LIMITED', async () => {
    server.use(handlers.status(`${CLOB_BASE_URL}/book`, 429));
    const response = await GET(request('?tokenId=1000000000000000000000000000000000000000000000000000000000000000000000003'));
    expect(response.status).toBe(429);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UPSTREAM_RATE_LIMITED');
  });

  it('malformed payload: 502 UPSTREAM_SHAPE_CHANGED', async () => {
    server.use(handlers.malformed(`${CLOB_BASE_URL}/book`));
    const response = await GET(request('?tokenId=1000000000000000000000000000000000000000000000000000000000000000000000004'));
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UPSTREAM_SHAPE_CHANGED');
  });

  it('unknown token: 404 NOT_FOUND', async () => {
    server.use(handlers.status(`${CLOB_BASE_URL}/book`, 404));
    const response = await GET(request('?tokenId=1000000000000000000000000000000000000000000000000000000000000000000000005'));
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('invalid tokenId: missing is 400 BAD_REQUEST', async () => {
    const response = await GET(request(''));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('invalid tokenId: non-digit string is 400 BAD_REQUEST, never coerced', async () => {
    const response = await GET(request('?tokenId=123abc'));
    expect(response.status).toBe(400);
  });

  it('empty asks is a valid 200 response, not an error', async () => {
    const raw = readFixture('clob-book-liquid.json') as Record<string, unknown>;
    server.use(http.get(`${CLOB_BASE_URL}/book`, () => HttpResponse.json({ ...raw, asks: [] })));
    const response = await GET(request('?tokenId=1000000000000000000000000000000000000000000000000000000000000000000000006'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { asks: unknown[] } };
    expect(body.data.asks).toEqual([]);
  });
});
