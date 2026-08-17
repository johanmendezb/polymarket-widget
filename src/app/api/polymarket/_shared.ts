/**
 * Shared plumbing for the four read routes: error mapping and small
 * hand-rolled input validators. Not a pass-through route — each route file
 * still builds its own upstream call through `@/polymarket`'s client
 * functions. zod stays at the upstream boundary only (`src/polymarket`); our
 * own query-param validation here is plain code, per the project's code
 * style rule.
 */
import type { NextResponse } from 'next/server';

import { jsonError, type ErrorEnvelope } from '@/lib';
import {
  UpstreamNotFoundError,
  UpstreamRateLimitedError,
  UpstreamShapeChangedError,
  UpstreamUnavailableError,
} from '@/polymarket';

/**
 * Maps a caught upstream error to the documented envelope and HTTP status.
 * `UPSTREAM_SHAPE_CHANGED` gets a loud structured log naming the offending
 * field — the user only ever sees a generic message, per the error table in
 * `04-architecture/API_CONTRACTS.md`.
 */
export function mapUpstreamError(error: unknown, route: string): NextResponse<ErrorEnvelope> {
  if (error instanceof UpstreamNotFoundError) {
    return jsonError('NOT_FOUND', 'This market is no longer available.');
  }
  if (error instanceof UpstreamRateLimitedError) {
    return jsonError('UPSTREAM_RATE_LIMITED', 'Refreshing paused: upstream is rate-limiting requests.');
  }
  if (error instanceof UpstreamShapeChangedError) {
    console.error(`[${route}] UPSTREAM_SHAPE_CHANGED field="${error.field}": ${error.message}`);
    return jsonError('UPSTREAM_SHAPE_CHANGED', 'Upstream data did not match the expected shape.');
  }
  if (error instanceof UpstreamUnavailableError) {
    return jsonError('UPSTREAM_UNAVAILABLE', 'Upstream is unavailable right now.');
  }
  console.error(`[${route}] unexpected error:`, error);
  return jsonError('INTERNAL', 'Something went wrong.');
}

export function badRequest(message: string): NextResponse<ErrorEnvelope> {
  return jsonError('BAD_REQUEST', message);
}

const TOKEN_ID_PATTERN = /^\d+$/;

/** `tokenId` must be a bare decimal digit string — never coerced to a number. */
export function isValidTokenId(value: string | null): value is string {
  return value !== null && TOKEN_ID_PATTERN.test(value);
}

const MIN_LIMIT = 1;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/** Returns `null` when the raw value fails to parse as an in-range integer. */
export function parseLimit(raw: string | null): number | null {
  if (raw === null) return DEFAULT_LIMIT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < MIN_LIMIT || value > MAX_LIMIT) return null;
  return value;
}

const INTERVALS = ['1h', '6h', '1d', '1w', 'max'] as const;
export type Interval = (typeof INTERVALS)[number];

export function parseInterval(raw: string | null): Interval | null {
  if (raw === null) return '1w';
  return (INTERVALS as readonly string[]).includes(raw) ? (raw as Interval) : null;
}

/** Minutes. Returns `undefined` (absent) when not supplied, `null` when invalid. */
export function parseFidelity(raw: string | null): number | null | undefined {
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}
