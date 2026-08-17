/**
 * The response envelope from `04-architecture/API_CONTRACTS.md`'s
 * Conventions section. Leaf-level: formatting only, no I/O, no upstream
 * knowledge. `src/app/api` maps a caught error to an `ErrorCode` and hands
 * it here; this module never decides which code an error deserves.
 */
import { NextResponse } from 'next/server';

import type { ErrorCode } from '@/domain';

export interface Meta {
  readonly fetchedAt: number;
  readonly stale: boolean;
  readonly cached: boolean;
}

export interface SuccessEnvelope<T> {
  readonly data: T;
  readonly meta: Meta;
}

export interface ErrorEnvelope {
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly retryable: boolean;
  };
}

/** HTTP status per code, from the API_CONTRACTS.md error table. */
const HTTP_STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  UPSTREAM_UNAVAILABLE: 502,
  UPSTREAM_RATE_LIMITED: 429,
  UPSTREAM_SHAPE_CHANGED: 502,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  AI_TIMEOUT: 504,
  AI_INVALID_OUTPUT: 502,
  AI_NO_EVIDENCE: 200,
  INTERNAL: 500,
};

/** Whether the UI should offer a retry affordance for this code. */
const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set([
  'UPSTREAM_UNAVAILABLE',
  'UPSTREAM_RATE_LIMITED',
  'AI_TIMEOUT',
]);

export function jsonSuccess<T>(data: T, meta: Meta): NextResponse<SuccessEnvelope<T>> {
  return NextResponse.json({ data, meta }, { headers: { 'cache-control': 'no-store' } });
}

export function jsonError(code: ErrorCode, message: string): NextResponse<ErrorEnvelope> {
  return NextResponse.json(
    { error: { code, message, retryable: RETRYABLE_CODES.has(code) } },
    { status: HTTP_STATUS_BY_CODE[code], headers: { 'cache-control': 'no-store' } },
  );
}
