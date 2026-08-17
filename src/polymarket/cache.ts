/**
 * A small in-memory LRU with per-entry TTL, request coalescing, stale-on-
 * error and exponential backoff on repeated rate-limiting. One process, no
 * Redis — see `04-architecture/ARCHITECTURE.md` §7 for why that is enough
 * for a single Render instance.
 */
import { isStaleableFailure, UpstreamRateLimitedError } from './errors';

export interface CacheResult<T> {
  readonly data: T;
  readonly fetchedAt: number;
  readonly stale: boolean;
  /** True when this call did not itself trigger an upstream fetch. */
  readonly cached: boolean;
}

export interface TtlCacheOptions {
  readonly ttlMs: number;
  /** Bounded so a runaway key space cannot grow the cache without limit. */
  readonly maxEntries?: number;
  /** How long past `ttlMs` a stale entry may still be served on failure. */
  readonly staleGraceMs?: number;
}

interface StoredEntry<T> {
  value: T;
  fetchedAt: number;
}

interface BackoffState {
  blockedUntil: number;
  failureCount: number;
}

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_STALE_GRACE_MS = 60_000;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export class TtlCache<T> {
  private readonly store = new Map<string, StoredEntry<T>>();
  private readonly inflight = new Map<string, Promise<T>>();
  private readonly backoff = new Map<string, BackoffState>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly staleGraceMs: number;

  constructor(options: TtlCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.staleGraceMs = options.staleGraceMs ?? DEFAULT_STALE_GRACE_MS;
  }

  /**
   * Fetches `key`, through the cache. Two concurrent calls for the same key
   * that both miss produce exactly one call to `fetcher` — the second
   * caller awaits the first's in-flight promise instead of starting its own.
   *
   * On failure, a warm entry within `ttlMs + staleGraceMs` is served with
   * `stale: true` — but only for the transient failures
   * `isStaleableFailure` recognizes (`UPSTREAM_UNAVAILABLE`,
   * `UPSTREAM_RATE_LIMITED`). A 404 or a shape change propagates instead:
   * masking those as stale success would tell the caller a dead or corrupt
   * response is still good data.
   */
  async get(key: string, fetcher: () => Promise<T>): Promise<CacheResult<T>> {
    const now = Date.now();
    const fresh = this.freshEntry(key, now);
    if (fresh) return { data: fresh.value, fetchedAt: fresh.fetchedAt, stale: false, cached: true };

    const pending = this.inflight.get(key);
    if (pending !== undefined) {
      const value = await pending;
      const entry = this.store.get(key);
      return { data: value, fetchedAt: entry?.fetchedAt ?? now, stale: false, cached: true };
    }

    const blocked = this.backoff.get(key);
    if (blocked !== undefined && now < blocked.blockedUntil) {
      const stale = this.staleEntry(key, now);
      if (stale) return { data: stale.value, fetchedAt: stale.fetchedAt, stale: true, cached: true };
      throw new UpstreamRateLimitedError(key);
    }

    return this.fetchAndStore(key, fetcher, now);
  }

  private async fetchAndStore(key: string, fetcher: () => Promise<T>, now: number): Promise<CacheResult<T>> {
    const promise = fetcher();
    this.inflight.set(key, promise);
    try {
      const value = await promise;
      const fetchedAt = Date.now();
      this.store.set(key, { value, fetchedAt });
      this.evictOverCapacity();
      this.backoff.delete(key);
      return { data: value, fetchedAt, stale: false, cached: false };
    } catch (error) {
      if (error instanceof UpstreamRateLimitedError) this.recordBackoffFailure(key, now);
      if (isStaleableFailure(error)) {
        const stale = this.staleEntry(key, now);
        if (stale) return { data: stale.value, fetchedAt: stale.fetchedAt, stale: true, cached: true };
      }
      throw error;
    } finally {
      this.inflight.delete(key);
    }
  }

  private freshEntry(key: string, now: number): StoredEntry<T> | null {
    const entry = this.store.get(key);
    if (entry === undefined || now - entry.fetchedAt >= this.ttlMs) return null;
    // Touch for LRU: re-insert so this key is the most recently used.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  private staleEntry(key: string, now: number): StoredEntry<T> | null {
    const entry = this.store.get(key);
    if (entry === undefined) return null;
    return now - entry.fetchedAt < this.ttlMs + this.staleGraceMs ? entry : null;
  }

  private recordBackoffFailure(key: string, now: number): void {
    const state = this.backoff.get(key) ?? { blockedUntil: 0, failureCount: 0 };
    const failureCount = state.failureCount + 1;
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** (failureCount - 1), MAX_BACKOFF_MS);
    this.backoff.set(key, { blockedUntil: now + delay, failureCount });
  }

  private evictOverCapacity(): void {
    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
  }
}
