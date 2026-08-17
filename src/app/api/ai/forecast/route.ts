/**
 * `POST /api/ai/forecast` — `docs/04-architecture/API_CONTRACTS.md`.
 *
 * A thin HTTP wrapper: body parsing, fetching the market and book through
 * the existing cached upstream client, and mapping errors to the documented
 * envelope. All the actual composition (blend, gate, blind + anchored
 * elicitation) lives in `composeForecastRecommendation` in `@/ai`, which
 * this route calls with a real `AnthropicTransport` by default.
 *
 * `handleForecastRequest` takes the transport as an optional dependency so
 * tests can inject a fake one and exercise this whole route — validation,
 * upstream fetch, composition, error mapping — with no network and no
 * `ANTHROPIC_API_KEY`. `POST` itself is the plain Next.js entry point Next
 * requires.
 */
import type { NextResponse } from 'next/server';
import { z } from 'zod';

import { jsonError, jsonSuccess, type ErrorEnvelope, type SuccessEnvelope } from '@/lib';
import { fetchBook, fetchMarket } from '@/polymarket';
import type { Recommendation } from '@/domain';
import {
  AiClientError,
  composeForecastRecommendation,
  createAnthropicTransport,
  sampleCountFromEnv,
  type AnthropicTransport,
} from '@/ai';

import { badRequest, mapUpstreamError } from '../../polymarket/_shared';

export const dynamic = 'force-dynamic';

const requestBodySchema = z.object({
  marketId: z.string().min(1),
  tokenId: z.string().regex(/^\d+$/, 'tokenId must be a bare decimal digit string'),
  samples: z.number().int().positive().optional(),
});

export interface ForecastRouteDeps {
  readonly transport?: AnthropicTransport;
}

export async function handleForecastRequest(
  request: Request,
  deps: ForecastRouteDeps = {},
): Promise<NextResponse<SuccessEnvelope<Recommendation> | ErrorEnvelope>> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest('Request body must be JSON.');
  }

  const parsedBody = requestBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return badRequest('marketId and a digit-string tokenId are required.');
  }
  const { marketId, tokenId, samples } = parsedBody.data;

  try {
    const marketResult = await fetchMarket(marketId);
    const outcome = marketResult.data.outcomes.find((candidate) => candidate.tokenId === tokenId);
    if (!outcome) {
      return jsonError('NOT_FOUND', 'This market is no longer available.');
    }

    const bookResult = await fetchBook(tokenId);
    const transport = deps.transport ?? createAnthropicTransport();
    const k = samples ?? sampleCountFromEnv();

    const result = await composeForecastRecommendation(marketResult.data, outcome, bookResult.data, k, {
      transport,
      now: Date.now(),
    });

    if (result.kind === 'no_evidence') {
      return jsonError('AI_NO_EVIDENCE', 'I could not find sources I trust for this question.');
    }

    return jsonSuccess<Recommendation>(result.recommendation, {
      fetchedAt: Date.now(),
      stale: marketResult.stale || bookResult.stale,
      cached: marketResult.cached && bookResult.cached,
    });
  } catch (error) {
    if (error instanceof AiClientError) {
      return jsonError(error.code, error.message);
    }
    return mapUpstreamError(error, 'ai/forecast');
  }
}

export function POST(request: Request): Promise<NextResponse<SuccessEnvelope<Recommendation> | ErrorEnvelope>> {
  return handleForecastRequest(request);
}
