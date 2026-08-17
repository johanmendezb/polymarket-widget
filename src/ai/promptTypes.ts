import type { Probability } from '@/domain';

/**
 * Everything the blind elicitation needs to fill `prompts/runtime/blind-v1.md`.
 *
 * Deliberately has no price field. `blind-v1.md` also asks the model to
 * ignore market odds, but that instruction alone is not the defence — telling
 * a model to suppress knowledge is known to be unreliable. The defence is
 * structural: there is nothing here for the template to interpolate. Adding a
 * price field to this interface is a regression against risk R-01 and must
 * fail typecheck. See CLAUDE.md rule 6.
 */
export interface BlindPromptInput {
  readonly question: string;
  readonly outcomeLabel: string;
  readonly resolutionCriteria: string;
  readonly endDate: string;
  readonly category: string;
  readonly todayIso: string;
}

/**
 * `blind-v1`'s input extended with the one field it deliberately omits. Feeds
 * `anchored-v1.md` only, run once (k = 1) as a diagnostic. Its output is
 * never displayed as the estimate and never enters the blend.
 */
export interface AnchoredPromptInput extends BlindPromptInput {
  readonly marketProbability: Probability;
}

export interface AssembledPrompt {
  readonly text: string;
  /** The file under `prompts/runtime/` that produced `text`, e.g. `blind-v1`. */
  readonly promptVersion: string;
}
