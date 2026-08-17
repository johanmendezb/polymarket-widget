'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Market } from '@/domain';

import { ApiError, fetchJson } from '../api-client';

export type MarketFetchStatus = 'loading' | 'success' | 'error';

export interface UseMarketResult {
  readonly status: MarketFetchStatus;
  readonly market: Market | null;
  readonly fetchedAt: number | null;
  readonly error: ApiError | null;
  readonly retry: () => void;
}

/** 15s poll, matching the route's own cache TTL — a faster poll would just re-read the same cache entry. */
const POLL_MS = 15_000;

export function useMarket(marketId: string | null): UseMarketResult {
  const [status, setStatus] = useState<MarketFetchStatus>('loading');
  const [market, setMarket] = useState<Market | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (marketId === null) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = (isPoll: boolean) => {
      if (!isPoll) setStatus('loading');
      fetchJson<Market>(`/api/polymarket/market/${encodeURIComponent(marketId)}`)
        .then(({ data, meta }) => {
          if (cancelled) return;
          setMarket(data);
          setFetchedAt(meta.fetchedAt);
          setStatus('success');
          setError(null);
        })
        .catch((caught: unknown) => {
          if (cancelled) return;
          setError(caught instanceof ApiError ? caught : new ApiError('INTERNAL', 'Could not load this market.', true));
          setStatus('error');
        })
        .finally(() => {
          if (cancelled) return;
          timer = setTimeout(() => {
            load(true);
          }, POLL_MS);
        });
    };

    load(false);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [marketId, retryToken]);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  return { status, market, fetchedAt, error, retry };
}
