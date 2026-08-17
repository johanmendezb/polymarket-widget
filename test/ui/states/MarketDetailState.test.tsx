/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asFeeRate, asPrice, asUsdc, type Market } from '@/domain';
import { MarketDetailState } from '@/ui/states/MarketDetailState';

function buildOutcome(label: string, tokenIdSuffix: string, price: number) {
  return {
    label,
    tokenId: `7123456789012345678901234567890123456789012345678901234567890123456789${tokenIdSuffix}`,
    indicativePrice: asPrice(price),
  };
}

function buildMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: 'm-1',
    slug: 'will-x-happen',
    conditionId: 'cond-1',
    question: 'Will X happen?',
    description: '',
    resolutionSource: null,
    resolutionCriteria: 'Resolves YES if X happens according to the official source.',
    outcomes: [buildOutcome('Yes', '01', 0.6), buildOutcome('No', '02', 0.4)],
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

function mockFetchRouter(market: Market | 'error') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/history')) {
        return new Response(JSON.stringify({ data: { points: [] }, meta: { fetchedAt: Date.now(), stale: false, cached: false } }), {
          status: 200,
        });
      }
      if (url.includes('/market/')) {
        if (market === 'error') {
          return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'gone', retryable: false } }), { status: 404 });
        }
        return new Response(JSON.stringify({ data: market, meta: { fetchedAt: Date.now(), stale: false, cached: false } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ error: { code: 'INTERNAL', message: 'unexpected', retryable: false } }), { status: 500 });
    }),
  );
}

describe('MarketDetailState', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows an error with retry when the market fails to load, never a blank panel', async () => {
    mockFetchRouter('error');

    render(<MarketDetailState marketId="m-1" onBack={vi.fn()} onSelectOutcome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('shows the negRisk badge when only one outcome in the group can resolve YES', async () => {
    mockFetchRouter(buildMarket({ negRisk: true }));

    render(<MarketDetailState marketId="m-1" onBack={vi.fn()} onSelectOutcome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Only one outcome in this group can resolve YES/)).toBeTruthy();
    });
  });

  it('shows the last traded price, not the midpoint, when the spread is wider than $0.10', async () => {
    mockFetchRouter(
      buildMarket({
        bestBid: asPrice(0.3),
        bestAsk: asPrice(0.6),
        spread: asPrice(0.3),
        lastTradePrice: asPrice(0.42),
      }),
    );

    render(<MarketDetailState marketId="m-1" onBack={vi.fn()} onSelectOutcome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('42.0%')).toBeTruthy();
    });
    expect(screen.getByText(/Spread is wider than 10c/)).toBeTruthy();
  });

  it('renders a multi-outcome market as proportional bars, not a dropdown', async () => {
    mockFetchRouter(
      buildMarket({
        outcomes: [buildOutcome('Alpha', '01', 0.5), buildOutcome('Beta', '02', 0.3), buildOutcome('Gamma', '03', 0.2)],
      }),
    );

    render(<MarketDetailState marketId="m-1" onBack={vi.fn()} onSelectOutcome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('reaches the resolution criteria in one interaction', async () => {
    mockFetchRouter(buildMarket());

    render(<MarketDetailState marketId="m-1" onBack={vi.fn()} onSelectOutcome={vi.fn()} />);

    const toggle = await screen.findByRole('button', { name: 'How this market resolves' });
    expect(screen.queryByText(/Resolves YES if X happens/)).toBeNull();

    const user = userEvent.setup();
    await user.click(toggle);

    expect(screen.getByText(/Resolves YES if X happens/)).toBeTruthy();
  });

  it('the AI panel is an inert placeholder: opening it makes no network call and never fires automatically', async () => {
    mockFetchRouter(buildMarket());
    render(<MarketDetailState marketId="m-1" onBack={vi.fn()} onSelectOutcome={vi.fn()} />);

    const toggle = await screen.findByRole('button', { name: 'Get a second opinion' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    const fetchSpy = vi.mocked(global.fetch);
    const callsBefore = fetchSpy.mock.calls.length;

    const user = userEvent.setup();
    await user.click(toggle);

    expect(screen.getByText(/coming in a future update/)).toBeTruthy();
    expect(fetchSpy.mock.calls.length).toBe(callsBefore);
  });

  it('selecting an outcome calls onSelectOutcome with the market and the chosen outcome', async () => {
    const market = buildMarket();
    mockFetchRouter(market);
    const onSelectOutcome = vi.fn();

    render(<MarketDetailState marketId="m-1" onBack={vi.fn()} onSelectOutcome={onSelectOutcome} />);

    const yesButton = await screen.findByRole('radio', { name: /Yes/ });
    const user = userEvent.setup();
    await user.click(yesButton);

    expect(onSelectOutcome).toHaveBeenCalledWith(market, market.outcomes[0]);
  });
});
