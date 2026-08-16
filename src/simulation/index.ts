// Order-book walk, fees, edge, Kelly and gate arithmetic.
// May import: domain.
export { walkBook, walkBookByBudget } from './book-walk';
export { computeFee } from './fees';
export { computeCostWaterfall, computeEdge, type CostWaterfall } from './edge';
