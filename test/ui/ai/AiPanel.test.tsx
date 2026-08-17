/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asProbability, type Recommendation } from '@/domain';
import { AiPanel } from '@/ui/ai/AiPanel';
import { sampleRecommendation } from '@/ui/fixtures';

function mockFetchRouter(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

function envelope(data: Recommendation) {
  return { data, meta: { fetchedAt: Date.now(), stale: false, cached: false } };
}

describe('AiPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is collapsed by default and never calls the forecast route on render', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(<AiPanel marketId="m-1" tokenId="t-1" outcomeLabel="Yes" />);

    const toggle = screen.getByRole('button', { name: 'Get a second opinion' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('renders sources before the estimate, and shows full provenance, on a CONSIDER verdict', async () => {
    mockFetchRouter(envelope(sampleRecommendation));

    render(<AiPanel marketId="m-1" tokenId="t-1" outcomeLabel="Yes" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Get a second opinion' }));

    await waitFor(() => {
      expect(screen.getByText('Consider')).toBeTruthy();
    });

    // Sources render before the estimate — the three-registers acceptance criterion.
    const html = document.body.innerHTML;
    const sourcesIndex = html.indexOf('Example Polling Tracker');
    const estimateIndex = html.indexOf('AI estimate');
    expect(sourcesIndex).toBeGreaterThan(-1);
    expect(estimateIndex).toBeGreaterThan(sourcesIndex);

    // The undated source is labelled, not silently dropped.
    expect(screen.getByText('undated')).toBeTruthy();

    // Provenance: timestamp, model id, prompt version, k, dispersion, blend weight.
    expect(screen.getByText('claude-opus-5')).toBeTruthy();
    expect(screen.getByText('blind-v1')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy(); // k
    expect(screen.getByText(/log-odds IQR/)).toBeTruthy();
    expect(screen.getByText('35%')).toBeTruthy(); // blend weight
  });

  it('shows the gate reason codes, each with its justification one click away, on NO_BET', async () => {
    const noBet: Recommendation = {
      ...sampleRecommendation,
      verdict: 'NO_BET',
      reasons: ['SPREAD_TOO_WIDE', 'THIN_EVIDENCE'],
      suggestedFractionOfBankroll: null,
    };
    mockFetchRouter(envelope(noBet));

    render(<AiPanel marketId="m-1" tokenId="t-1" outcomeLabel="Yes" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Get a second opinion' }));

    await waitFor(() => {
      expect(screen.getByText('No bet')).toBeTruthy();
    });

    const spreadSummary = screen.getByText('Spread too wide');
    const spreadDetails = spreadSummary.closest('details');
    expect(spreadDetails?.open).toBe(false);

    await user.click(spreadSummary);
    expect(spreadDetails?.open).toBe(true);
    expect(screen.getByText(/quoted spread exceeds the claimed edge/)).toBeTruthy();
    expect(screen.getByText('Thin evidence')).toBeTruthy();
  });

  it('shows the blind-vs-anchored warning when the delta is near zero', async () => {
    const echoing: Recommendation = {
      ...sampleRecommendation,
      forecast: {
        ...sampleRecommendation.forecast,
        blindProbability: asProbability(0.6),
        anchoredProbability: asProbability(0.601),
      },
    };
    mockFetchRouter(envelope(echoing));

    render(<AiPanel marketId="m-1" tokenId="t-1" outcomeLabel="Yes" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Get a second opinion' }));

    await waitFor(() => {
      expect(screen.getByText(/barely moved/)).toBeTruthy();
    });
  });

  it('does not show the anchoring warning when the delta is large', async () => {
    const notEchoing: Recommendation = {
      ...sampleRecommendation,
      forecast: {
        ...sampleRecommendation.forecast,
        blindProbability: asProbability(0.4),
        anchoredProbability: asProbability(0.75),
      },
    };
    mockFetchRouter(envelope(notEchoing));

    render(<AiPanel marketId="m-1" tokenId="t-1" outcomeLabel="Yes" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Get a second opinion' }));

    await waitFor(() => {
      expect(screen.getByText('Consider')).toBeTruthy();
    });
    expect(screen.queryByText(/barely moved/)).toBeNull();
  });

  it('renders AI_NO_EVIDENCE as an explicit result, not error styling', async () => {
    mockFetchRouter({ error: { code: 'AI_NO_EVIDENCE', message: 'I could not find sources I trust for this question.', retryable: false } }, 200);

    render(<AiPanel marketId="m-1" tokenId="t-1" outcomeLabel="Yes" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Get a second opinion' }));

    await waitFor(() => {
      expect(screen.getByText('I could not find sources I trust for this question.')).toBeTruthy();
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders AI_TIMEOUT distinctly, with a retry, and never throws', async () => {
    mockFetchRouter({ error: { code: 'AI_TIMEOUT', message: 'timed out', retryable: true } }, 504);

    render(<AiPanel marketId="m-1" tokenId="t-1" outcomeLabel="Yes" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Get a second opinion' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
    expect(screen.getByText(/didn't respond in time/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('renders AI_INVALID_OUTPUT with distinct copy from AI_TIMEOUT', async () => {
    mockFetchRouter({ error: { code: 'AI_INVALID_OUTPUT', message: 'bad schema', retryable: false } }, 502);

    render(<AiPanel marketId="m-1" tokenId="t-1" outcomeLabel="Yes" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Get a second opinion' }));

    await waitFor(() => {
      expect(screen.getByText(/didn't match the expected format/)).toBeTruthy();
    });
  });

  it('never claims the system beats or should be trusted over the market', async () => {
    mockFetchRouter(envelope(sampleRecommendation));

    render(<AiPanel marketId="m-1" tokenId="t-1" outcomeLabel="Yes" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Get a second opinion' }));

    await waitFor(() => {
      expect(screen.getByText('Consider')).toBeTruthy();
    });

    const text = document.body.textContent ?? '';
    expect(text.toLowerCase()).not.toMatch(/beats? the market/);
    expect(text.toLowerCase()).not.toMatch(/more accurate than the market/);
  });
});
