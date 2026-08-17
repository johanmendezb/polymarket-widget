'use client';

import { useEffect, useState } from 'react';

import { probabilityValue, type ErrorCode, type Forecast, type Recommendation } from '@/domain';

import { useForecast } from '../hooks/useForecast';
import { formatDateTime, formatEvidenceDate, formatPercent } from '../format';
import { GATE_REASON_COPY } from './gateReasonCopy';
import styles from './AiPanel.module.css';

export interface AiPanelProps {
  readonly marketId: string;
  readonly tokenId: string;
  readonly outcomeLabel: string;
}

const LOADING_PHASES = ['Searching for evidence…', 'Reading sources…', 'Writing the estimate…'] as const;

/**
 * A display heuristic, not a pre-registered statistic: below this, the panel
 * warns that the blind estimate barely moved when the market price was shown
 * to it, which can mean the model is echoing the market rather than
 * forecasting independently. `docs/05-ai/AI_PROMPT_SPEC.md`'s `anchored-v1`.
 */
const ANCHORING_WARNING_DELTA = 0.03;

/**
 * Cosmetic only — the route is one blocking request, not a stream, so this
 * cycles on a timer rather than reflecting real backend phases. It exists
 * because USER_FLOWS.md's State B sub-flow specifies phase indicators, and a
 * silent multi-second wait after a click reads as broken.
 */
function LoadingPhases() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_PHASES.length);
    }, 1400);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <p className={styles.phase} role="status">
      {LOADING_PHASES[index]}
    </p>
  );
}

/**
 * The blind samples' min-max spread, recentred on the number actually shown
 * (`blendedProbability`). `dispersion` itself stays in log-odds units and is
 * shown separately in the provenance footer rather than converted here,
 * since `src/ui` may not import the log-odds math that produced it.
 */
function estimateRange(forecast: Forecast): { readonly low: number; readonly high: number } {
  const sampleValues = forecast.samples.map(probabilityValue);
  const halfWidth = sampleValues.length > 1 ? (Math.max(...sampleValues) - Math.min(...sampleValues)) / 2 : 0;
  const center = probabilityValue(forecast.blendedProbability);
  return {
    low: Math.max(0, center - halfWidth),
    high: Math.min(1, center + halfWidth),
  };
}

function EvidenceList({ evidence }: { readonly evidence: Forecast['evidence'] }) {
  if (evidence.length === 0) {
    return <p className={styles.emptyNote}>No sources were returned with this estimate.</p>;
  }
  return (
    <ul className={styles.evidenceList}>
      {evidence.map((item, index) => (
        <li key={index} className={styles.evidenceItem}>
          <p className={styles.evidenceClaim}>{item.claim}</p>
          <p className={styles.evidenceMeta}>
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
              {item.sourceTitle}
            </a>
            {' · '}
            <span className={item.publishedAt === null ? styles.undated : undefined}>
              {formatEvidenceDate(item.publishedAt)}
            </span>
            {' · '}
            <span className={styles.supportsTag}>{item.supports}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function GateReasons({ reasons }: { readonly reasons: Recommendation['reasons'] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className={styles.reasonList}>
      {reasons.map((reason) => {
        const copy = GATE_REASON_COPY[reason];
        return (
          <li key={reason}>
            <details className={styles.reasonDetails}>
              <summary>{copy.label}</summary>
              <p className={styles.reasonJustification}>{copy.justification}</p>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

function SuccessView({ recommendation }: { readonly recommendation: Recommendation }) {
  const { forecast } = recommendation;
  const range = estimateRange(forecast);
  const anchoringDelta =
    forecast.anchoredProbability === null
      ? null
      : Math.abs(probabilityValue(forecast.anchoredProbability) - probabilityValue(forecast.blindProbability));

  return (
    <div className={styles.resultBlock} role="status">
      <h4 className={styles.sectionHeading}>Sources</h4>
      <EvidenceList evidence={forecast.evidence} />

      <h4 className={styles.sectionHeading}>Estimate</h4>
      <div className={styles.estimateBlock}>
        <p className={styles.estimateLabel}>AI estimate, blind and blended with the market</p>
        <p className={styles.estimateRange}>
          {formatPercent(range.low, 0)}–{formatPercent(range.high, 0)}
        </p>
        <p className={styles.estimateMeta}>
          vs. market {formatPercent(probabilityValue(forecast.marketProbability), 0)} at the time of this estimate
        </p>
      </div>

      {anchoringDelta !== null && anchoringDelta < ANCHORING_WARNING_DELTA ? (
        <p className={styles.anchoringWarning}>
          The blind estimate barely moved when the market price was shown to it. That can mean the model is echoing
          the market rather than forecasting independently — read the edge below cautiously.
        </p>
      ) : null}

      <h4 className={styles.sectionHeading}>Gate</h4>
      <p className={styles.verdictLabel}>{recommendation.verdict === 'CONSIDER' ? 'Consider' : 'No bet'}</p>
      <p className={styles.verdictNote}>
        {recommendation.verdict === 'CONSIDER'
          ? 'The gate did not reject this market. This is a second opinion, not a signal to trust over the market price.'
          : 'The gate abstained on this market. Abstaining is a correct answer here, not a failure.'}
      </p>
      <GateReasons reasons={recommendation.reasons} />

      <dl className={styles.provenance}>
        <div>
          <dt>Model</dt>
          <dd>{forecast.modelId}</dd>
        </div>
        <div>
          <dt>Prompt</dt>
          <dd>{forecast.promptVersion}</dd>
        </div>
        <div>
          <dt>Samples (k)</dt>
          <dd>{forecast.samples.length}</dd>
        </div>
        <div>
          <dt>Dispersion</dt>
          <dd>{forecast.dispersion.toFixed(3)} (log-odds IQR)</dd>
        </div>
        <div>
          <dt>Blend weight</dt>
          <dd>{formatPercent(forecast.blendWeight, 0)}</dd>
        </div>
        <div>
          <dt>Generated</dt>
          <dd>{formatDateTime(forecast.createdAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function NoEvidenceView() {
  return (
    <div className={styles.resultBlock} role="status">
      <p className={styles.noEvidenceHeadline}>I could not find sources I trust for this question.</p>
      <p className={styles.emptyNote}>No usable evidence is a real answer, not an error — nothing else here is affected.</p>
    </div>
  );
}

const ERROR_COPY: Partial<Record<ErrorCode, string>> = {
  AI_TIMEOUT: "The model didn't respond in time.",
  AI_INVALID_OUTPUT: "The model's response didn't match the expected format, so nothing is shown.",
};

function ErrorView({ code, message, onRetry }: { readonly code: ErrorCode; readonly message?: string; readonly onRetry: () => void }) {
  return (
    <div className={styles.errorBlock} role="alert">
      <p>{ERROR_COPY[code] ?? message ?? 'AI unavailable right now.'}</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/**
 * The AI second-opinion panel — an independent data path (`useForecast`)
 * that never fires on mount. Renders every branch of USER_FLOWS.md's State B
 * sub-flow: idle, loading, `CONSIDER`/`NO_BET`, `insufficient_evidence`, and
 * each AI failure code, none of which may block or break the rest of the
 * widget.
 */
export function AiPanel({ marketId, tokenId, outcomeLabel }: AiPanelProps) {
  const [opened, setOpened] = useState(false);
  const { status, recommendation, error, run } = useForecast(marketId, tokenId);

  const handleStart = () => {
    setOpened(true);
    run();
  };

  return (
    <div className={styles.root}>
      {!opened ? (
        <button type="button" className={styles.toggle} aria-expanded={false} onClick={handleStart}>
          Get a second opinion
        </button>
      ) : (
        <>
          <p className={styles.heading} aria-expanded={true}>
            AI second opinion — {outcomeLabel}
          </p>
          {status === 'loading' ? <LoadingPhases /> : null}
          {status === 'success' && recommendation !== null ? <SuccessView recommendation={recommendation} /> : null}
          {status === 'no_evidence' ? <NoEvidenceView /> : null}
          {status === 'error' ? (
            <ErrorView code={error?.code ?? 'INTERNAL'} message={error?.message} onRetry={run} />
          ) : null}
        </>
      )}
    </div>
  );
}
