import type { ErrorCode } from '@/domain';

/**
 * The upstream-facing error taxonomy. Every one of these carries the closed
 * `ErrorCode` it maps to, so a route handler never re-derives the mapping —
 * it just reads `.code`. See `04-architecture/API_CONTRACTS.md`'s error table.
 */
abstract class UpstreamError extends Error {
  abstract readonly code: ErrorCode;
}

/**
 * A zod parse failure at the upstream boundary, or any other point where the
 * wire shape did not match what we expected (a non-JSON body, for example).
 * Names the offending field so the structured log — and this error's
 * `.field` — point straight at it, never a generic "shape changed" message.
 */
export class UpstreamShapeChangedError extends UpstreamError {
  readonly code = 'UPSTREAM_SHAPE_CHANGED' as const;
  readonly field: string;

  constructor(context: string, field: string, detail: string) {
    super(`${context}: upstream shape changed at field "${field}": ${detail}`);
    this.name = 'UpstreamShapeChangedError';
    this.field = field;
  }
}

/** Upstream 404: the market or token does not exist. */
export class UpstreamNotFoundError extends UpstreamError {
  readonly code = 'NOT_FOUND' as const;

  constructor(context: string) {
    super(`${context}: not found upstream`);
    this.name = 'UpstreamNotFoundError';
  }
}

/** Upstream 429. Callers should back off, not retry immediately. */
export class UpstreamRateLimitedError extends UpstreamError {
  readonly code = 'UPSTREAM_RATE_LIMITED' as const;

  constructor(context: string) {
    super(`${context}: upstream rate limited (429)`);
    this.name = 'UpstreamRateLimitedError';
  }
}

/** Upstream 5xx, a network failure, or a non-JSON body. */
export class UpstreamUnavailableError extends UpstreamError {
  readonly code = 'UPSTREAM_UNAVAILABLE' as const;
  readonly upstreamStatus: number | null;

  constructor(context: string, upstreamStatus: number | null) {
    super(`${context}: upstream unavailable${upstreamStatus !== null ? ` (status ${upstreamStatus})` : ''}`);
    this.name = 'UpstreamUnavailableError';
    this.upstreamStatus = upstreamStatus;
  }
}

/**
 * True for failures that a warm cache entry may paper over with `stale:
 * true`. A 404 or a shape change is not transient — serving a stale market
 * behind a 404 would tell the user a dead market is still tradeable, and a
 * shape change needs to be seen, not hidden.
 */
export function isStaleableFailure(error: unknown): boolean {
  return error instanceof UpstreamUnavailableError || error instanceof UpstreamRateLimitedError;
}
