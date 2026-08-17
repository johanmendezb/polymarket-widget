import type { FeeRate } from './brand';

/**
 * Where a taker rate came from. The distinction is not bookkeeping: a rate we
 * read is a fact, a rate we inferred from the market's category is an estimate,
 * and the UI is required to say which it is showing.
 */
export type FeeSource = 'market-object' | 'clob-fee-rate-endpoint' | 'category-fallback';

interface FeeConfigBase {
  /** Whether the market charges a taker fee at all. */
  readonly enabled: boolean;
  /** Taker fee rate, e.g. 0.04 for politics. Read per market. Never a constant. */
  readonly takerRate: FeeRate;
  /** Makers pay nothing. Kept for completeness and a future maker simulation. */
  readonly makerRate: FeeRate;
  /** Human label for the UI, e.g. "Politics · 4% taker rate". */
  readonly displayLabel: string;
}

/**
 * The fee terms of one market.
 *
 * This is a union rather than a flat record so that `source` and `estimated`
 * cannot disagree: a `category-fallback` config is estimated by construction
 * and the UI's "estimated" label follows from the type instead of from someone
 * remembering to set a flag.
 *
 * **An absent upstream fee field is not a zero rate.** The live market object
 * routinely carries `feesEnabled: false`, `feeType: null`, `takerBaseFee: null`
 * even on liquid markets. Mapping those to `takerRate: 0, source:
 * 'market-object'` puts a $0.00 fee line in the cost preview, which is exactly
 * the failure ADR-0009 exists to prevent. When the fields are missing, the
 * category table is the answer and the config is a `category-fallback` — which
 * this type makes you write out.
 */
export type FeeConfig =
  | (FeeConfigBase & { readonly source: 'market-object'; readonly estimated: false })
  | (FeeConfigBase & { readonly source: 'clob-fee-rate-endpoint'; readonly estimated: false })
  | (FeeConfigBase & { readonly source: 'category-fallback'; readonly estimated: true });
