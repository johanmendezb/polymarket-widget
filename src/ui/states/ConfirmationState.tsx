'use client';

import { sharesValue, usdcValue, type FillEstimate, type Market, type MarketOutcome } from '@/domain';

import { usePositions } from '../hooks/usePositions';
import { formatCloseDate, formatPriceCents, formatShares, formatUsdc } from '../format';
import styles from './ConfirmationState.module.css';

export interface ConfirmationStateProps {
  readonly market: Market;
  readonly outcome: MarketOutcome;
  readonly fill: FillEstimate;
  readonly onBackToMarkets: () => void;
}

export function ConfirmationState({ market, outcome, fill, onBackToMarkets }: ConfirmationStateProps) {
  const { positions } = usePositions();

  return (
    <div className={styles.root}>
      <p className={styles.simBadge} role="status">
        Simulated. No funds moved.
      </p>

      <h2 className={styles.question}>{market.question}</h2>
      <p className={styles.outcomeLabel}>{outcome.label}</p>

      <dl className={styles.summaryLines}>
        <div className={styles.line}>
          <dt>Shares</dt>
          <dd>{formatShares(sharesValue(fill.sharesFilled))}</dd>
        </div>
        <div className={styles.line}>
          <dt>Entry avg. price</dt>
          <dd>{formatPriceCents(fill.averagePrice)}</dd>
        </div>
        <div className={styles.line}>
          <dt>Fee paid</dt>
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

      <p className={styles.nextStep}>
        This market resolves through the UMA optimistic oracle on or after{' '}
        {market.endDate !== null ? formatCloseDate(market.endDate) : 'a date not yet set'}. Disputes can
        delay resolution by several days.
      </p>

      <button type="button" className={styles.backButton} onClick={onBackToMarkets}>
        Back to markets
      </button>

      <section className={styles.positions} aria-label="Your simulated positions this session">
        <h3 className={styles.positionsHeading}>This session&apos;s simulated positions</h3>
        <p className={styles.resetNote}>In-memory only — this list resets when the page reloads.</p>
        <ul className={styles.positionsList}>
          {positions.map((position) => (
            <li key={position.id} className={styles.positionRow}>
              <span>{position.marketQuestion}</span>
              <span>{position.outcomeLabel}</span>
              <span>{formatShares(sharesValue(position.shares))} shares</span>
              <span>{formatUsdc(position.totalCost)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
