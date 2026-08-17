'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Market } from '@/domain';

import { ApiError, fetchJson } from '../api-client';

export type SearchStatus = 'empty-query' | 'loading' | 'results' | 'no-results' | 'error';

export interface UseSearchMarketsResult {
  readonly status: SearchStatus;
  readonly markets: readonly Market[];
  /** True while `status === 'error'` and `markets` still holds a previous successful result. */
  readonly stale: boolean;
  readonly error: ApiError | null;
  readonly retry: () => void;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const LIMIT = 20;

interface SearchResponseData {
  readonly markets: readonly Market[];
  readonly hasMore: boolean;
}

/**
 * Debounced 250ms search against `/api/polymarket/search`. `rawQuery` shorter
 * than two characters is `empty-query` — the caller (SearchState) is
 * responsible for choosing what to show there; this hook does no discovery
 * fetch of its own for an empty query, since the route requires `q`.
 */
export function useSearchMarkets(rawQuery: string): UseSearchMarketsResult {
  const trimmed = rawQuery.trim();
  const [debounced, setDebounced] = useState(trimmed);
  const [status, setStatus] = useState<SearchStatus>(trimmed.length < MIN_QUERY_LENGTH ? 'empty-query' : 'loading');
  const [markets, setMarkets] = useState<readonly Market[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const hadResultsRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(trimmed);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [trimmed]);

  useEffect(() => {
    if (debounced.length < MIN_QUERY_LENGTH) {
      setStatus('empty-query');
      setMarkets([]);
      setError(null);
      hadResultsRef.current = false;
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    setError(null);

    fetchJson<SearchResponseData>(
      `/api/polymarket/search?q=${encodeURIComponent(debounced)}&limit=${LIMIT}`,
      controller.signal,
    )
      .then(({ data }) => {
        setMarkets(data.markets);
        hadResultsRef.current = true;
        setStatus(data.markets.length === 0 ? 'no-results' : 'results');
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof ApiError ? caught : new ApiError('INTERNAL', 'Search failed.', true));
        setStatus('error');
        if (!hadResultsRef.current) setMarkets([]);
      });

    return () => {
      controller.abort();
    };
  }, [debounced, retryToken]);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  return { status, markets, stale: status === 'error' && markets.length > 0, error, retry };
}
