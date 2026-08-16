/**
 * T3.3 acceptance: two concurrent identical requests produce exactly one
 * upstream call; an expired entry refetches; upstream failure with a warm
 * stale entry serves it with `stale: true`; a 429 backs off rather than
 * retry-storming.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UpstreamNotFoundError, UpstreamRateLimitedError, UpstreamUnavailableError } from '@/polymarket/errors';
import { TtlCache } from '@/polymarket/cache';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TtlCache', () => {
  it('serves a fresh entry without calling the fetcher again', async () => {
    const cache = new TtlCache<string>({ ttlMs: 10_000 });
    const fetcher = vi.fn(async () => 'value');

    const first = await cache.get('k', fetcher);
    const second = await cache.get('k', fetcher);

    expect(first).toMatchObject({ data: 'value', stale: false, cached: false });
    expect(second).toMatchObject({ data: 'value', stale: false, cached: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('coalesces two concurrent identical requests into one upstream call', async () => {
    let resolveFetch: (value: string) => void = () => {};
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const cache = new TtlCache<string>({ ttlMs: 10_000 });

    const callA = cache.get('k', fetcher);
    const callB = cache.get('k', fetcher);
    resolveFetch('shared-value');
    const [resultA, resultB] = await Promise.all([callA, callB]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(resultA.data).toBe('shared-value');
    expect(resultB.data).toBe('shared-value');
  });

  it('refetches once an entry expires past its TTL', async () => {
    const cache = new TtlCache<string>({ ttlMs: 1_000 });
    const fetcher = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');

    const first = await cache.get('k', fetcher);
    vi.advanceTimersByTime(1_001);
    const second = await cache.get('k', fetcher);

    expect(first.data).toBe('v1');
    expect(second.data).toBe('v2');
    expect(second.cached).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves stale data with stale: true when upstream fails and a warm entry exists', async () => {
    const cache = new TtlCache<string>({ ttlMs: 1_000, staleGraceMs: 60_000 });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('good')
      .mockRejectedValueOnce(new UpstreamUnavailableError('ctx', 503));

    const first = await cache.get('k', fetcher);
    vi.advanceTimersByTime(1_001); // expire the TTL, still within stale grace
    const second = await cache.get('k', fetcher);

    expect(first.data).toBe('good');
    expect(second).toMatchObject({ data: 'good', stale: true, cached: true });
  });

  it('propagates the failure once the stale grace window has also elapsed', async () => {
    const cache = new TtlCache<string>({ ttlMs: 1_000, staleGraceMs: 2_000 });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('good')
      .mockRejectedValueOnce(new UpstreamUnavailableError('ctx', 503));

    await cache.get('k', fetcher);
    vi.advanceTimersByTime(1_000 + 2_000 + 1);
    await expect(cache.get('k', fetcher)).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('does not serve stale data for a non-staleable failure like NOT_FOUND', async () => {
    const cache = new TtlCache<string>({ ttlMs: 1_000, staleGraceMs: 60_000 });
    const fetcher = vi.fn().mockResolvedValueOnce('good').mockRejectedValueOnce(new UpstreamNotFoundError('ctx'));

    await cache.get('k', fetcher);
    vi.advanceTimersByTime(1_001);
    await expect(cache.get('k', fetcher)).rejects.toBeInstanceOf(UpstreamNotFoundError);
  });

  it('propagates a rate-limit failure with no warm entry to serve', async () => {
    const cache = new TtlCache<string>({ ttlMs: 1_000 });
    const fetcher = vi.fn().mockRejectedValue(new UpstreamRateLimitedError('ctx'));
    await expect(cache.get('k', fetcher)).rejects.toBeInstanceOf(UpstreamRateLimitedError);
  });

  it('backs off after a rate-limit failure: a second call inside the backoff window does not call the fetcher again', async () => {
    const cache = new TtlCache<string>({ ttlMs: 1_000 });
    const fetcher = vi.fn().mockRejectedValue(new UpstreamRateLimitedError('ctx'));

    await expect(cache.get('k', fetcher)).rejects.toBeInstanceOf(UpstreamRateLimitedError);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await expect(cache.get('k', fetcher)).rejects.toBeInstanceOf(UpstreamRateLimitedError);
    // Still under backoff: no second network attempt was made.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves stale data during a backoff window instead of failing, when a warm entry exists', async () => {
    const cache = new TtlCache<string>({ ttlMs: 1_000, staleGraceMs: 60_000 });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('good')
      .mockRejectedValue(new UpstreamRateLimitedError('ctx'));

    await cache.get('k', fetcher);
    vi.advanceTimersByTime(1_001);
    const failed = await cache.get('k', fetcher); // triggers backoff
    expect(failed).toMatchObject({ data: 'good', stale: true });

    const duringBackoff = await cache.get('k', fetcher);
    expect(duringBackoff).toMatchObject({ data: 'good', stale: true });
    expect(fetcher).toHaveBeenCalledTimes(2); // not called a third time
  });

  it('retries after the backoff window elapses', async () => {
    const cache = new TtlCache<string>({ ttlMs: 1_000 });
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new UpstreamRateLimitedError('ctx'))
      .mockResolvedValueOnce('recovered');

    await expect(cache.get('k', fetcher)).rejects.toBeInstanceOf(UpstreamRateLimitedError);
    vi.advanceTimersByTime(5_000); // past the base backoff window
    const recovered = await cache.get('k', fetcher);

    expect(recovered.data).toBe('recovered');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('evicts the least-recently-used entry once over capacity', async () => {
    const cache = new TtlCache<string>({ ttlMs: 60_000, maxEntries: 2 });
    await cache.get('a', async () => 'A');
    await cache.get('b', async () => 'B');
    await cache.get('a', async () => 'A-refetched'); // touches 'a', making 'b' the LRU
    await cache.get('c', async () => 'C'); // evicts 'b'

    const bFetcher = vi.fn().mockResolvedValue('B-refetched');
    const result = await cache.get('b', bFetcher);
    expect(result.cached).toBe(false); // 'b' was evicted, so this is a fresh fetch
    expect(bFetcher).toHaveBeenCalledTimes(1);
  });
});
