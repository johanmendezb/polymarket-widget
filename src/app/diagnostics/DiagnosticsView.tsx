/**
 * T8.2: the resolution-free diagnostics view. Renders exactly what
 * `docs/05-ai/EVALUATION.md` §B7 says is meaningful before any market
 * resolves — nothing here is, or implies, an accuracy or profitability
 * claim (§B8 binds this file). Every number is shown with the sample or bin
 * count that produced it, and every diagnostic's method is one `<details>`
 * away — native HTML, so the disclosure works with no client JavaScript and
 * is keyboard- and screen-reader-accessible for free.
 */
import type { ReactElement, ReactNode } from 'react';

import { priceValue, usdcValue } from '@/domain';
import type {
  CoherenceDiagnostic,
  DiagnosticsReport,
  GateHistogramDiagnostic,
  HistogramDiagnostic,
  WaterfallDiagnostic,
} from '../api/_diagnostics';
import styles from './DiagnosticsView.module.css';

function formatPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function SampleCount({ n, noun = 'entries' }: { readonly n: number; readonly noun?: string }): ReactElement {
  return (
    <span className={styles.sampleCount}>
      N = {n} {noun}
    </span>
  );
}

function Methodology({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <details className={styles.methodology}>
      <summary>How this is computed</summary>
      <div className={styles.methodologyBody}>{children}</div>
    </details>
  );
}

function Panel({
  title,
  n,
  noun,
  children,
  methodology,
  variant = 'default',
}: {
  readonly title: string;
  readonly n: number;
  readonly noun?: string;
  readonly children: ReactNode;
  readonly methodology: ReactNode;
  readonly variant?: 'default' | 'cost';
}): ReactElement {
  return (
    <section className={variant === 'cost' ? `${styles.box} ${styles.boxCost}` : styles.box}>
      <div className={styles.boxHeader}>
        <h2 className={styles.boxTitle}>{title}</h2>
        <SampleCount n={n} noun={noun} />
      </div>
      <div className={styles.boxBody}>{children}</div>
      <Methodology>{methodology}</Methodology>
    </section>
  );
}

function EmptyDiagnostic({ reason }: { readonly reason: string }): ReactElement {
  return <p className={styles.emptyDiagnostic}>{reason}</p>;
}

function HistogramTable({ histogram }: { readonly histogram: HistogramDiagnostic }): ReactElement {
  if (histogram.n === 0) {
    return <EmptyDiagnostic reason="No entries with this data yet." />;
  }
  return (
    <div>
      {histogram.mean !== null && <p className={styles.stat}>Mean: {histogram.mean.toFixed(4)}</p>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <tbody>
            {histogram.bins.map((bin) => (
              <tr key={bin.label}>
                <td>{bin.label}</td>
                <td className={styles.numCell}>{bin.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoherenceTable({ diagnostic }: { readonly diagnostic: CoherenceDiagnostic }): ReactElement {
  if (diagnostic.n === 0) {
    return (
      <EmptyDiagnostic reason="0 groups. pnpm freeze currently records one outcome per market, so no independently frozen pair or group exists to compare yet — this is a manifest-schema gap, not a computed zero." />
    );
  }
  return (
    <div>
      {diagnostic.meanAbsDelta !== null && <p className={styles.stat}>Mean |Σp − 1|: {diagnostic.meanAbsDelta.toFixed(4)}</p>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Market</th>
              <th>Outcomes</th>
              <th className={styles.numCell}>|Σp − 1|</th>
            </tr>
          </thead>
          <tbody>
            {diagnostic.groups.map((group) => (
              <tr key={group.marketId}>
                <td>{group.question}</td>
                <td>{group.outcomeCount}</td>
                <td className={styles.numCell}>{group.absDelta.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GateTable({ histogram }: { readonly histogram: GateHistogramDiagnostic }): ReactElement {
  if (histogram.n === 0) {
    return <EmptyDiagnostic reason="No frozen entries yet." />;
  }
  return (
    <div>
      <p className={styles.stat}>
        CONSIDER: <span className={styles.considerCount}>{histogram.considerCount}</span> · NO_BET:{' '}
        <span className={styles.noBetCount}>{histogram.noBetCount}</span>
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <tbody>
            {histogram.reasonCounts.map((row) => (
              <tr key={row.reason}>
                <td>{row.reason}</td>
                <td className={styles.numCell}>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WaterfallPanel({ waterfall }: { readonly waterfall: WaterfallDiagnostic | null }): ReactElement {
  if (waterfall === null) {
    return (
      <Panel title="Cost waterfall" n={0} noun="markets" methodology="Needs at least one frozen manifest entry.">
        <EmptyDiagnostic reason="No frozen entries yet." />
      </Panel>
    );
  }

  if (!waterfall.available) {
    return (
      <Panel title="Cost waterfall" n={0} noun="markets" methodology="Fetches a live order book and market fee config for one frozen market and walks mid → ask → fee → depth-walk → edge.">
        <EmptyDiagnostic reason={`Could not fetch live data for the illustration market: ${waterfall.reason}`} />
      </Panel>
    );
  }

  const { waterfall: steps } = waterfall;
  return (
    <Panel
      title="Cost waterfall"
      n={1}
      noun="market (live)"
      variant="cost"
      methodology={
        <p>
          Walks the current live order book and the market&apos;s own fee config — never the
          frozen freeze-time snapshot — for one representative market, at a $100 reference fill.
          Steps: market midpoint → best ask → average fill price (from walking the book) → fee
          per share → effective cost per share → surviving edge (blended probability minus
          effective cost). See <code className={styles.codeInline}>docs/03-domain/ORDER_EXECUTION.md</code> §3. Because this
          recomputes against the current book, the edge shown can differ from the frozen{' '}
          <code className={styles.codeInline}>Recommendation</code> at freeze time if the book has moved since.
        </p>
      }
    >
      <p className={styles.waterfallQuestion}>{waterfall.question}</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <tbody>
            <tr>
              <td>Market midpoint</td>
              <td className={styles.numCell}>{formatPct(priceValue(steps.marketMidpoint))}</td>
            </tr>
            <tr>
              <td>Best ask</td>
              <td className={styles.numCell}>{formatPct(priceValue(steps.bestAsk))}</td>
            </tr>
            <tr>
              <td>Average fill price</td>
              <td className={styles.numCell}>{formatPct(priceValue(steps.averageFillPrice))}</td>
            </tr>
            <tr>
              <td>Fee per share</td>
              <td className={styles.numCell}>${usdcValue(steps.feePerShare).toFixed(5)}</td>
            </tr>
            <tr>
              <td>Effective cost per share</td>
              <td className={styles.numCell}>${usdcValue(steps.effectiveCostPerShare).toFixed(5)}</td>
            </tr>
            <tr className={styles.totalRow}>
              <td>Surviving edge</td>
              <td className={styles.numCell}>{waterfall.estimatedEdge.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.waterfallFootnote}>
        Fetched live at {waterfall.fetchedAt}. A negative edge is a real answer, not clamped to
        zero: it means the correct action is no bet.
      </p>
    </Panel>
  );
}

export function DiagnosticsView({
  report,
  waterfall,
}: {
  readonly report: DiagnosticsReport;
  readonly waterfall: WaterfallDiagnostic | null;
}): ReactElement {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Resolution-free diagnostics</h1>
        <p className={styles.subtitle}>
          Predictions are recorded and hashed before any resolution is known — not yet scored
          against an outcome. Nothing below claims or implies anything about this system&apos;s
          accuracy or profitability, or how it compares to the market. See{' '}
          <code className={styles.codeInline}>docs/05-ai/EVALUATION.md</code> §B8 for the full claims policy.
        </p>
      </header>

      <section className={styles.box}>
        <h2 className={styles.boxTitle}>Manifest</h2>
        <p className={styles.manifestNote}>
          <SampleCount n={report.entryCount} noun="frozen forecasts" />
        </p>
        {report.entryCount === 0 && (
          <p className={styles.manifestEmpty}>
            No forecasts have been frozen yet. Run <code className={styles.codeInline}>pnpm freeze</code> to produce a manifest;
            every diagnostic below will read from it once it exists.
          </p>
        )}
        {report.manifestHash !== null && (
          <p className={styles.hash}>
            SHA-256: {report.manifestHash.sha256}{' '}
            <span className={report.manifestHash.matchesFile ? styles.hashMatch : styles.hashMismatch}>
              {report.manifestHash.matchesFile ? '✓ matches MANIFEST.sha256' : '✗ does not match MANIFEST.sha256'}
            </span>
          </p>
        )}
      </section>

      <Panel
        title="Complementary coherence"
        n={report.complementaryCoherence.n}
        noun="pairs"
        methodology={
          <p>
            For a two-outcome market with two independently, blindly elicited forecasts, measures
            |p̂(outcome A) + p̂(outcome B) − 1|. A mean above roughly 0.05 indicates the model's
            probabilities are framing-dependent rather than a coherent probability. Grounded in
            acquiescence-bias literature on &gt;50% skew.
          </p>
        }
      >
        <CoherenceTable diagnostic={report.complementaryCoherence} />
      </Panel>

      <Panel
        title="Multi-outcome coherence"
        n={report.multiOutcomeCoherence.n}
        noun="groups"
        methodology={
          <p>
            For a negRisk group of three or more mutually exclusive outcomes, measures |Σp̂ᵢ − 1|
            across independently, blindly elicited forecasts for each outcome. A large delta means
            no coherent world model across the group. Today&apos;s manifest schema (T8.1) does not
            carry the upstream event id that would let this be grouped across separate markets, so
            this diagnostic is currently structurally empty — a known limitation, not a computed
            zero.
          </p>
        }
      >
        <CoherenceTable diagnostic={report.multiOutcomeCoherence} />
      </Panel>

      <Panel
        title="Blind-vs-anchored delta"
        n={report.blindVsAnchoredDelta.n}
        noun="entries with an anchored diagnostic"
        methodology={
          <p>
            |p̂_blind − p̂_shown_price| for every entry that ran the optional anchored diagnostic
            (the market price shown in the prompt). A delta near zero across the set is evidence
            the &quot;blind&quot; elicitation was not actually blind — the model may be echoing
            the price it was never supposed to see.
          </p>
        }
      >
        <HistogramTable histogram={report.blindVsAnchoredDelta} />
      </Panel>

      <Panel
        title="Sample dispersion"
        n={report.sampleDispersion.n}
        methodology={
          <p>
            The interquartile range across each entry&apos;s k blind log-odds samples. Wide
            dispersion is the same signal the abstention gate&apos;s{' '}
            <code className={styles.codeInline}>HIGH_DISPERSION_THRESHOLD</code> acts on per entry — this histogram shows it
            across the whole frozen set.
          </p>
        }
      >
        <HistogramTable histogram={report.sampleDispersion} />
      </Panel>

      <Panel
        title="Disagreement distribution"
        n={report.disagreementDistribution.n}
        methodology={
          <p>
            p̂_blind − market midpoint at freeze time, for every frozen entry. A spike at zero
            reads as no signal; fat tails read as overconfidence. This grounding is INFERRED, not
            a verified published result — see <code className={styles.codeInline}>docs/05-ai/EVALUATION.md</code> §B7.
          </p>
        }
      >
        <HistogramTable histogram={report.disagreementDistribution} />
      </Panel>

      <Panel
        title="Gate reason histogram"
        n={report.gateReasonHistogram.n}
        methodology={
          <p>
            Counts how often each of the 11 abstention-gate reason codes fired across the frozen
            set, plus the CONSIDER/NO_BET split. Every reason listed even at zero, so an unused
            rule is visibly zero rather than silently absent. An all-CONSIDER result would mean
            the gate is decorative.
          </p>
        }
      >
        <GateTable histogram={report.gateReasonHistogram} />
      </Panel>

      <WaterfallPanel waterfall={waterfall} />
    </main>
  );
}
