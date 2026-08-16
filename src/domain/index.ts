// Pure types, branded primitives, invariants and guards.
// Imports nothing internal. Enforced by import/no-restricted-paths.
//
// The whole module is framework-free and I/O-free by contract: no components,
// no server runtime, no validation library. Upstream validation lives in
// src/polymarket and nowhere else.

export {
  asFeeRate,
  asPrice,
  asProbability,
  asShares,
  asUsdc,
  feeRateValue,
  priceToProbability,
  priceValue,
  probabilityToPrice,
  probabilityValue,
  sharesValue,
  tryAsFeeRate,
  tryAsPrice,
  tryAsProbability,
  tryAsShares,
  tryAsUsdc,
  usdcValue,
  type FeeRate,
  type Price,
  type Probability,
  type Shares,
  type Usdc,
} from './brand';

export { isTokenId, type TokenId } from './token';

export { type FeeConfig, type FeeSource } from './fees';

export { type BookLevel, type OrderBook } from './book';

export { type Market, type MarketOutcome } from './market';

export {
  type FillEstimate,
  type FillLeg,
  type FillRequest,
  type Side,
  type SimulatedPosition,
} from './simulation';

export {
  GATE_REASONS,
  isGateReason,
  type Confidence,
  type EvidenceItem,
  type Forecast,
  type GateReason,
  type Recommendation,
  type Verdict,
} from './ai';

export { ERROR_CODES, isErrorCode, type ErrorCode } from './errors';
