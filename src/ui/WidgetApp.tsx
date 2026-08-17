'use client';

import { useState } from 'react';

import type { FillEstimate, Market, MarketOutcome, SimulatedPosition } from '@/domain';

import { PositionsProvider, usePositions } from './hooks/usePositions';
import { ConfirmationState } from './states/ConfirmationState';
import { MarketDetailState } from './states/MarketDetailState';
import { OrderPreviewState } from './states/OrderPreviewState';
import { SearchState } from './states/SearchState';

type View = 'search' | 'detail' | 'preview' | 'confirmation';

function newPositionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function WidgetAppInner() {
  const { addPosition } = usePositions();

  const [view, setView] = useState<View>('search');
  const [query, setQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<MarketOutcome | null>(null);
  const [confirmedFill, setConfirmedFill] = useState<FillEstimate | null>(null);

  const backToSearch = () => {
    setView('search');
    setSelectedMarket(null);
    setSelectedOutcome(null);
    setConfirmedFill(null);
  };

  if (view === 'search') {
    return (
      <SearchState
        query={query}
        onQueryChange={setQuery}
        onSelectMarket={(market) => {
          setSelectedMarket(market);
          setView('detail');
        }}
      />
    );
  }

  if (view === 'detail' && selectedMarket !== null) {
    return (
      <MarketDetailState
        marketId={selectedMarket.id}
        onBack={() => {
          setView('search');
        }}
        onSelectOutcome={(market, outcome) => {
          setSelectedMarket(market);
          setSelectedOutcome(outcome);
          setView('preview');
        }}
      />
    );
  }

  if (view === 'preview' && selectedMarket !== null && selectedOutcome !== null) {
    return (
      <OrderPreviewState
        market={selectedMarket}
        outcome={selectedOutcome}
        onBack={() => {
          setView('detail');
        }}
        onConfirm={(fill) => {
          const position: SimulatedPosition = {
            id: newPositionId(),
            marketId: selectedMarket.id,
            marketQuestion: selectedMarket.question,
            outcomeLabel: selectedOutcome.label,
            tokenId: selectedOutcome.tokenId,
            shares: fill.sharesFilled,
            entryAveragePrice: fill.averagePrice,
            feePaid: fill.fee,
            totalCost: fill.totalCost,
            payoutIfWin: fill.payoutIfWin,
            createdAt: Date.now(),
            simulated: true,
          };
          addPosition(position);
          setConfirmedFill(fill);
          setView('confirmation');
        }}
      />
    );
  }

  if (view === 'confirmation' && selectedMarket !== null && selectedOutcome !== null && confirmedFill !== null) {
    return (
      <ConfirmationState
        market={selectedMarket}
        outcome={selectedOutcome}
        fill={confirmedFill}
        onBackToMarkets={backToSearch}
      />
    );
  }

  // Defensive fallback: an inconsistent combination of view/selection state (should be
  // unreachable through the UI) always recovers to the golden path's entry point rather
  // than rendering nothing.
  return (
    <SearchState
      query={query}
      onQueryChange={setQuery}
      onSelectMarket={(market) => {
        setSelectedMarket(market);
        setView('detail');
      }}
    />
  );
}

/** The widget's state machine: search -> detail -> preview -> confirmation. */
export function WidgetApp() {
  return (
    <PositionsProvider>
      <WidgetAppInner />
    </PositionsProvider>
  );
}
