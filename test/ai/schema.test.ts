import { describe, expect, it } from 'vitest';

import { parseSubmitForecastToolInput } from '@/ai';
import { probabilityValue } from '@/domain';

function validRawInput(overrides: Record<string, unknown> = {}): unknown {
  return {
    probability: 0.63,
    reasoning_summary: 'Base rate plus one dated source.',
    evidence: [
      {
        claim: 'The event has not occurred as of the source date.',
        source_url: 'https://example.com/article',
        source_title: 'Example Article',
        published_at: '2026-08-01',
        supports: 'no',
      },
    ],
    risks: ['A late development could reverse this.'],
    resolution_ambiguity: 'low',
    insufficient_evidence: false,
    ...overrides,
  };
}

describe('parseSubmitForecastToolInput', () => {
  it('parses a well-formed tool input into camelCase domain shape', () => {
    const sample = parseSubmitForecastToolInput(validRawInput());

    expect(probabilityValue(sample.probability)).toBe(0.63);
    expect(sample.reasoningSummary).toBe('Base rate plus one dated source.');
    expect(sample.evidence).toEqual([
      {
        claim: 'The event has not occurred as of the source date.',
        sourceUrl: 'https://example.com/article',
        sourceTitle: 'Example Article',
        publishedAt: '2026-08-01',
        supports: 'no',
      },
    ]);
    expect(sample.risks).toEqual(['A late development could reverse this.']);
    expect(sample.resolutionAmbiguity).toBe('low');
    expect(sample.insufficientEvidence).toBe(false);
  });

  it('defaults risks to an empty array when omitted (it is optional in the schema)', () => {
    const raw = validRawInput();
    delete (raw as Record<string, unknown>).risks;

    const sample = parseSubmitForecastToolInput(raw);

    expect(sample.risks).toEqual([]);
  });

  it('treats a null published_at as undated, not a violation', () => {
    const raw = validRawInput({
      evidence: [
        {
          claim: 'An undated claim.',
          source_url: 'https://example.com/undated',
          source_title: 'Undated Source',
          published_at: null,
          supports: 'context',
        },
      ],
    });

    const sample = parseSubmitForecastToolInput(raw);

    expect(sample.evidence[0]?.publishedAt).toBeNull();
  });

  it('rejects an out-of-range probability', () => {
    expect(() => parseSubmitForecastToolInput(validRawInput({ probability: 1.4 }))).toThrow();
  });

  it('rejects a missing required field', () => {
    const raw = validRawInput();
    delete (raw as Record<string, unknown>).resolution_ambiguity;

    expect(() => parseSubmitForecastToolInput(raw)).toThrow();
  });

  it('rejects an invalid supports enum value', () => {
    const raw = validRawInput({
      evidence: [
        {
          claim: 'x',
          source_url: 'https://example.com',
          source_title: 'x',
          supports: 'maybe',
        },
      ],
    });

    expect(() => parseSubmitForecastToolInput(raw)).toThrow();
  });

  describe('insufficient_evidence is a valid answer, not an error', () => {
    it('parses successfully when insufficient_evidence is true alongside a probability', () => {
      const raw = validRawInput({
        probability: 0.5,
        evidence: [],
        insufficient_evidence: true,
      });

      const sample = parseSubmitForecastToolInput(raw);

      expect(sample.insufficientEvidence).toBe(true);
      expect(probabilityValue(sample.probability)).toBe(0.5);
    });
  });
});
