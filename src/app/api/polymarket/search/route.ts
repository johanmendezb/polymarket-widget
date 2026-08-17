import type { NextResponse } from 'next/server';

import { jsonSuccess, type ErrorEnvelope, type SuccessEnvelope } from '@/lib';
import { fetchSearch } from '@/polymarket';
import type { Market } from '@/domain';

import { badRequest, mapUpstreamError, parseLimit } from '../_shared';

export const dynamic = 'force-dynamic';

const MIN_QUERY_LENGTH = 2;

export interface SearchResponseData {
  readonly markets: readonly Market[];
  readonly hasMore: boolean;
}

/**
 * `GET /api/polymarket/search?q=&limit=`
 *
 * The `tag`-only discovery path from `04-architecture/API_CONTRACTS.md`
 * (`gamma /markets/keyset` when `tag` is present and `q` is empty) is not
 * implemented: T3.3's client only built `fetchSearch(q)`. `q` is required
 * here; a `tag`-only request is `BAD_REQUEST`. This is a real gap against
 * the documented contract, not a silent cut — flagged for a follow-up task.
 */
export async function GET(request: Request): Promise<NextResponse<SuccessEnvelope<SearchResponseData> | ErrorEnvelope>> {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');

  if (q === null || q.trim().length < MIN_QUERY_LENGTH) {
    return badRequest(`q is required and must be at least ${MIN_QUERY_LENGTH} characters`);
  }

  const limit = parseLimit(url.searchParams.get('limit'));
  if (limit === null) {
    return badRequest('limit must be an integer between 1 and 50');
  }

  try {
    const result = await fetchSearch(q);
    const markets = result.data.slice(0, limit);
    return jsonSuccess<SearchResponseData>(
      { markets, hasMore: result.data.length > markets.length },
      { fetchedAt: result.fetchedAt, stale: result.stale, cached: result.cached },
    );
  } catch (error) {
    return mapUpstreamError(error, 'search');
  }
}
