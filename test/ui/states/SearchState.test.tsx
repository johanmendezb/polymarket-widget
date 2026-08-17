/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asFeeRate, asPrice, asUsdc, type Market } from '@/domain';
import { SearchState } from '@/ui/states/SearchState';

function buildMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: 'm-1',
    slug: 'will-x-happen',
    conditionId: 'cond-1',
    question: 'Will X happen?',
    description: '',
    resolutionSource: null,
    resolutionCriteria: null,
    outcomes: [
      { label: 'Yes', tokenId: '71234567890123456789012345678901234567890123456789012345678901234567890123', indicativePrice: asPrice(0.6) },
      { label: 'No', tokenId: '71234567890123456789012345678901234567890123456789012345678901234567890124', indicativePrice: asPrice(0.4) },
    ],
    negRisk: false,
    acceptingOrders: true,
    closed: false,
    active: true,
    endDate: '2026-12-31T00:00:00.000Z',
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    fees: {
      enabled: true,
      takerRate: asFeeRate(0.02),
      makerRate: asFeeRate(0),
      displayLabel: 'Politics · 2% taker rate',
      source: 'market-object',
      estimated: false,
    },
    liquidityUsd: 10000,
    volume24hUsd: 5000,
    bestBid: asPrice(0.59),
    bestAsk: asPrice(0.6),
    spread: asPrice(0.01),
    lastTradePrice: asPrice(0.6),
    eventId: null,
    eventTitle: null,
    category: 'Politics',
    ...overrides,
  };
}

function mockSearchFetch(handler: (url: string) => { markets: readonly Market[] } | 'error') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const result = handler(url);
      if (result === 'error') {
        return new Response(JSON.stringify({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'down', retryable: true } }), {
          status: 502,
        });
      }
      return new Response(
        JSON.stringify({ data: { markets: result.markets, hasMore: false }, meta: { fetchedAt: Date.now(), stale: false, cached: false } }),
        { status: 200 },
      );
    }),
  );
}

describe('SearchState', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows trending markets on an empty query, not a blank panel', async () => {
    const trending = buildMarket({ id: 'trending-1', question: 'Will the trending market resolve YES?' });
    mockSearchFetch(() => ({ markets: [trending] }));

    render(<SearchState query="" onQueryChange={vi.fn()} onSelectMarket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Trending')).toBeTruthy();
    });
    expect(screen.getByText('Will the trending market resolve YES?')).toBeTruthy();
  });

  it('treats no results as our failure: offers a refinement hint and category chips, never a bare message', async () => {
    mockSearchFetch(() => ({ markets: [] }));

    render(<SearchState query="zzzzznomatch" onQueryChange={vi.fn()} onSelectMarket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/couldn’t find a match/)).toBeTruthy();
    });
    expect(screen.getAllByRole('button', { name: 'Trending' }).length).toBeGreaterThan(0);
  });

  it('on a retryable error, keeps the last-known results visible under a staleness badge', async () => {
    const onQueryChange = vi.fn();
    let shouldFail = false;
    const market = buildMarket({ id: 'm-good', question: 'A market that loaded fine' });
    mockSearchFetch(() => (shouldFail ? 'error' : { markets: [market] }));

    const { rerender } = render(<SearchState query="election" onQueryChange={onQueryChange} onSelectMarket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('A market that loaded fine')).toBeTruthy();
    });

    shouldFail = true;
    rerender(<SearchState query="election2" onQueryChange={onQueryChange} onSelectMarket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Showing last known results/)).toBeTruthy();
    });
    // The stale result is still visible underneath the badge.
    expect(screen.getByText('A market that loaded fine')).toBeTruthy();
  });

  it('is keyboard-completable: ArrowDown then Enter selects the first result with one tab stop for the whole list', async () => {
    const market = buildMarket({ id: 'm-keyboard', question: 'Selected via the keyboard' });
    mockSearchFetch(() => ({ markets: [market] }));
    const onSelectMarket = vi.fn();

    render(<SearchState query="election" onQueryChange={vi.fn()} onSelectMarket={onSelectMarket} />);

    await waitFor(() => {
      expect(screen.getByText('Selected via the keyboard')).toBeTruthy();
    });

    const input = screen.getByRole('combobox');
    const user = userEvent.setup();
    input.focus();
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelectMarket).toHaveBeenCalledWith(market);

    const options = screen.getAllByRole('option');
    for (const option of options) {
      expect(option.getAttribute('tabindex')).toBe('-1');
    }
  });
});
