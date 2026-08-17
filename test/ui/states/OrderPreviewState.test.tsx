/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  asFeeRate,
  asPrice,
  asShares,
  asUsdc,
  type FeeConfig,
  type Market,
  type MarketOutcome,
  type OrderBook,
} from '@/domain';
import { walkBookByBudget } from '@/simulation';
import { formatUsdc } from '@/ui/format';
import { OrderPreviewState } from '@/ui/states/OrderPreviewState';

const TOKEN_ID = '71234567890123456789012345678901234567890123456789012345678901234567890123';

function buildOutcome(overrides: Partial<MarketOutcome> = {}): MarketOutcome {
  return { label: 'Yes', tokenId: TOKEN_ID, indicativePrice: asPrice(0.6), ...overrides };
}

function buildMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: 'market-1',
    slug: 'will-x-happen',
    conditionId: 'cond-1',
    question: 'Will X happen?',
    description: 'A test market.',
    resolutionSource: null,
    resolutionCriteria: 'Resolves YES if X happens by the close date.',
    outcomes: [buildOutcome(), buildOutcome({ label: 'No', tokenId: `${TOKEN_ID}0`, indicativePrice: asPrice(0.4) })],
    negRisk: false,
    acceptingOrders: true,
    closed: false,
    active: true,
    endDate: '2026-12-31T00:00:00.000Z',
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    fees: buildFeeConfig(),
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

function buildFeeConfig(overrides: Partial<FeeConfig> = {}): FeeConfig {
  return {
    enabled: true,
    takerRate: asFeeRate(0.02),
    makerRate: asFeeRate(0),
    displayLabel: 'Politics · 2% taker rate',
    source: 'market-object',
    estimated: false,
    ...overrides,
  } as FeeConfig;
}

function buildBook(overrides: Partial<OrderBook> = {}): OrderBook {
  return {
    tokenId: TOKEN_ID,
    bids: [{ price: asPrice(0.59), size: asShares(100) }],
    asks: [
      { price: asPrice(0.6), size: asShares(100) },
      { price: asPrice(0.65), size: asShares(100) },
    ],
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    negRisk: false,
    lastTradePrice: asPrice(0.6),
    fetchedAt: Date.now(),
    upstreamTimestamp: '1786000000',
    ...overrides,
  };
}

function mockFetchBook(book: OrderBook) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ data: book, meta: { fetchedAt: Date.now(), stale: false, cached: false } }), {
        status: 200,
      }),
    ),
  );
}

describe('OrderPreviewState', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders preview numbers that match walkBook/computeFee exactly for the fetched book', async () => {
    const market = buildMarket();
    const book = buildBook();
    mockFetchBook(book);

    render(<OrderPreviewState market={market} outcome={buildOutcome()} onConfirm={vi.fn()} onBack={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByRole('spinbutton'), '90');

    const expected = walkBookByBudget(book, { usdc: asUsdc(90) }, market.fees);

    await waitFor(() => {
      expect(screen.getByText(formatUsdc(expected.totalCost))).toBeTruthy();
    });
    expect(screen.getByText(formatUsdc(expected.fee))).toBeTruthy();
    // This $90 request crosses two book levels, so the price-impact row must be visible.
    expect(expected.priceImpact).not.toEqual(asPrice(0));
  });

  it('hides the avg-price impact row when the fill is entirely at top of book', async () => {
    const market = buildMarket();
    const book = buildBook();
    mockFetchBook(book);

    render(<OrderPreviewState market={market} outcome={buildOutcome()} onConfirm={vi.fn()} onBack={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('spinbutton'), '30');

    await waitFor(() => {
      expect(screen.getByText(formatUsdc(walkBookByBudget(book, { usdc: asUsdc(30) }, market.fees).totalCost))).toBeTruthy();
    });

    expect(screen.queryByText('Avg. price')).toBeNull();
  });

  it('labels the fee "estimated" when FeeConfig.source is category-fallback', async () => {
    const market = buildMarket({ fees: buildFeeConfig({ source: 'category-fallback', estimated: true }) });
    mockFetchBook(buildBook());

    render(<OrderPreviewState market={market} outcome={buildOutcome()} onConfirm={vi.fn()} onBack={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('spinbutton'), '30');

    await waitFor(() => {
      expect(screen.getByText(/estimated/)).toBeTruthy();
    });
  });

  it('never shows a bare $0.00 fee line when the market genuinely charges nothing (zero is a fact, not an omission)', async () => {
    const market = buildMarket({ fees: buildFeeConfig({ takerRate: asFeeRate(0), displayLabel: 'Geopolitics · 0% taker rate' }) });
    mockFetchBook(buildBook());

    render(<OrderPreviewState market={market} outcome={buildOutcome()} onConfirm={vi.fn()} onBack={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('spinbutton'), '30');

    await waitFor(() => {
      expect(screen.getByText('$0.00')).toBeTruthy();
    });
    expect(screen.getByText(/Geopolitics/)).toBeTruthy();
  });

  it('caps the fill and disables the CTA, naming the max fillable shares, when the request exceeds book depth', async () => {
    const market = buildMarket();
    const book = buildBook();
    mockFetchBook(book);

    render(<OrderPreviewState market={market} outcome={buildOutcome()} onConfirm={vi.fn()} onBack={vi.fn()} />);
    const user = userEvent.setup();

    // Total depth across both levels is 200 shares.
    await user.click(screen.getByRole('button', { name: 'shares' }));
    await user.type(screen.getByRole('spinbutton'), '500');

    const cta = await screen.findByRole('button', { name: /Only 200 shares available at this price/ });
    expect((cta as HTMLButtonElement).disabled).toBe(true);
  });

  it('is terminal when the market is not accepting orders: ticket disabled, CTA explains why', async () => {
    const market = buildMarket({ acceptingOrders: false });
    mockFetchBook(buildBook());

    render(<OrderPreviewState market={market} outcome={buildOutcome()} onConfirm={vi.fn()} onBack={vi.fn()} />);

    const cta = screen.getByRole('button', { name: 'Market is not accepting orders' });
    expect((cta as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('spinbutton') as HTMLInputElement).disabled).toBe(true);

    // Let the in-flight book fetch settle before the test tears down, so its
    // resulting state update isn't reported as happening outside of `act`.
    await screen.findByText(/Book updated/);
  });

  it('shows the last traded price, not top of book, when the spread is wider than $0.10', async () => {
    const market = buildMarket();
    const book = buildBook({
      bids: [{ price: asPrice(0.3), size: asShares(100) }],
      asks: [
        { price: asPrice(0.6), size: asShares(50) },
        { price: asPrice(0.65), size: asShares(100) },
      ],
      lastTradePrice: asPrice(0.62),
    });
    mockFetchBook(book);

    render(<OrderPreviewState market={market} outcome={buildOutcome()} onConfirm={vi.fn()} onBack={vi.fn()} />);
    const user = userEvent.setup();
    // $60 crosses from the first level (50 * 0.60 = $30) into the second, so the impact row renders.
    await user.type(screen.getByRole('spinbutton'), '60');

    await waitFor(() => {
      expect(screen.getByText(/last trade 62\.0c/)).toBeTruthy();
    });
  });

  it('requires two presses of the CTA — Review bet, then Place simulated bet — before confirming', async () => {
    const market = buildMarket();
    const book = buildBook();
    mockFetchBook(book);
    const onConfirm = vi.fn();

    render(<OrderPreviewState market={market} outcome={buildOutcome()} onConfirm={onConfirm} onBack={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('spinbutton'), '30');

    const reviewButton = await screen.findByRole('button', { name: 'Review bet' });
    await user.click(reviewButton);

    const placeButton = await screen.findByRole('button', { name: 'Place simulated bet' });
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(placeButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
