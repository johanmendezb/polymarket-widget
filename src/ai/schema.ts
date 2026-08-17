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

/**
 * Two tiers, deliberately.
 *
 * **Load-bearing fields are strict.** `probability` is the answer.
 * `insufficient_evidence` is the abstention signal, and defaulting it to
 * `false` would silently convert "I could not find sources I trust" into a
 * confident forecast, which is the exact dishonesty the gate exists to prevent.
 * A sample missing either of these is genuinely unusable and must fail.
 *
 * **Presentation fields degrade instead of failing.** `risks`, and a malformed
 * `resolution_ambiguity`, cannot be allowed to destroy a sample that carries a
 * valid probability, reasoning and evidence.
 *
 * That distinction is not theoretical. Measured against the live model on
 * 2026-08-17, 1 sample in 6 failed validation on `risks` alone — the model had
 * answered the question correctly and rendered one display field in a shape the
 * schema did not expect. Under `AI_SAMPLES=1` there is no sibling sample to
 * fall back on, so that single field took down the whole forecast and surfaced
 * to the user as "the model's response didn't match the expected format".
 *
 * `resolution_ambiguity` falls back to `high`, which is the conservative
 * direction: it makes the gate more likely to abstain, never less.
 */
const submitForecastInputSchema = z.object({
  probability: z.number().min(0).max(1),
  reasoning_summary: z.string().catch(''),
  // Per-item resilience, not per-array. A single malformed evidence item must
  // not discard the good ones: dropping all sources because one had a bad
  // `supports` value would make the panel look source-free when it is not,
  // which is a worse lie than showing three sources instead of four.
  evidence: z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items.flatMap((item) => {
        const parsed = evidenceItemInputSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      }).slice(0, 8),
    ),
  risks: z.array(z.string()).max(4).optional().catch([]),
  resolution_ambiguity: z.enum(['low', 'medium', 'high']).catch('high'),
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
