// Order-book walk, fees, edge, Kelly and gate arithmetic.
// May import: domain.
export { walkBook, walkBookByBudget } from './book-walk';
export { computeFee } from './fees';
export { computeCostWaterfall, computeEdge, type CostWaterfall } from './edge';
export { KELLY_HARD_CAP_FRACTION, kellyFraction, suggestedSize, type KellyMode } from './kelly';
export {
  EXTREME_PRICE_HIGH,
  EXTREME_PRICE_LOW,
  HIGH_DISPERSION_THRESHOLD,
  HORIZON_TOO_LONG_MS,
  MARKET_TOO_CERTAIN_HIGH,
  MARKET_TOO_CERTAIN_LOW,
  MIN_EVIDENCE_COUNT,
  NEAR_EXPIRY_SPORTS_MS,
  evaluateGate,
  type GateInput,
} from './gate';
