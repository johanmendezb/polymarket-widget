import type { NextResponse } from 'next/server';

import { jsonSuccess, type ErrorEnvelope, type SuccessEnvelope } from '@/lib';
import { fetchMarket } from '@/polymarket';
import type { Market } from '@/domain';

import { badRequest, mapUpstreamError } from '../../_shared';

export const dynamic = 'force-dynamic';

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/** `GET /api/polymarket/market/[id]` — a Gamma market id or slug. */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<SuccessEnvelope<Market> | ErrorEnvelope>> {
  const { id } = await context.params;
  if (id.trim().length === 0) return badRequest('id is required');

  try {
    const result = await fetchMarket(id);
    return jsonSuccess<Market>(result.data, {
      fetchedAt: result.fetchedAt,
      stale: result.stale,
      cached: result.cached,
    });
  } catch (error) {
    return mapUpstreamError(error, 'market');
  }
}
