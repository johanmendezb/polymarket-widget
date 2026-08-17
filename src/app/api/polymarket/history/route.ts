import type { NextResponse } from 'next/server';

import { jsonSuccess, type ErrorEnvelope, type SuccessEnvelope } from '@/lib';
import { fetchPriceHistory, type PricePoint } from '@/polymarket';

import { badRequest, isValidTokenId, mapUpstreamError, parseFidelity, parseInterval } from '../_shared';

export const dynamic = 'force-dynamic';

export interface HistoryResponseData {
  readonly points: readonly PricePoint[];
}

/** `GET /api/polymarket/history?tokenId=&interval=&fidelity=` */
export async function GET(request: Request): Promise<NextResponse<SuccessEnvelope<HistoryResponseData> | ErrorEnvelope>> {
  const url = new URL(request.url);
  const tokenId = url.searchParams.get('tokenId');
  if (!isValidTokenId(tokenId)) {
    return badRequest('tokenId is required and must be a bare decimal digit string');
  }

  const interval = parseInterval(url.searchParams.get('interval'));
  if (interval === null) {
    return badRequest('interval must be one of 1h, 6h, 1d, 1w, max');
  }

  const fidelity = parseFidelity(url.searchParams.get('fidelity'));
  if (fidelity === null) {
    return badRequest('fidelity must be a positive number of minutes');
  }

  try {
    const result = await fetchPriceHistory({ tokenId, interval, fidelity });
    return jsonSuccess<HistoryResponseData>(
      { points: result.data },
      { fetchedAt: result.fetchedAt, stale: result.stale, cached: result.cached },
    );
  } catch (error) {
    return mapUpstreamError(error, 'history');
  }
}
