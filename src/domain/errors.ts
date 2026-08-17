/**
 * The closed error-code union from `docs/04-architecture/API_CONTRACTS.md`.
 * Errors are codes, never strings: the UI branches on the code and the message
 * is presentation.
 */
export const ERROR_CODES = [
  /** Upstream 5xx or network failure. 502. Keep last-known data, badge it stale. */
  'UPSTREAM_UNAVAILABLE',
  /** Upstream 429. 429. "Refreshing paused", back off — not an error state. */
  'UPSTREAM_RATE_LIMITED',
  /** Schema parse failure at the upstream boundary. 502. Loud structured log. */
  'UPSTREAM_SHAPE_CHANGED',
  /** Unknown market or token. 404. */
  'NOT_FOUND',
  /** Bad or missing params. 400. Unreachable from the UI; a bug if seen. */
  'BAD_REQUEST',
  /** The model exceeded its timeout. 504. The rest of the widget is unaffected. */
  'AI_TIMEOUT',
  /** Model output failed its schema twice. 502. */
  'AI_INVALID_OUTPUT',
  /** No usable sources found. 200, and an explicit state — not an error style. */
  'AI_NO_EVIDENCE',
  /** Anything else. 500. */
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}
