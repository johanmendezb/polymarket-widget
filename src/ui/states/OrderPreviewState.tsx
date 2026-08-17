'use client';

import { useMemo, useState } from 'react';

import {
  asShares,
  asUsdc,
  priceValue,
  sharesValue,
  usdcValue,
  type FillEstimate,
  type Market,
  type MarketOutcome,
} from '@/domain';
import { walkBook, walkBookByBudget } from '@/simulation';

import { useBook } from '../hooks/useBook';
import { useNow } from '../hooks/useNow';
import { formatFreshness, formatPriceCents, formatShares, formatUsdc } from '../format';
import styles from './OrderPreviewState.module.css';

export interface OrderPreviewStateProps {
  readonly market: Market;
  readonly outcome: MarketOutcome;
  readonly onConfirm: (fill: FillEstimate) => void;
  readonly onBack: () => void;
}

type AmountUnit = 'usdc' | 'shares';

const PRESETS_USDC = [5, 25, 100] as const;
/** Spread wider than this shows last trade price instead — polymarket-domain skill / USER_FLOWS.md. */
const WIDE_SPREAD_THRESHOLD = 0.1;

function parseAmount(raw: string): number | null {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function OrderPreviewState({ market, outcome, onConfirm, onBack }: OrderPreviewStateProps) {
  const { book, status: bookStatus, error: bookError, retry: retryBook } = useBook(outcome.tokenId);
  const now = useNow();

  const [unit, setUnit] = useState<AmountUnit>('usdc');
  const [amountInput, setAmountInput] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [showResolution, setShowResolution] = useState(false);

  const amount = parseAmount(amountInput);

  const fill = useMemo<FillEstimate | null>(() => {
    if (book === null || amount === null) return null;
    return unit === 'usdc'
      ? walkBookByBudget(book, { usdc: asUsdc(amount) }, market.fees)
      : walkBook(book, { shares: asShares(amount) }, market.fees);
  }, [book, amount, unit, market.fees]);

  const wideSpread =
    book !== null && book.asks.length > 0 && book.bids.length > 0
      ? priceValue(book.asks[0]!.price) - priceValue(book.bids[0]!.price) > WIDE_SPREAD_THRESHOLD
      : false;

  const setPreset = (usdc: number) => {
    setUnit('usdc');
    setAmountInput(String(usdc));
    setReviewed(false);
  };

  const handleAmountChange = (value: string) => {
    setAmountInput(value);
    setReviewed(false);
  };

  const handleUnitChange = (nextUnit: AmountUnit) => {
    setUnit(nextUnit);
    setAmountInput('');
    setReviewed(false);
  };

  // The CTA error ladder, USER_FLOWS.md State C. Checked in priority order;
  // the first rung that applies is what the button shows and why it is disabled.
  const ladder = (() => {
    if (!market.acceptingOrders) {
      return { label: 'Market is not accepting orders', canProceed: false, terminal: true } as const;
    }
    if (bookStatus === 'loading' && book === null) {
      return { label: 'Loading order book…', canProceed: false, terminal: false } as const;
    }
    if (bookStatus === 'error' && book === null) {
      return { label: 'Could not load the order book', canProceed: false, terminal: false } as const;
    }
    if (amount === null) {
      return { label: 'Enter an amount', canProceed: false, terminal: false } as const;
    }
    if (fill !== null && usdcValue(fill.grossCost) < usdcValue(market.minOrderSize) && !fill.partial) {
      return {
        label: `Minimum is ${formatUsdc(market.minOrderSize)} on this market`,
        canProceed: false,
        terminal: false,
      } as const;
    }
    if (fill !== null && fill.partial) {
      return {
        label: `Only ${formatShares(sharesValue(fill.maxFillableShares))} shares available at this price`,
        canProceed: false,
        terminal: false,
      } as const;
    }
    if (!reviewed) {
      return { label: 'Review bet', canProceed: true, terminal: false } as const;
    }
    return { label: 'Place simulated bet', canProceed: true, terminal: false } as const;
  })();

  const handleCtaClick = () => {
    if (!ladder.canProceed || fill === null) return;
    if (!reviewed) {
      setReviewed(true);
      return;
    }
    onConfirm(fill);
  };

  const ticketDisabled = !market.acceptingOrders;

  return (
    <div className={styles.root}>
      <button type="button" className={styles.backLink} onClick={onBack}>
        ← Back
      </button>

      <p className={styles.simNotice} role="note">
        Simulated order — no wallet, no signature, no funds move.
      </p>

      {ticketDisabled ? (
        <div className={styles.terminalBanner} role="alert">
          This market is not accepting orders right now, so no fill can be priced. The ticket is disabled.
        </div>
      ) : null}

      <fieldset className={styles.amountBlock} disabled={ticketDisabled}>
        <legend className={styles.amountLabel}>Amount</legend>
        <div className={styles.amountRow}>
          <div role="group" aria-label="Amount unit" className={styles.unitToggle}>
            <button
              type="button"
              aria-pressed={unit === 'usdc'}
              onClick={() => {
                handleUnitChange('usdc');
              }}
            >
              $
            </button>
            <button
              type="button"
              aria-pressed={unit === 'shares'}
              onClick={() => {
                handleUnitChange('shares');
              }}
            >
              shares
            </button>
          </div>
          <label className={styles.visuallyHidden} htmlFor="order-amount-input">
            Amount in {unit === 'usdc' ? 'dollars' : 'shares'}
          </label>
          <input
            id="order-amount-input"
            className={styles.amountInput}
            type="number"
            min="0"
            inputMode="decimal"
            value={amountInput}
            disabled={ticketDisabled}
            onChange={(e) => {
              handleAmountChange(e.target.value);
            }}
          />
        </div>
        <div className={styles.presets}>
          {PRESETS_USDC.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setPreset(preset);
              }}
            >
              ${preset}
            </button>
          ))}
        </div>
      </fieldset>

      {bookStatus === 'error' && book !== null ? (
        <p className={styles.staleBadge} role="status">
          Showing the last known book — refresh failed.{' '}
          <button type="button" onClick={retryBook}>
            Retry
          </button>
        </p>
      ) : null}

      {bookStatus === 'error' && book === null ? (
        <p className={styles.errorText} role="alert">
          {bookError?.message ?? 'Could not load the order book.'}{' '}
          <button type="button" onClick={retryBook}>
            Retry
          </button>
        </p>
      ) : null}

      {book !== null ? (
        <p className={styles.freshness}>
          Book {formatFreshness(book.fetchedAt, now)}
          {wideSpread ? ' · wide spread — pricing shown from the last trade where relevant' : ''}
        </p>
      ) : null}

      {fill !== null ? (
        <dl className={styles.previewLines}>
          <div className={styles.line}>
            <dt>Shares</dt>
            <dd>{formatShares(sharesValue(fill.sharesFilled))}</dd>
          </div>

          {priceValue(fill.priceImpact) !== 0 ? (
            <div className={styles.line}>
              <dt>Avg. price</dt>
              <dd>
                {formatPriceCents(fill.averagePrice)}{' '}
                <span className={styles.muted}>
                  ({wideSpread && book?.lastTradePrice !== null && book?.lastTradePrice !== undefined
                    ? `last trade ${formatPriceCents(book.lastTradePrice)}`
                    : `best ${formatPriceCents(fill.topOfBookPrice)}`}
                  )
                </span>
              </dd>
            </div>
          ) : null}

          <div className={styles.line}>
            <dt>
              Fee ({market.fees.displayLabel}
              {market.fees.source === 'category-fallback' ? ' · estimated' : ''})
            </dt>
            <dd>{formatUsdc(fill.fee)}</dd>
          </div>

          <div className={styles.line}>
            <dt>Total cost</dt>
            <dd>{formatUsdc(fill.totalCost)}</dd>
          </div>

          <div className={styles.line}>
            <dt>If {outcome.label} resolves, you receive</dt>
            <dd>
              {formatUsdc(fill.payoutIfWin)}{' '}
              <span className={usdcValue(fill.netProfitIfWin) >= 0 ? styles.profit : styles.loss}>
                ({usdcValue(fill.netProfitIfWin) >= 0 ? '+' : ''}
                {formatUsdc(fill.netProfitIfWin)})
              </span>
            </dd>
          </div>
        </dl>
      ) : null}

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
          {showResolution ? <p className={styles.disclosureBody}>{market.resolutionCriteria}</p> : null}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          className={styles.cta}
          disabled={!ladder.canProceed}
          aria-describedby="cta-reason"
          onClick={handleCtaClick}
        >
          {ladder.label}
        </button>
        <p id="cta-reason" className={styles.ctaReason} aria-live="assertive">
          {ladder.canProceed ? 'Simulated. No funds move.' : ladder.label}
        </p>
      </div>
    </div>
  );
}
