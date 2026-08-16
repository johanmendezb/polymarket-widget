# POLYMARKET DOMAIN MODEL

The canonical internal vocabulary. Every type here lives in `src/domain` and is pure: no I/O, no framework imports, no `any`.

Upstream field names are deliberately **not** reused. The mapping from Gamma/CLOB responses to these types happens in exactly one place, `src/polymarket/mappers.ts`, guarded by zod schemas. If Polymarket changes a field, one file fails loudly.

---

## 1. Core entities

```ts
declare const BRAND: unique symbol;
type Branded<Tag extends string> = { readonly [BRAND]: Tag };

/** Probability in [0,1]. What the model believes. Never a percentage. */
type Probability = Branded<'Probability'>;

/** Price per share in USDC, in [0,1]. Numerically equal to probability, semantically not. */
type Price = Branded<'Price'>;

/** A count of outcome shares. Each winning share pays exactly 1 USDC. */
type Shares = Branded<'Shares'>;

/** USDC amount. May be negative: a loss is a real amount. */
type Usdc = Branded<'Usdc'>;

/** Taker fee rate in [0,1]. Read per market, never hardcoded. */
type FeeRate = Branded<'FeeRate'>;
```

The branding is not ceremony. The single most common bug in this domain is multiplying a probability by a price, or displaying a price as a percentage without conversion. The compiler should catch it.

**These brands are opaque, not intersections with `number`.** An earlier revision of this document wrote them as `number & { readonly __brand: 'Price' }`. That shape fails at the only job it has: it is still a `number`, so `probability * price` type-checks and quietly yields a meaningless figure. The opaque form is not assignable to `number`, so no arithmetic operator accepts it. Values are built and unwrapped by name (T2.1):

```ts
asProbability(0.62)   asPrice(0.62)   asShares(100)   asUsdc(-3.25)   asFeeRate(0.04)
tryAsProbability(1.5) // → null, for boundary code that prefers to branch
probabilityValue(p)   priceValue(p)   sharesValue(s)  usdcValue(u)    feeRateValue(r)
priceToProbability(p) probabilityToPrice(p)  // the only sanctioned crossing
```

`asProbability`, `asPrice` and `asFeeRate` throw `RangeError` outside [0,1]; `asShares` rejects negatives; all five reject `NaN` and the infinities. Arithmetic therefore reads `priceValue(a) * sharesValue(b)`, which is the point: every crossing of a unit boundary is visible in the diff. TypeScript still permits `<` and `>` between two values of the *same* brand, so sorting and thresholding stay readable.

```ts
interface MarketOutcome {
  label: string;              // "Yes", "No", "Zohran Mamdani"
  tokenId: string;            // CLOB token id, a decimal string, NOT a number
  indicativePrice: Price | null;  // from Gamma outcomePrices; indicative only
}

interface Market {
  id: string;                 // Gamma numeric id, as string
  slug: string;
  conditionId: string;
  question: string;
  description: string;
  resolutionSource: string | null;
  resolutionCriteria: string | null;
  outcomes: MarketOutcome[];  // index-aligned with the upstream arrays
  negRisk: boolean;
  acceptingOrders: boolean;
  closed: boolean;
  active: boolean;
  endDate: string | null;     // ISO 8601
  tickSize: Price;
  minOrderSize: Usdc;
  fees: FeeConfig;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  bestBid: Price | null;      // indicative, from Gamma
  bestAsk: Price | null;      // indicative, from Gamma
  spread: Price | null;       // indicative, from Gamma
  lastTradePrice: Price | null;
  eventId: string | null;
  eventTitle: string | null;
  category: string | null;
}
```

**`tokenId` is a string, always.** The live values exceed `Number.MAX_SAFE_INTEGER` (77-digit decimals). Parsing one as a number silently corrupts it. This is a mandatory unit test.

**Gamma prices are indicative.** `bestBid` / `bestAsk` / `spread` from the market object are good enough to render a list, and are not good enough to price a fill. Anything the user is about to act on comes from a fresh `/book` call. The type system cannot enforce this, so the naming does: fields sourced from Gamma are documented as indicative and the UI labels them as such.

---

## 2. Order book

```ts
interface BookLevel {
  price: Price;
  size: Shares;
}

interface OrderBook {
  tokenId: string;
  /** Sorted DESCENDING by price after normalization. bids[0] is the best bid. */
  bids: BookLevel[];
  /** Sorted ASCENDING by price after normalization. asks[0] is the best ask. */
  asks: BookLevel[];
  tickSize: Price;
  minOrderSize: Usdc;
  negRisk: boolean;
  lastTradePrice: Price | null;
  fetchedAt: number;          // epoch ms, ours not theirs
  upstreamTimestamp: string;  // theirs
}
```

### The normalization contract

**Upstream orders both sides worst-price-first. The best level is the LAST element of each array.**

An earlier revision of this document said both arrays arrive sorted descending. That is right for
asks and wrong for bids. Re-verified 2026-08-16 against eight live markets by direct request to
`clob /book`: asks came back descending in 8 of 8, bids ascending in 7 of 7 that had more than one
level (the eighth had a single bid, which is trivially both).

```
asks: [{"price":"0.999",...}, {"price":"0.998",...}, ... , {"price":"0.008",...}]   // worst -> best
bids: [{"price":"0.001",...}, {"price":"0.002",...}, ... , {"price":"0.004",...}]   // worst -> best
```

So the rule is one rule, not two: **`mapOrderBook()` reverses both sides**, so that within our
domain `asks[0]` is the best (lowest) ask and `bids[0]` is the best (highest) bid.

Getting asks wrong prices every buy at 99 cents instead of 45, which is loud and obvious. Getting
**bids** wrong is worse, because it is quiet: `bids[0]` would hold the worst bid in the book, the
spread would read as enormous, the wide-spread display rule and the abstention gate would both
fire on healthy markets, and invariant I1 would still pass — 0.008 >= 0.001 is true, so a crossed-
book assertion cannot catch it. Nothing would throw. The widget would simply abstain from
everything and look thoughtful doing it.

Four tests are mandatory:

1. Given a descending upstream asks array, `asks[0].price` is the minimum.
2. Given an ascending upstream bids array, `bids[0].price` is the maximum.
3. Given the same fixture, the book is not crossed: `bestAsk(book) >= bestBid(book)`.
4. Given a fixture whose spread is known to be narrow, the computed spread is narrow. This is the
   one that actually catches an unreversed bids array; test 3 cannot.

If any fails, every price, every edge and every recommendation downstream is wrong. Treat these as
the highest-value tests in the repository.

### The upstream wire shape

`clob /book` is snake_case and the mapper does the rename. Observed keys, 2026-08-16:

```
asset_id  bids  asks  hash  last_trade_price  market  min_order_size  neg_risk  tick_size  timestamp
```

Two further things the zod schema and the client have to get right:

- **`clobTokenIds` on the Gamma market object is a JSON-encoded string, not an array.** It arrives
  as `"[\"7214...\",\"2714...\"]"` and needs `JSON.parse` before the per-element `/^\d+$/`
  validation. `outcomes` and `outcomePrices` are encoded the same way, and all three must parse to
  arrays of equal length — see §2's pairing rule.
- **Send an explicit `User-Agent`.** A request with none returns `403 Forbidden` from the CLOB
  host; the identical URL with an ordinary UA returns `200`. See OQ-10.

---

## 3. Fees

```ts
interface FeeConfigBase {
  enabled: boolean;
  /** Taker fee rate, e.g. 0.04 for politics. Read per-market from the API. */
  takerRate: FeeRate;
  /** Makers pay nothing. Kept for completeness and future maker simulation. */
  makerRate: FeeRate;
  /** Human label for the UI, e.g. "Politics · 4% taker rate". */
  displayLabel: string;
}

/** A union, so `source` and `estimated` cannot disagree. */
type FeeConfig =
  | (FeeConfigBase & { source: 'market-object';           estimated: false })
  | (FeeConfigBase & { source: 'clob-fee-rate-endpoint';  estimated: false })
  | (FeeConfigBase & { source: 'category-fallback';       estimated: true  });
```

The formula lives in `src/simulation/fees.ts` as a pure function. See `03-domain/ORDER_EXECUTION.md` §2.

`source: 'category-fallback'` must cause the UI to label the fee as estimated. We do not silently substitute a number and present it as fact. The union carries `estimated` as part of the discriminant so the label follows from the type rather than from someone remembering to set a flag (T2.1).

**An absent upstream fee field is not a zero rate.** A live, liquid market checked 2026-08-16 returned `feesEnabled: false`, `feeType: null`, `takerBaseFee: null`. Mapping that to `{ takerRate: 0, source: 'market-object' }` puts a $0.00 fee line in the cost preview, which is the failure ADR-0009 exists to prevent. Missing fields mean `category-fallback`, and the type makes you write that out.

---

## 4. Simulation types

```ts
type Side = 'BUY';   // v1 only supports buying an outcome. Selling is post-challenge.

interface FillLeg {
  price: Price;
  shares: Shares;
}

interface FillEstimate {
  requested: { kind: 'shares'; value: Shares } | { kind: 'usdc'; value: Usdc };
  legs: FillLeg[];
  sharesFilled: Shares;
  /** Volume-weighted average price across the legs. */
  averagePrice: Price;
  /** asks[0].price at the time of the walk. */
  topOfBookPrice: Price;
  /** averagePrice - topOfBookPrice. Zero when the whole order fills at top of book. */
  priceImpact: Price;
  grossCost: Usdc;            // sharesFilled * averagePrice
  fee: Usdc;
  totalCost: Usdc;            // grossCost + fee
  payoutIfWin: Usdc;          // sharesFilled * 1.00
  netProfitIfWin: Usdc;       // payoutIfWin - totalCost
  /** True when the book could not absorb the full request. */
  partial: boolean;
  maxFillableShares: Shares;
  bookFetchedAt: number;
}
```

**`priceImpact`, not `slippage`.** These are different things and conflating them is a named anti-pattern. Price impact is the gap between top of book and your volume-weighted fill, caused by your own order size. Slippage is the drift between quote time and settlement time. In a simulation there is no settlement, therefore **there is no slippage**, therefore we do not ship a slippage tolerance control. See `02-research/UX_RESEARCH.md` §1.1 and §6.17.

```ts
interface SimulatedPosition {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcomeLabel: string;
  tokenId: string;
  shares: Shares;
  entryAveragePrice: Price;
  feePaid: Usdc;
  totalCost: Usdc;
  payoutIfWin: Usdc;
  createdAt: number;
  /** Always true. Exists so the type makes the simulation explicit at every use site. */
  simulated: true;
}
```

---

## 5. AI types

```ts
type Confidence = 'low' | 'medium' | 'high';

interface EvidenceItem {
  claim: string;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: string | null;   // null is allowed and must be shown as "undated"
  supports: 'yes' | 'no' | 'context';
}

interface Forecast {
  tokenId: string;
  outcomeLabel: string;
  /** Median of k blind samples, elicited WITHOUT the market price in context. */
  blindProbability: Probability;
  /** Interquartile range across samples. Feeds the gate. */
  dispersion: number;
  samples: Probability[];
  /** Optional second elicitation WITH the price shown. Diagnostic only. */
  anchoredProbability: Probability | null;
  /** blindProbability blended with the market. This is what we display as "AI estimate". */
  blendedProbability: Probability;
  blendWeight: number;          // fixed and pre-registered, not tuned on outcomes
  marketProbability: Probability;
  confidence: Confidence;
  evidence: EvidenceItem[];
  risks: string[];
  modelId: string;
  promptVersion: string;
  createdAt: string;            // ISO 8601
}

type GateReason =
  | 'EDGE_BELOW_COST'
  | 'SPREAD_TOO_WIDE'
  | 'INSUFFICIENT_DEPTH'
  | 'EXTREME_PRICE_BAND'
  | 'HORIZON_TOO_LONG'
  | 'MARKET_TOO_CERTAIN'
  | 'THIN_EVIDENCE'
  | 'HIGH_MODEL_DISPERSION'
  | 'AMBIGUOUS_RESOLUTION'
  | 'NEAR_EXPIRY_SPORTS'
  | 'MARKET_NOT_ACCEPTING_ORDERS';

interface Recommendation {
  verdict: 'CONSIDER' | 'NO_BET';
  reasons: GateReason[];        // populated for NO_BET, may be non-empty for CONSIDER as warnings
  estimatedEdge: number;        // blendedProbability - (averagePrice + feePerShare). May be negative.
  suggestedFractionOfBankroll: number | null;  // quarter-Kelly, capped. null on NO_BET.
  forecast: Forecast;
  fill: FillEstimate;
}
```

Every `GateReason` maps to a cited threshold in `05-ai/AI_SYSTEM.md` §4. A reason code with no citation is not allowed to ship.

---

## 6. Invariants

These are property-test targets, not prose.

| # | Invariant |
|---|---|
| I1 | `asks[0].price >= bids[0].price` for any normalized book (never crossed) |
| I2 | `sum(legs[].shares) === sharesFilled` |
| I3 | `averagePrice === sum(legs[].price * legs[].shares) / sharesFilled` within float tolerance |
| I4 | `averagePrice >= topOfBookPrice` for a BUY, always |
| I5 | `fee === sharesFilled * takerRate * averagePrice * (1 - averagePrice)`, rounded to 5dp |
| I6 | `fee` is maximised at `averagePrice === 0.5` and approaches 0 at both extremes |
| I7 | `totalCost === grossCost + fee` |
| I8 | `partial === (sharesFilled < requestedShares)` |
| I9 | A request larger than total book depth yields `partial: true` and never throws |
| I10 | An empty book yields `sharesFilled === 0`, `partial: true`, and no division by zero |
| I11 | Every `tokenId` round-trips as a string with no precision loss |
| I12 | `blindProbability` is computed by a code path that never receives the market price |
