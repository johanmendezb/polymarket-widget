/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sampleRecommendation } from '@/ui/fixtures';
import { useForecast } from '@/ui/hooks/useForecast';

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

describe('useForecast', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts idle and never calls fetch on mount', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderHook(() => useForecast('m-1', 't-1'));

    expect(result.current.status).toBe('idle');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('run() POSTs marketId and tokenId and resolves to success with the recommendation', async () => {
    mockFetchOnce(200, { data: sampleRecommendation, meta: { fetchedAt: Date.now(), stale: false, cached: false } });

    const { result } = renderHook(() => useForecast('m-1', 't-1'));

    act(() => {
      result.current.run();
    });

    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.recommendation).toEqual(sampleRecommendation);

    const fetchSpy = vi.mocked(global.fetch);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe('/api/ai/forecast');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ marketId: 'm-1', tokenId: 't-1' });
  });

  it('maps AI_NO_EVIDENCE to its own status, not error', async () => {
    mockFetchOnce(200, { error: { code: 'AI_NO_EVIDENCE', message: 'no sources', retryable: false } });

    const { result } = renderHook(() => useForecast('m-1', 't-1'));
    act(() => {
      result.current.run();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('no_evidence');
    });
    expect(result.current.error).toBeNull();
  });

  it('maps AI_TIMEOUT to the error status with its code preserved', async () => {
    mockFetchOnce(504, { error: { code: 'AI_TIMEOUT', message: 'timed out', retryable: true } });

    const { result } = renderHook(() => useForecast('m-1', 't-1'));
    act(() => {
      result.current.run();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.error?.code).toBe('AI_TIMEOUT');
  });

  it('resets to idle when the tokenId changes, dropping the previous answer', async () => {
    mockFetchOnce(200, { data: sampleRecommendation, meta: { fetchedAt: Date.now(), stale: false, cached: false } });

    const { result, rerender } = renderHook(({ tokenId }) => useForecast('m-1', tokenId), {
      initialProps: { tokenId: 't-1' },
    });

    act(() => {
      result.current.run();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    rerender({ tokenId: 't-2' });

    expect(result.current.status).toBe('idle');
    expect(result.current.recommendation).toBeNull();
  });
});
