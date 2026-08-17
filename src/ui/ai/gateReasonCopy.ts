import type { GateReason } from '@/domain';

/**
 * Plain-English label plus the cited justification for each gate reason —
 * `docs/05-ai/AI_SYSTEM.md` §4. Presentation copy only: the reasons
 * themselves are a closed domain union, but the wording used to explain them
 * to a user belongs here, not in `src/domain`.
 *
 * "A recommendation the user cannot interrogate is worse than no
 * recommendation" — every reason code shown in the panel must resolve to an
 * entry here, one click away.
 */
export const GATE_REASON_COPY: Readonly<Record<GateReason, { readonly label: string; readonly justification: string }>> = {
  EDGE_BELOW_COST: {
    label: 'Edge below cost',
    justification: 'The estimate, net of the average fill price and the fee, does not clear zero.',
  },
  SPREAD_TOO_WIDE: {
    label: 'Spread too wide',
    justification: 'The quoted spread exceeds the claimed edge, so the edge would not survive actually trading it.',
  },
  INSUFFICIENT_DEPTH: {
    label: 'Insufficient depth',
    justification: 'Filling the requested size moves the price too far, or the book cannot fill it at all.',
  },
  EXTREME_PRICE_BAND: {
    label: 'Extreme price band',
    justification: 'Price is below 10c or above 90c, where quoted spreads widen sharply and published results are worst.',
  },
  HORIZON_TOO_LONG: {
    label: 'Horizon too long',
    justification: 'Resolution is more than about a month out; any informational edge decays well before then.',
  },
  MARKET_TOO_CERTAIN: {
    label: 'Market too certain',
    justification: 'Market price sits outside the 0.30–0.70 band where model forecasts were competitive at all.',
  },
  THIN_EVIDENCE: {
    label: 'Thin evidence',
    justification: 'Fewer than five relevant dated sources were retrieved for this question.',
  },
  HIGH_MODEL_DISPERSION: {
    label: 'High dispersion',
    justification: 'The interquartile range across the sampled estimates exceeds the threshold — the model disagreed with itself.',
  },
  AMBIGUOUS_RESOLUTION: {
    label: 'Ambiguous resolution',
    justification: 'The resolution criteria are vague or depend on a subjective source.',
  },
  NEAR_EXPIRY_SPORTS: {
    label: 'Near-expiry sports market',
    justification: 'This is a sports market inside its final minutes, where calibration becomes distorted.',
  },
  MARKET_NOT_ACCEPTING_ORDERS: {
    label: 'Not accepting orders',
    justification: 'This market is not accepting orders, so no fill — and therefore no real edge — can be priced.',
  },
};
