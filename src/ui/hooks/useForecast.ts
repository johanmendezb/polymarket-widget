'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Recommendation } from '@/domain';

import { ApiError, postJson } from '../api-client';

export type ForecastStatus = 'idle' | 'loading' | 'success' | 'no_evidence' | 'error';

export interface UseForecastResult {
  readonly status: ForecastStatus;
  readonly recommendation: Recommendation | null;
  /** Set only on `status === 'error'`. `AI_NO_EVIDENCE` is its own status, not an error. */
  readonly error: ApiError | null;
  readonly run: () => void;
}

/**
 * Backs the AI panel's second-opinion request. Never fetches on mount and
 * never polls — `run` is the only thing that starts a request, matching
 * USER_FLOWS.md State B: "user-invoked, never fires on load."
 */
export function useForecast(marketId: string, tokenId: string): UseForecastResult {
  const [status, setStatus] = useState<ForecastStatus>('idle');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const requestIdRef = useRef(0);

  // A different outcome is a different question. Drop a stale answer from
  // the previous tokenId rather than let it linger under the new one.
  useEffect(() => {
    requestIdRef.current += 1;
    setStatus('idle');
    setRecommendation(null);
    setError(null);
  }, [marketId, tokenId]);

  const run = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    setError(null);

    postJson<Recommendation>('/api/ai/forecast', { marketId, tokenId })
      .then(({ data }) => {
        if (requestIdRef.current !== requestId) return;
        setRecommendation(data);
        setStatus('success');
      })
      .catch((caught: unknown) => {
        if (requestIdRef.current !== requestId) return;
        const apiError =
          caught instanceof ApiError ? caught : new ApiError('INTERNAL', 'Something went wrong.', false);
        if (apiError.code === 'AI_NO_EVIDENCE') {
          setStatus('no_evidence');
        } else {
          setError(apiError);
          setStatus('error');
        }
      });
  }, [marketId, tokenId]);

  return { status, recommendation, error, run };
}
