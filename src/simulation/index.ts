// Order-book walk, fees, edge, Kelly and gate arithmetic.
// May import: domain.
export { walkBook, walkBookByBudget } from './book-walk';
export { computeFee } from './fees';
export { computeCostWaterfall, computeEdge, type CostWaterfall } from './edge';
export { KELLY_HARD_CAP_FRACTION, kellyFraction, suggestedSize, type KellyMode } from './kelly';
