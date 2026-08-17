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
  ANTHROPIC_MODEL_ID,
  BLIND_PROMPT_VERSION,
  composeForecastRecommendation,
  createAnthropicTransport,
  sampleCountFromEnv,
  type AnthropicTransport,
  type ForecastResult,
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

/**
 * A forecast is the most expensive operation in this service, and unlike the
 * upstream reads it is priced per call in real money. This keeps a completed
 * recommendation for a short window so that collapsing and re-expanding the
 * panel, or two reviewers opening the same demo market, does not re-bill it.
 *
 * Module scope, so it dies with the instance. That is the right lifetime here:
 * Render's free tier spins the service down after ~15 minutes idle anyway, and
 * a forecast older than that is one we would want to re-ask regardless.
 */
const FORECAST_TTL_MS = Number(process.env.AI_CACHE_TTL_MS ?? 15 * 60 * 1000);

const forecastCache = new Map<string, { readonly value: ForecastResult; readonly expiresAt: number }>();

function getCachedForecast(key: string): ForecastResult | undefined {
  const hit = forecastCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    forecastCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function setCachedForecast(key: string, value: ForecastResult): void {
  forecastCache.set(key, { value, expiresAt: Date.now() + FORECAST_TTL_MS });
}

/**
 * Test-only. The cache is module state, so without this one test's forecast
 * leaks into the next and a scenario silently asserts against the previous
 * one's result.
 */
export function __resetForecastCacheForTests(): void {
  forecastCache.clear();
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

    // A forecast is the most expensive thing this service does: k blind model
    // calls plus an optional anchored diagnostic. Without this, collapsing and
    // re-expanding the panel on the same market bills the whole lot again, and
    // so does every reviewer who opens the same demo market.
    //
    // Keyed on everything that would change the answer, so a stale forecast can
    // never be served for a different prompt version, model, or k. Not keyed on
    // the order book: the book moves constantly and the forecast is
    // deliberately blind to price, so a book change is not a reason to re-ask
    // the model. The fill and the cost preview are recomputed from the live
    // book on every request regardless.
    const cacheKey = `${marketId}:${tokenId}:${k}:${ANTHROPIC_MODEL_ID}:${BLIND_PROMPT_VERSION}`;
    const cached = getCachedForecast(cacheKey);
    const result =
      cached ??
      (await composeForecastRecommendation(marketResult.data, outcome, bookResult.data, k, {
        transport,
        now: Date.now(),
      }));
    if (!cached) setCachedForecast(cacheKey, result);

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
