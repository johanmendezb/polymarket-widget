import { probabilityValue, type Probability } from '@/domain';

import { fromLogOdds, toLogOdds } from './aggregate';

/**
 * `docs/05-ai/AI_SYSTEM.md` §1 step 4 / `docs/06-execution/BACKLOG.md` T5.3.
 * Pre-registered. Not tuned on outcomes, not adjusted to make a demo look
 * better — if this number looks wrong, that is a research decision to
 * revisit in the docs, not a knob to turn here.
 */
export const BLEND_WEIGHT = 0.35;

/**
 * `p_display = inverse_logit((1-w)*logit(p_market) + w*logit(p_blind))`.
 *
 * Blends in log-odds space, consistent with the k-sample aggregation in
 * `aggregate.ts` — never a weighted average of the raw probabilities, which
 * would treat a move from 0.50 to 0.55 as equal in weight to a move from
 * 0.95 to 0.99999 when they are not remotely equal in evidence.
 */
export function blendWithMarket(
  blindProbability: Probability,
  marketProbability: Probability,
  weight: number = BLEND_WEIGHT,
): Probability {
  const blendedLogOdds =
    (1 - weight) * toLogOdds(probabilityValue(marketProbability)) +
    weight * toLogOdds(probabilityValue(blindProbability));
  return fromLogOdds(blendedLogOdds);
}
