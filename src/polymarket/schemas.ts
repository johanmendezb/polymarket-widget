import { z } from 'zod';

import { UpstreamShapeChangedError } from './errors';

/**
 * zod at the upstream boundary, and nowhere else. Every shape here is
 * permissive about fields we do not read (plain `z.object()` strips unknown
 * keys rather than rejecting them) and strict about the fields we do: a
 * renamed or retyped field fails loudly, naming itself, instead of quietly
 * becoming `undefined` three modules downstream.
 */

const TOKEN_ID_PATTERN = /^\d+$/;

function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown, context: string): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first !== undefined ? first.path.join('.') || '(root)' : '(unknown)';
    throw new UpstreamShapeChangedError(context, field, first?.message ?? 'unknown validation error');
  }
  return result.data;
}

/**
 * `outcomes`, `outcomePrices` and `clobTokenIds` all arrive on the Gamma
 * market object as a JSON-encoded string, not an array — `"[\"7214...\"]"`.
 * `JSON.parse` first, then validate the decoded shape. See
 * `03-domain/POLYMARKET_DOMAIN_MODEL.md` §2.
 */
function jsonEncodedStringArray(fieldName: string) {
  return z.string().transform((raw, ctx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      ctx.addIssue(`${fieldName} is not valid JSON: ${raw.slice(0, 120)}`);
      return z.NEVER;
    }
    if (!Array.isArray(parsed) || !parsed.every((entry): entry is string => typeof entry === 'string')) {
      ctx.addIssue(`${fieldName} did not decode to an array of strings`);
      return z.NEVER;
    }
    return parsed;
  });
}

/**
 * `clobTokenIds` specifically: every decoded element must be a bare decimal
 * digit string. These are 77-digit values that exceed
 * `Number.MAX_SAFE_INTEGER`; nothing here ever coerces one to a number.
 */
const clobTokenIdsSchema = jsonEncodedStringArray('clobTokenIds').transform((ids, ctx) => {
  const bad = ids.find((id) => !TOKEN_ID_PATTERN.test(id));
  if (bad !== undefined) {
    ctx.addIssue(`clobTokenIds contains a non-token-id value: "${bad}"`);
    return z.NEVER;
  }
  return ids;
});

const feeScheduleSchema = z.object({
  rate: z.number(),
  exponent: z.number().optional(),
  takerOnly: z.boolean().optional(),
  rebateRate: z.number().optional(),
});

/**
 * A field that is sometimes present-and-null and sometimes absent entirely,
 * normalized to `null` either way so the mapper never has to branch on
 * `undefined` vs `null`. Observed against the recorded search fixture (61
 * nested markets): `bestBid`, `volume24hr`, `feeSchedule`, `takerBaseFee`,
 * `makerBaseFee`, `liquidityNum` and `resolutionSource` are all missing on at
 * least one real market, not merely `null`.
 */
function nullishNumber() {
  return z.number().nullish().transform((value) => value ?? null);
}

function nullishString() {
  return z.string().nullish().transform((value) => value ?? null);
}

/**
 * The Gamma market object. Permissive about the ~70 fields we do not read
 * (rewards config, UMA bond amounts, translation flags, ...); strict about
 * the ones the domain model consumes.
 *
 * Fee fields (`feesEnabled`, `feeType`, `feeSchedule`, `takerBaseFee`,
 * `makerBaseFee`) are `.nullable()`, not required-present, because a live
 * liquid market has been observed with every one of them `null` (OQ-11). An
 * absent field is not a zero rate — that is `mapMarket`'s job to enforce, not
 * this schema's, but the schema must let `null` through rather than reject
 * it as a shape change.
 */
export const GammaMarketSchema = z.object({
  id: z.string(),
  slug: z.string(),
  conditionId: z.string(),
  question: z.string(),
  description: z.string(),
  resolutionSource: nullishString(),
  outcomes: jsonEncodedStringArray('outcomes'),
  outcomePrices: jsonEncodedStringArray('outcomePrices'),
  clobTokenIds: clobTokenIdsSchema,
  // Absent on at least one recorded closed market. false is the conservative
  // default: it means "treat as not part of a negRisk group" rather than
  // asserting a grouping we have no evidence for.
  negRisk: z.boolean().optional().default(false),
  acceptingOrders: z.boolean(),
  closed: z.boolean(),
  active: z.boolean(),
  enableOrderBook: z.boolean(),
  endDate: z.string().nullable(),
  orderPriceMinTickSize: z.number(),
  orderMinSize: z.number(),
  feesEnabled: z.boolean().nullable(),
  feeType: z.string().nullable(),
  feeSchedule: feeScheduleSchema.nullish().transform((value) => value ?? null),
  takerBaseFee: nullishNumber(),
  makerBaseFee: nullishNumber(),
  liquidityNum: nullishNumber(),
  volume24hr: nullishNumber(),
  bestBid: nullishNumber(),
  bestAsk: z.number().nullable(),
  spread: z.number().nullable(),
  lastTradePrice: z.number().nullable(),
}).superRefine((market, ctx) => {
  const lengths = [market.outcomes.length, market.outcomePrices.length, market.clobTokenIds.length];
  if (new Set(lengths).size !== 1) {
    ctx.addIssue(
      `outcomes (${market.outcomes.length}), outcomePrices (${market.outcomePrices.length}) and ` +
        `clobTokenIds (${market.clobTokenIds.length}) must be the same length`,
    );
  }
});

export type GammaMarket = z.infer<typeof GammaMarketSchema>;

/** A tag on a Gamma event. We only ever read the label. */
const gammaTagSchema = z.object({ label: z.string() });

export const GammaEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(gammaTagSchema).optional(),
  markets: z.array(GammaMarketSchema),
});

export type GammaEvent = z.infer<typeof GammaEventSchema>;

export const GammaSearchResponseSchema = z.object({
  events: z.array(GammaEventSchema),
});

export type GammaSearchResponse = z.infer<typeof GammaSearchResponseSchema>;

/**
 * `clob /book` is snake_case on the wire (`asset_id`, `last_trade_price`,
 * `min_order_size`, `neg_risk`, `tick_size`). This schema owns the rename by
 * being the only place that reads these keys.
 *
 * `price` and `size` on each level are numeric strings ("0.99", "1156765.55")
 * — `z.coerce.number()` is safe here because these are prices and sizes, not
 * token ids; nothing here ever coerces `asset_id`.
 */
const clobLevelSchema = z.object({
  price: z.coerce.number(),
  size: z.coerce.number(),
});

export const ClobBookSchema = z.object({
  asset_id: z.string().regex(TOKEN_ID_PATTERN, 'asset_id is not a bare decimal token id'),
  asks: z.array(clobLevelSchema),
  bids: z.array(clobLevelSchema),
  last_trade_price: z.coerce.number().nullable().optional(),
  min_order_size: z.coerce.number(),
  neg_risk: z.boolean(),
  tick_size: z.coerce.number(),
  timestamp: z.string(),
});

export type ClobBook = z.infer<typeof ClobBookSchema>;

export const ClobPriceHistorySchema = z.object({
  history: z.array(z.object({ t: z.number(), p: z.number() })),
});

export type ClobPriceHistory = z.infer<typeof ClobPriceHistorySchema>;

export function parseGammaMarket(raw: unknown): GammaMarket {
  return parseOrThrow(GammaMarketSchema, raw, 'gamma market');
}

export function parseGammaSearchResponse(raw: unknown): GammaSearchResponse {
  return parseOrThrow(GammaSearchResponseSchema, raw, 'gamma search response');
}

export function parseClobBook(raw: unknown): ClobBook {
  return parseOrThrow(ClobBookSchema, raw, 'clob book');
}

export function parseClobPriceHistory(raw: unknown): ClobPriceHistory {
  return parseOrThrow(ClobPriceHistorySchema, raw, 'clob price history');
}
