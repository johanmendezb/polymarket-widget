/**
 * T3.4 acceptance for `/api/polymarket/market/[id]`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/polymarket/market/[id]/route';

import { GAMMA_BASE_URL, handlers, server } from '../../../polymarket/msw-helpers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function call(id: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/polymarket/market/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe('GET /api/polymarket/market/[id]', () => {
  it('happy path: 200 with the documented envelope', async () => {
    server.use(handlers.gammaMarket('900001', 'gamma-market-liquid.json'));
    const response = await call('900001');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { id: string; fees: { source: string } } };
    expect(body.data.id).toBe('2252244');
    expect(body.data.fees.source).toBe('market-object');
  });

  it('upstream 500: 502 UPSTREAM_UNAVAILABLE, retryable', async () => {
    server.use(handlers.status(`${GAMMA_BASE_URL}/markets/900002`, 500));
    const response = await call('900002');
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', retryable: true });
  });

  it('upstream 429: 429 UPSTREAM_RATE_LIMITED', async () => {
    server.use(handlers.status(`${GAMMA_BASE_URL}/markets/900003`, 429));
    const response = await call('900003');
    expect(response.status).toBe(429);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UPSTREAM_RATE_LIMITED');
  });

  it('malformed payload: 502 UPSTREAM_SHAPE_CHANGED', async () => {
    server.use(handlers.malformed(`${GAMMA_BASE_URL}/markets/900004`));
    const response = await call('900004');
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UPSTREAM_SHAPE_CHANGED');
  });

  it('unknown market: 404 NOT_FOUND', async () => {
    server.use(handlers.status(`${GAMMA_BASE_URL}/markets/900005`, 404));
    const response = await call('900005');
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error).toMatchObject({ code: 'NOT_FOUND', retryable: false });
  });

  it('invalid input: an empty id is 400 BAD_REQUEST', async () => {
    const response = await GET(new Request('http://localhost/api/polymarket/market/'), {
      params: Promise.resolve({ id: '' }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('calls the slug endpoint for a non-numeric id', async () => {
    server.use(handlers.gammaMarketSlug('route-market-slug-case', 'gamma-market-thin.json'));
    const response = await call('route-market-slug-case');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { id: string } };
    expect(body.data.id).toBe('2491913');
  });
});
