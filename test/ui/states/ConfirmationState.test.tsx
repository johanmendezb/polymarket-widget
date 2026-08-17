/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  asFeeRate,
  asPrice,
  asShares,
  asUsdc,
  type FillEstimate,
  type Market,
  type MarketOutcome,
} from '@/domain';
import { PositionsProvider } from '@/ui/hooks/usePositions';
import { formatPriceCents, formatShares, formatUsdc } from '@/ui/format';
import { ConfirmationState } from '@/ui/states/ConfirmationState';

const outcome: MarketOutcome = {
  label: 'Yes',
  tokenId: '71234567890123456789012345678901234567890123456789012345678901234567890123',
  indicativePrice: asPrice(0.6),
};

const market: Market = {
  id: 'm-1',
  slug: 'will-x-happen',
  conditionId: 'cond-1',
  question: 'Will X happen?',
  description: '',
  resolutionSource: null,
  resolutionCriteria: null,
  outcomes: [outcome],
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

const fill: FillEstimate = {
  requested: { kind: 'usdc', value: asUsdc(25) },
  legs: [{ price: asPrice(0.62), shares: asShares(40) }],
  sharesFilled: asShares(40),
  averagePrice: asPrice(0.62),
  topOfBookPrice: asPrice(0.62),
  priceImpact: asPrice(0),
  grossCost: asUsdc(24.8),
  fee: asUsdc(0.37696),
  totalCost: asUsdc(25.17696),
  payoutIfWin: asUsdc(40),
  netProfitIfWin: asUsdc(14.82304),
  partial: false,
  maxFillableShares: asShares(40),
  bookFetchedAt: 1755300000000,
};

describe('ConfirmationState', () => {
  it('restates the exact preview numbers — byte-identical, no recomputation', () => {
    render(
      <PositionsProvider>
        <ConfirmationState market={market} outcome={outcome} fill={fill} onBackToMarkets={() => {}} />
      </PositionsProvider>,
    );

    expect(screen.getByText(formatShares(40))).toBeTruthy();
    expect(screen.getByText(formatPriceCents(fill.averagePrice))).toBeTruthy();
    expect(screen.getByText(formatUsdc(fill.fee))).toBeTruthy();
    expect(screen.getByText(formatUsdc(fill.totalCost))).toBeTruthy();
    expect(screen.getByText(formatUsdc(fill.payoutIfWin))).toBeTruthy();
  });

  it('shows "Simulated" at the point of commitment, not only in a footer', () => {
    render(
      <PositionsProvider>
        <ConfirmationState market={market} outcome={outcome} fill={fill} onBackToMarkets={() => {}} />
      </PositionsProvider>,
    );

    const badge = screen.getByRole('status');
    expect(badge.textContent).toMatch(/Simulated/);
  });

  it('notes the position list is in-memory and resets on reload', () => {
    render(
      <PositionsProvider>
        <ConfirmationState market={market} outcome={outcome} fill={fill} onBackToMarkets={() => {}} />
      </PositionsProvider>,
    );

    expect(screen.getByText(/resets when the page reloads/)).toBeTruthy();
  });
});
