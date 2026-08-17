import type { NextResponse } from 'next/server';

import { jsonSuccess, type ErrorEnvelope, type SuccessEnvelope } from '@/lib';
import { fetchBook } from '@/polymarket';
import type { OrderBook } from '@/domain';

import { badRequest, isValidTokenId, mapUpstreamError } from '../_shared';

export const dynamic = 'force-dynamic';

/**
 * `GET /api/polymarket/book?tokenId=`
 *
 * Contract guarantee: `asks` is sorted ascending in every response — see
 * `mapOrderBook` (T3.2) and the `polymarket-domain` skill for what silently
 * breaks if it isn't. Empty `asks` is a valid response, not an error.
 */
export async function GET(request: Request): Promise<NextResponse<SuccessEnvelope<OrderBook> | ErrorEnvelope>> {
  const url = new URL(request.url);
  const tokenId = url.searchParams.get('tokenId');

  if (!isValidTokenId(tokenId)) {
    return badRequest('tokenId is required and must be a bare decimal digit string');
  }

  try {
    const result = await fetchBook(tokenId);
    return jsonSuccess<OrderBook>(result.data, {
      fetchedAt: result.fetchedAt,
      stale: result.stale,
      cached: result.cached,
    });
  } catch (error) {
    return mapUpstreamError(error, 'book');
  }
}
