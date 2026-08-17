/**
 * Fetches our own `/api/polymarket/*` routes and unwraps the envelope from
 * `API_CONTRACTS.md`. Never calls Polymarket directly — that boundary is
 * `src/polymarket`, which `src/ui` may not import. Runs in the browser only.
 */
import type { ErrorCode } from '@/domain';
import type { ErrorEnvelope, Meta, SuccessEnvelope } from '@/lib';

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;

  constructor(code: ErrorCode, message: string, retryable: boolean) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
  }
}

export interface FetchedJson<T> {
  readonly data: T;
  readonly meta: Meta;
}

/**
 * @throws ApiError on a non-2xx response with a parsed error envelope, or
 * wraps anything else (network failure, a body that is not even JSON) as
 * `UPSTREAM_UNAVAILABLE` so callers only ever branch on one type.
 */
export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<FetchedJson<T>> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('UPSTREAM_UNAVAILABLE', 'Could not reach the server.', true);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('UPSTREAM_UNAVAILABLE', 'The server returned an unreadable response.', true);
  }

  if (!response.ok) {
    const envelope = body as Partial<ErrorEnvelope>;
    const err = envelope.error;
    if (err) throw new ApiError(err.code, err.message, err.retryable);
    throw new ApiError('INTERNAL', 'Something went wrong.', false);
  }

  return body as SuccessEnvelope<T>;
}
