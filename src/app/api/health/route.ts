import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Process start, captured once at module load. */
const startedAt = Date.now();

export interface HealthResponse {
  status: 'ok';
  /** Render injects RENDER_GIT_COMMIT. Locally there is no SHA, so: "dev". */
  commit: string;
  /**
   * Seconds since this process started. Small numbers on a request that took
   * tens of seconds to answer are the signature of a Render cold start.
   */
  uptimeSeconds: number;
}

export function GET(): NextResponse<HealthResponse> {
  const body: HealthResponse = {
    status: 'ok',
    commit: process.env.RENDER_GIT_COMMIT ?? 'dev',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  };

  return NextResponse.json(body, {
    headers: { 'cache-control': 'no-store' },
  });
}
