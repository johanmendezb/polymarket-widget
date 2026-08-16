// zod schemas, upstream client, mappers and cache.
// May import: domain.

export {
  isStaleableFailure,
  UpstreamNotFoundError,
  UpstreamRateLimitedError,
  UpstreamShapeChangedError,
  UpstreamUnavailableError,
} from './errors';

export {
  ClobBookSchema,
  ClobPriceHistorySchema,
  GammaEventSchema,
  GammaMarketSchema,
  GammaSearchResponseSchema,
  parseClobBook,
  parseClobPriceHistory,
  parseGammaMarket,
  parseGammaSearchResponse,
  type ClobBook,
  type ClobPriceHistory,
  type GammaEvent,
  type GammaMarket,
  type GammaSearchResponse,
} from './schemas';

export {
  mapMarket,
  mapOrderBook,
  mapPriceHistory,
  mapSearchResults,
  type PricePoint,
} from './mappers';

export { TtlCache, type CacheResult, type TtlCacheOptions } from './cache';

export {
  fetchBook,
  fetchMarket,
  fetchPriceHistory,
  fetchSearch,
  type PriceHistoryParams,
  type UpstreamCallResult,
} from './client';
