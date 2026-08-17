'use client';

import { useEffect, useState } from 'react';

import { fetchJson } from '../api-client';

export interface HistoryPoint {
  readonly t: number;
  readonly p: number;
}

export type HistoryFetchStatus = 'loading' | 'success' | 'error';

interface HistoryResponseData {
  readonly points: readonly HistoryPoint[];
}

/** One-shot fetch for the State B sparkline (P1). Never blocks the rest of the detail view. */
export function useHistory(tokenId: string | null): { readonly status: HistoryFetchStatus; readonly points: readonly HistoryPoint[] } {
  const [status, setStatus] = useState<HistoryFetchStatus>('loading');
  const [points, setPoints] = useState<readonly HistoryPoint[]>([]);

  useEffect(() => {
    if (tokenId === null) return;
    let cancelled = false;
    setStatus('loading');

    fetchJson<HistoryResponseData>(`/api/polymarket/history?tokenId=${encodeURIComponent(tokenId)}&interval=1w`)
      .then(({ data }) => {
        if (cancelled) return;
        setPoints(data.points);
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  return { status, points };
}
