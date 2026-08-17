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
 * Shared by every entry point below: unwrap the envelope, or throw the one
 * error type callers branch on.
 *
 * Checks for an error envelope before checking `response.ok`: `AI_NO_EVIDENCE`
 * is deliberately a 200 (`docs/06-execution/BACKLOG.md` T5.4, `jsonError`'s
 * status table) carrying an error-shaped body, not a success one. Branching
 * on status first would read that body as `{ data: undefined }` and report a
 * false success.
 */
async function resolveEnvelope<T>(response: Response): Promise<FetchedJson<T>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('UPSTREAM_UNAVAILABLE', 'The server returned an unreadable response.', true);
  }

  const envelope = body as Partial<ErrorEnvelope>;
  if (envelope.error) {
    throw new ApiError(envelope.error.code, envelope.error.message, envelope.error.retryable);
  }

  if (!response.ok) {
    throw new ApiError('INTERNAL', 'Something went wrong.', false);
  }

  return body as SuccessEnvelope<T>;
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

  return resolveEnvelope<T>(response);
}

/**
 * `POST` counterpart of {@link fetchJson}, for the one route in this widget
 * that takes a body — `/api/ai/forecast`. Same error contract.
 */
export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<FetchedJson<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('UPSTREAM_UNAVAILABLE', 'Could not reach the server.', true);
  }

  return resolveEnvelope<T>(response);
}
