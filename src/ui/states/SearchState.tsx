'use client';

import { useId, useState, type CSSProperties, type KeyboardEvent } from 'react';

import type { Market } from '@/domain';
import { priceValue } from '@/domain';

import { useSearchMarkets } from '../hooks/useSearchMarkets';
import { formatCloseDate, formatCompactUsd, formatPercent } from '../format';
import styles from './SearchState.module.css';

export interface SearchStateProps {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly onSelectMarket: (market: Market) => void;
}

const MIN_QUERY_LENGTH = 2;
const SKELETON_ROW_COUNT = 5;
/** Entrance stagger caps out past this index so a long result list doesn't crawl in. */
const MAX_STAGGER_INDEX = 8;

/**
 * Category chips, per USER_FLOWS.md State A. The documented mechanism is a
 * Gamma `tag_id` discovery call; T3.4 only implemented `fetchSearch(q)` (a
 * flagged, known gap — see `search/route.ts`'s own doc comment), so a
 * `tag`-only request is unavailable here. Each chip instead runs a real text
 * search for a representative term. This is a documented substitution, not a
 * silent cut, and is called out in the T4.2 handoff.
 */
const CATEGORY_CHIPS: readonly { readonly label: string; readonly query: string }[] = [
  { label: 'Trending', query: 'election' },
  { label: 'Politics', query: 'president' },
  { label: 'Crypto', query: 'bitcoin' },
  { label: 'Sports', query: 'championship' },
];

/** Empty-query fallback so State A never shows a blank panel — USER_FLOWS.md State A. */
const TRENDING_QUERY = CATEGORY_CHIPS[0]!.query;

interface RingStyle extends CSSProperties {
  '--ring-pct': string;
}

interface LeadingOutcome {
  readonly label: string;
  readonly pctLabel: string | null;
  readonly pctValue: number | null;
  readonly extraCount: number;
}

/** The market's own belief — a market number, so it is styled with the market register, never the brand accent. */
function leadingOutcome(market: Market): LeadingOutcome {
  const first = market.outcomes[0];
  const extraCount = market.outcomes.length > 1 ? market.outcomes.length - 1 : 0;
  if (!first || first.indicativePrice === null) {
    return { label: first?.label ?? 'price unavailable', pctLabel: null, pctValue: null, extraCount };
  }
  const value = priceValue(first.indicativePrice);
  return { label: first.label, pctLabel: formatPercent(value, 0), pctValue: Math.round(value * 100), extraCount };
}

function ProbabilityRing({ outcome }: { readonly outcome: LeadingOutcome }) {
  const ringStyle: RingStyle = { '--ring-pct': String(outcome.pctValue ?? 0) };
  const ringClass = outcome.pctValue === null ? `${styles.ring} ${styles.ringMuted}` : styles.ring;
  return (
    <div className={styles.ringWrap}>
      <div className={ringClass} style={ringStyle} aria-hidden="true" />
      <span className={styles.ringValue}>{outcome.pctLabel ?? '—'}</span>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 13.5 17.5 17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SkeletonRows() {
  return (
    <ul className={styles.list} aria-hidden="true">
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        <li key={i} className={styles.skeletonCard}>
          <div className={styles.cardMain}>
            <div className={`${styles.skeletonRing} ${styles.shimmer}`} />
            <div className={styles.skeletonBody}>
              <div className={`${styles.skeletonLine} ${styles.shimmer}`} style={{ width: '92%' }} />
              <div className={`${styles.skeletonLine} ${styles.shimmer}`} style={{ width: '55%' }} />
            </div>
          </div>
          <div className={styles.chipsRow}>
            <div className={`${styles.skeletonChip} ${styles.shimmer}`} />
            <div className={`${styles.skeletonChip} ${styles.shimmer}`} />
            <div className={`${styles.skeletonChip} ${styles.shimmer}`} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SearchState({ query, onQueryChange, onSelectMarket }: SearchStateProps) {
  const trimmed = query.trim();
  const isEmptyInput = trimmed.length < MIN_QUERY_LENGTH;
  const effectiveQuery = isEmptyInput ? TRENDING_QUERY : trimmed;

  const { status, markets, stale, error, retry } = useSearchMarkets(effectiveQuery);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();

  const handleChipClick = (chipQuery: string) => {
    onQueryChange(chipQuery);
    setActiveIndex(-1);
  };

  const selectByIndex = (index: number) => {
    const market = markets[index];
    if (market) onSelectMarket(market);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (markets.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, markets.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0) {
        event.preventDefault();
        selectByIndex(activeIndex);
      }
    } else if (event.key === 'Escape') {
      setActiveIndex(-1);
    }
  };

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;
  const showResults = (status === 'results' || (status === 'error' && stale)) && markets.length > 0;

  return (
    <div className={styles.root}>
      <label className={styles.searchLabel} htmlFor={`${listboxId}-input`}>
        Search markets
      </label>
      <div className={styles.inputWrap}>
        <SearchIcon />
        <input
          id={`${listboxId}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          className={styles.input}
          type="text"
          placeholder="Search prediction markets…"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>

      <div role="group" aria-label="Categories" className={styles.chips}>
        {CATEGORY_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className={styles.chip}
            aria-pressed={query === chip.query}
            onClick={() => {
              handleChipClick(chip.query);
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {isEmptyInput && status === 'results' ? <p className={styles.sectionLabel}>Trending</p> : null}

      {status === 'loading' ? <SkeletonRows /> : null}

      {status === 'error' && !stale ? (
        <div className={styles.errorPanel} role="alert">
          <p>Search is temporarily unavailable.</p>
          <button type="button" className={styles.retryButton} onClick={retry}>
            Retry
          </button>
        </div>
      ) : null}

      {status === 'no-results' ? (
        <div className={styles.noResults}>
          <p>{isEmptyInput ? 'We couldn’t load trending markets right now.' : `We couldn’t find a match for “${trimmed}”.`}</p>
          <p className={styles.noResultsHint}>Try a different search, or pick a category:</p>
          <div role="group" aria-label="Suggested categories" className={styles.chips}>
            {CATEGORY_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className={styles.chip}
                onClick={() => {
                  handleChipClick(chip.query);
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showResults ? (
        <>
          {stale ? (
            <p className={styles.staleBadge} role="status">
              Showing last known results — refresh failed.{' '}
              <button type="button" className={styles.retryButton} onClick={retry}>
                Retry
              </button>
            </p>
          ) : null}
          <ul id={listboxId} role="listbox" aria-label="Search results" className={styles.list}>
            {markets.map((market, index) => {
              const outcome = leadingOutcome(market);
              const isActive = index === activeIndex;
              const cardStyle: CSSProperties = { animationDelay: `${Math.min(index, MAX_STAGGER_INDEX) * 40}ms` };
              return (
                <li
                  key={market.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={-1}
                  className={isActive ? `${styles.card} ${styles.cardActive}` : styles.card}
                  style={cardStyle}
                  onClick={() => {
                    selectByIndex(index);
                  }}
                  onMouseEnter={() => {
                    setActiveIndex(index);
                  }}
                >
                  <div className={styles.cardMain}>
                    <ProbabilityRing outcome={outcome} />
                    <div className={styles.cardBody}>
                      <p className={styles.question}>{market.question}</p>
                      <p className={styles.outcomeLabel}>
                        {outcome.label}
                        {outcome.extraCount > 0 ? <span className={styles.outcomeExtra}> · +{outcome.extraCount} more outcomes</span> : null}
                      </p>
                    </div>
                  </div>
                  <div className={styles.chipsRow}>
                    {market.category !== null ? <span className={styles.metaChip}>{market.category}</span> : null}
                    <span className={styles.metaChip}>{formatCompactUsd(market.volume24hUsd)} vol · 24h</span>
                    <span className={styles.metaChip}>closes {formatCloseDate(market.endDate)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {error !== null && status === 'error' && stale ? <p className={styles.staleErrorDetail}>{error.message}</p> : null}
    </div>
  );
}
