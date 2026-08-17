'use client';

import { useCallback, useEffect, useState } from 'react';

import type { OrderBook } from '@/domain';

import { ApiError, fetchJson } from '../api-client';

export type BookFetchStatus = 'loading' | 'success' | 'error';

export interface UseBookResult {
  readonly status: BookFetchStatus;
  readonly book: OrderBook | null;
  readonly error: ApiError | null;
  readonly retry: () => void;
}

export interface UseBookOptions {
  /** Re-fetch interval in ms. `null` fetches once and never repeats. Default 5000. */
  readonly pollMs?: number | null;
}

/**
 * The only source of book data in the widget — every fill preview prices
 * against this, never against a market object's indicative `bestBid`/`bestAsk`.
 */
export function useBook(tokenId: string | null, options?: UseBookOptions): UseBookResult {
  const pollMs = options?.pollMs === undefined ? 5000 : options.pollMs;
  const [status, setStatus] = useState<BookFetchStatus>('loading');
  const [book, setBook] = useState<OrderBook | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (tokenId === null) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = (isPoll: boolean) => {
      if (!isPoll) setStatus('loading');
      fetchJson<OrderBook>(`/api/polymarket/book?tokenId=${encodeURIComponent(tokenId)}`)
        .then(({ data }) => {
          if (cancelled) return;
          setBook(data);
          setStatus('success');
          setError(null);
        })
        .catch((caught: unknown) => {
          if (cancelled) return;
          setError(caught instanceof ApiError ? caught : new ApiError('INTERNAL', 'Could not load the order book.', true));
          setStatus('error');
        })
        .finally(() => {
          if (cancelled || pollMs === null) return;
          timer = setTimeout(() => {
            load(true);
          }, pollMs);
        });
    };

    load(false);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [tokenId, pollMs, retryToken]);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  return { status, book, error, retry };
}
