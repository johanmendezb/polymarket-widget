import { z } from 'zod';

import { asProbability, type EvidenceItem, type Probability } from '@/domain';

/**
 * Validates the `submit_forecast` tool's `input`, matching
 * `prompts/runtime/submit_forecast.schema.json`. This is the one upstream
 * boundary in `src/ai`: model output is untrusted the same way an HTTP
 * response is.
 */
const evidenceItemInputSchema = z.object({
  claim: z.string(),
  source_url: z.string(),
  source_title: z.string(),
  published_at: z.string().nullable().optional(),
  supports: z.enum(['yes', 'no', 'context']),
});

const submitForecastInputSchema = z.object({
  probability: z.number().min(0).max(1),
  reasoning_summary: z.string(),
  evidence: z.array(evidenceItemInputSchema).max(8),
  risks: z.array(z.string()).max(4).optional(),
  resolution_ambiguity: z.enum(['low', 'medium', 'high']),
  insufficient_evidence: z.boolean(),
});

/**
 * One sample's parsed answer. `insufficientEvidence: true` is a valid value
 * here, not a distinct error path - the schema requires `probability`
 * regardless, so a model that could not find evidence still produces a
 * structurally complete sample. See `docs/05-ai/AI_SYSTEM.md` §5.
 */
export interface ForecastSample {
  readonly probability: Probability;
  readonly reasoningSummary: string;
  readonly evidence: readonly EvidenceItem[];
  readonly risks: readonly string[];
  readonly resolutionAmbiguity: 'low' | 'medium' | 'high';
  readonly insufficientEvidence: boolean;
}

/**
 * Parses and validates a `submit_forecast` tool call's raw `input`.
 *
 * @throws {z.ZodError} when `rawInput` does not match the schema. Callers
 *   treat this as a schema violation, which is the only case the sampler
 *   retries.
 */
export function parseSubmitForecastToolInput(rawInput: unknown): ForecastSample {
  const parsed = submitForecastInputSchema.parse(rawInput);

  return {
    probability: asProbability(parsed.probability),
    reasoningSummary: parsed.reasoning_summary,
    evidence: parsed.evidence.map(
      (item): EvidenceItem => ({
        claim: item.claim,
        sourceUrl: item.source_url,
        sourceTitle: item.source_title,
        publishedAt: item.published_at ?? null,
        supports: item.supports,
      }),
    ),
    risks: parsed.risks ?? [],
    resolutionAmbiguity: parsed.resolution_ambiguity,
    insufficientEvidence: parsed.insufficient_evidence,
  };
}
