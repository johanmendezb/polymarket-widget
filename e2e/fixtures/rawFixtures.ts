/**
 * Reads the real recorded Polymarket responses from `test/fixtures/` (T1.4)
 * off disk, so the E2E mocks are built from actual upstream data rather than
 * hand-typed numbers that could drift from it. Only the handful of fields the
 * E2E fixtures need are typed here — this is not a schema, `src/polymarket`'s
 * zod schemas own that job.
 *
 * `outcomes`, `outcomePrices` and `clobTokenIds` arrive JSON-encoded as
 * strings on the wire (`polymarket-domain` skill, trap 2) and are parsed here
 * exactly as `src/polymarket/schemas.ts` parses them.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

// `e2e/` is compiled as CommonJS by Playwright's test runner (no `"type":
// "module"` in package.json), where `import.meta.url` is unavailable but
// `__dirname` is — unlike `scripts/record-fixtures.ts`, which runs under
// Node's own ESM type-stripping and uses `import.meta.url` instead.
const FIXTURE_DIR = path.join(__dirname, '..', '..', 'test', 'fixtures');

function readJsonFixture(file: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), 'utf8'));
}

interface RawFeeSchedule {
  readonly exponent: number;
  readonly rate: number;
  readonly takerOnly: boolean;
  readonly rebateRate: number;
}

export interface RawGammaMarket {
  readonly id: string;
  readonly slug: string;
  readonly conditionId: string;
  readonly question: string;
  readonly description: string;
  readonly outcomes: string;
  readonly outcomePrices: string;
  readonly clobTokenIds: string;
  readonly negRisk?: boolean;
  readonly acceptingOrders: boolean;
  readonly closed: boolean;
  readonly active: boolean;
  readonly endDate: string | null;
  readonly orderPriceMinTickSize: number;
  readonly orderMinSize: number;
  readonly feesEnabled: boolean | null;
  readonly feeType: string | null;
  readonly feeSchedule: RawFeeSchedule | null;
  readonly liquidityNum: number | null;
  readonly volume24hr: number | null;
  readonly bestBid: number | null;
  readonly bestAsk: number | null;
  readonly spread: number | null;
  readonly lastTradePrice: number | null;
}

export interface RawClobLevel {
  readonly price: string;
  readonly size: string;
}

export interface RawClobBook {
  readonly market: string;
  readonly asset_id: string;
  readonly timestamp: string;
  readonly bids: readonly RawClobLevel[];
  readonly asks: readonly RawClobLevel[];
  readonly min_order_size: string;
  readonly tick_size: string;
  readonly neg_risk: boolean;
  readonly last_trade_price?: string | null;
}

export function readGammaMarket(file: string): RawGammaMarket {
  return readJsonFixture(file) as RawGammaMarket;
}

export function readClobBook(file: string): RawClobBook {
  return readJsonFixture(file) as RawClobBook;
}

/** `outcomes`/`outcomePrices`/`clobTokenIds` JSON-decoded, index-paired. */
export function decodedOutcomes(
  market: RawGammaMarket,
): readonly { readonly label: string; readonly tokenId: string; readonly priceText: string }[] {
  const labels = JSON.parse(market.outcomes) as readonly string[];
  const prices = JSON.parse(market.outcomePrices) as readonly string[];
  const tokenIds = JSON.parse(market.clobTokenIds) as readonly string[];
  return labels.map((label, i) => ({ label, tokenId: tokenIds[i]!, priceText: prices[i]! }));
}

/** Reverses raw worst-price-first levels to best-first, exactly as `mapOrderBook` does. */
export function bestFirst(levels: readonly RawClobLevel[]): readonly { readonly price: number; readonly size: number }[] {
  return [...levels].reverse().map((level) => ({ price: Number(level.price), size: Number(level.size) }));
}
