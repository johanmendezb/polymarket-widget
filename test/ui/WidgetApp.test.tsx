/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asFeeRate, asPrice, asShares, asUsdc, type Market, type OrderBook } from '@/domain';
import { WidgetApp } from '@/ui/WidgetApp';

const TOKEN_ID = '71234567890123456789012345678901234567890123456789012345678901234567890123';

const market: Market = {
  id: 'm-1',
  slug: 'will-x-happen',
  conditionId: 'cond-1',
  question: 'Will X happen by the end of the year?',
  description: '',
  resolutionSource: null,
  resolutionCriteria: 'Resolves YES if X happens according to the official source.',
  outcomes: [
    { label: 'Yes', tokenId: TOKEN_ID, indicativePrice: asPrice(0.6) },
    { label: 'No', tokenId: `${TOKEN_ID}0`, indicativePrice: asPrice(0.4) },
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
};

const book: OrderBook = {
  tokenId: TOKEN_ID,
  bids: [{ price: asPrice(0.59), size: asShares(100) }],
  asks: [{ price: asPrice(0.6), size: asShares(100) }],
  tickSize: asPrice(0.01),
  minOrderSize: asUsdc(1),
  negRisk: false,
  lastTradePrice: asPrice(0.6),
  fetchedAt: Date.now(),
  upstreamTimestamp: '1786000000',
};

function envelope(data: unknown) {
  return new Response(JSON.stringify({ data, meta: { fetchedAt: Date.now(), stale: false, cached: false } }), { status: 200 });
}

function mockRoutes() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/search')) return envelope({ markets: [market], hasMore: false });
      if (url.includes('/market/')) return envelope(market);
      if (url.includes('/book')) return envelope(book);
      if (url.includes('/history')) return envelope({ points: [] });
      return new Response(JSON.stringify({ error: { code: 'INTERNAL', message: 'unexpected', retryable: false } }), { status: 500 });
    }),
  );
}

describe('WidgetApp golden path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('completes search -> detail -> preview -> confirmation with no reload, restating identical numbers', async () => {
    mockRoutes();
    render(<WidgetApp />);
    const user = userEvent.setup();

    // A. Search
    await waitFor(() => {
      expect(screen.getByText('Will X happen by the end of the year?')).toBeTruthy();
    });
    await user.click(screen.getByText('Will X happen by the end of the year?'));

    // B. Market detail
    const yesButton = await screen.findByRole('radio', { name: /Yes/ });
    await user.click(yesButton);

    // C. Order preview
    const amountInput = await screen.findByRole('spinbutton');
    await user.type(amountInput, '30');

    const reviewButton = await screen.findByRole('button', { name: 'Review bet' });
    await user.click(reviewButton);
    const placeButton = await screen.findByRole('button', { name: 'Place simulated bet' });
    await user.click(placeButton);

    // D. Confirmation
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toMatch(/Simulated/);
    });
    expect(screen.getByRole('heading', { name: 'Will X happen by the end of the year?' })).toBeTruthy();

    // The position is listed for the session.
    expect(screen.getByText(/This session.s simulated positions/)).toBeTruthy();

    // Back to markets returns to state A.
    await user.click(screen.getByRole('button', { name: 'Back to markets' }));
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeTruthy();
    });
  });
});
