'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { asPrice, priceValue, sharesValue, type Market, type MarketOutcome, type Price } from '@/domain';

import { useBook } from '../hooks/useBook';
import { useHistory } from '../hooks/useHistory';
import { useMarket } from '../hooks/useMarket';
import { useNow } from '../hooks/useNow';
import { formatCloseDate, formatFreshness, formatPercent, formatPriceCents, formatShares } from '../format';
import styles from './MarketDetailState.module.css';

export interface MarketDetailStateProps {
  readonly marketId: string;
  readonly onBack: () => void;
  readonly onSelectOutcome: (market: Market, outcome: MarketOutcome) => void;
}

/** Spread wider than this shows the last trade price instead of the midpoint — polymarket-domain skill. */
const WIDE_SPREAD_THRESHOLD = 0.1;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function midpointOf(market: Market): Price | null {
  if (market.bestBid === null || market.bestAsk === null) return null;
  return asPrice(clamp01((priceValue(market.bestBid) + priceValue(market.bestAsk)) / 2));
}

function Sparkline({ tokenId }: { readonly tokenId: string }) {
  const { status, points } = useHistory(tokenId);
  if (status !== 'success' || points.length < 2) return null;

  const prices = points.map((p) => p.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const width = 200;
  const height = 32;
  const coords = points
    .map((point, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((point.p - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className={styles.sparkline} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Price over the last week">
      <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function MarketDetailState({ marketId, onBack, onSelectOutcome }: MarketDetailStateProps) {
  const { market, status, fetchedAt, error, retry } = useMarket(marketId);
  const now = useNow();

  const [activeIndex, setActiveIndex] = useState(0);
  const [showResolution, setShowResolution] = useState(false);
  const [showOrderBook, setShowOrderBook] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const prevPriceRef = useRef<number | null>(null);

  const bookTokenId = showOrderBook ? (market?.outcomes[activeIndex]?.tokenId ?? null) : null;
  const { book: disclosureBook, status: disclosureBookStatus } = useBook(bookTokenId, { pollMs: null });

  const wideSpread = market !== null && market.spread !== null && priceValue(market.spread) > WIDE_SPREAD_THRESHOLD;
  const displayPrice = market === null ? null : wideSpread ? market.lastTradePrice : (midpointOf(market) ?? market.outcomes[activeIndex]?.indicativePrice ?? null);

  useEffect(() => {
    if (displayPrice === null) return;
    const value = priceValue(displayPrice);
    if (prevPriceRef.current !== null && prevPriceRef.current !== value) {
      setPulsing(true);
      const timer = setTimeout(() => {
        setPulsing(false);
      }, 250);
      prevPriceRef.current = value;
      return () => {
        clearTimeout(timer);
      };
    }
    prevPriceRef.current = value;
  }, [displayPrice]);

  if (status === 'loading' && market === null) {
    return (
      <div className={styles.root}>
        <div className={styles.skeletonBlock} style={{ height: 28, width: '80%' }} />
        <div className={styles.skeletonBlock} style={{ height: 56, width: '50%' }} />
        <div className={styles.skeletonBlock} style={{ height: 80, width: '100%' }} />
      </div>
    );
  }

  if (status === 'error' && market === null) {
    return (
      <div className={styles.root}>
        <button type="button" className={styles.backLink} onClick={onBack}>
          ← Back
        </button>
        <div className={styles.errorPanel} role="alert">
          <p>{error?.message ?? 'This market could not be loaded.'}</p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (market === null) return null;

  const outcomes = market.outcomes;
  const isBinary = outcomes.length === 2;

  const selectOutcome = (index: number) => {
    const outcome = outcomes[index];
    if (outcome) onSelectOutcome(market, outcome);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (outcomes.length === 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, outcomes.length - 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOutcome(activeIndex);
    }
  };

  return (
    <div className={styles.root}>
      <button type="button" className={styles.backLink} onClick={onBack}>
        ← Back
      </button>

      {status === 'error' ? (
        <p className={styles.staleBadge} role="status">
          Live updates paused — showing the last known data.
        </p>
      ) : null}

      <h2 className={styles.question}>{market.question}</h2>

      {market.negRisk ? (
        <p className={styles.negRiskBadge}>Only one outcome in this group can resolve YES</p>
      ) : null}

      <div className={styles.priceBlock}>
        <span className={pulsing ? `${styles.probability} ${styles.pulsing}` : styles.probability}>
          {displayPrice !== null ? formatPercent(priceValue(displayPrice)) : '—'}
        </span>
        <span className={styles.priceCents}>{displayPrice !== null ? formatPriceCents(displayPrice) : ''}</span>
      </div>

      {fetchedAt !== null ? <p className={styles.freshness}>{formatFreshness(fetchedAt, now)}</p> : null}

      {wideSpread ? (
        <p className={styles.wideSpreadNotice}>
          Spread is wider than 10c, so the price above is the last traded price, not the midpoint.
        </p>
      ) : null}

      <Sparkline tokenId={outcomes[activeIndex]?.tokenId ?? outcomes[0]?.tokenId ?? ''} />

      <div
        role="radiogroup"
        aria-label="Outcome"
        className={isBinary ? styles.binarySelector : styles.barSelector}
        onKeyDown={handleKeyDown}
      >
        {outcomes.map((outcome, index) => {
          const pct = outcome.indicativePrice !== null ? priceValue(outcome.indicativePrice) : null;
          return (
            <button
              key={outcome.tokenId}
              type="button"
              role="radio"
              aria-checked={index === activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              className={isBinary ? styles.binaryButton : styles.barRow}
              onFocus={() => {
                setActiveIndex(index);
              }}
              onClick={() => {
                selectOutcome(index);
              }}
            >
              {isBinary ? (
                <>
                  {outcome.label} {pct !== null ? formatPercent(pct, 0) : ''}
                </>
              ) : (
                <>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${pct !== null ? pct * 100 : 0}%` }} />
                  </div>
                  <span className={styles.barLabel}>
                    {outcome.label} {pct !== null ? formatPercent(pct, 0) : ''}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {market.resolutionCriteria !== null ? (
        <div className={styles.disclosure}>
          <button
            type="button"
            aria-expanded={showResolution}
            onClick={() => {
              setShowResolution((v) => !v);
            }}
          >
            How this market resolves
          </button>
          {showResolution ? (
            <div className={styles.disclosureBody}>
              <p>{market.resolutionCriteria}</p>
              <p className={styles.risksNote}>
                Resolution runs through the UMA optimistic oracle. Disputes can add days, and a rare
                &quot;unknown&quot; outcome pays 0.50 to both sides.
              </p>
              {market.endDate !== null ? <p>Scheduled close: {formatCloseDate(market.endDate)}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.disclosure}>
        <button
          type="button"
          aria-expanded={showOrderBook}
          onClick={() => {
            setShowOrderBook((v) => !v);
          }}
        >
          Order book depth
        </button>
        {showOrderBook ? (
          <div className={styles.disclosureBody}>
            {disclosureBookStatus === 'loading' ? <p>Loading…</p> : null}
            {disclosureBookStatus === 'success' && disclosureBook !== null ? (
              <div className={styles.bookLevels}>
                <div>
                  <p className={styles.bookSide}>Best asks</p>
                  {disclosureBook.asks.slice(0, 3).map((level, i) => (
                    <p key={i}>
                      {formatPriceCents(level.price)} — {formatShares(sharesValue(level.size))} shares
                    </p>
                  ))}
                </div>
                <div>
                  <p className={styles.bookSide}>Best bids</p>
                  {disclosureBook.bids.slice(0, 3).map((level, i) => (
                    <p key={i}>
                      {formatPriceCents(level.price)} — {formatShares(sharesValue(level.size))} shares
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.aiPanel}>
        <button
          type="button"
          aria-expanded={aiOpen}
          onClick={() => {
            setAiOpen((v) => !v);
          }}
        >
          Get a second opinion
        </button>
        {aiOpen ? (
          <p className={styles.aiPlaceholder}>
            AI-assisted second opinions are coming in a future update. This panel will show a blind model
            estimate with dispersion, dated evidence, and a gate verdict — always in its own visual
            register, never blended into the market price above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
