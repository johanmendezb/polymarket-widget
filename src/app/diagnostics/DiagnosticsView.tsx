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

function formatPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function SampleCount({ n, noun = 'entries' }: { readonly n: number; readonly noun?: string }): ReactElement {
  return (
    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
      N = {n} {noun}
    </span>
  );
}

function Methodology({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <details className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
      <summary className="cursor-pointer select-none font-medium text-neutral-700 dark:text-neutral-200">
        How this is computed
      </summary>
      <div className="mt-1 pl-4">{children}</div>
    </details>
  );
}

function Panel({
  title,
  n,
  noun,
  children,
  methodology,
}: {
  readonly title: string;
  readonly n: number;
  readonly noun?: string;
  readonly children: ReactNode;
  readonly methodology: ReactNode;
}): ReactElement {
  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <SampleCount n={n} noun={noun} />
      </div>
      <div className="mt-3">{children}</div>
      <Methodology>{methodology}</Methodology>
    </section>
  );
}

function EmptyDiagnostic({ reason }: { readonly reason: string }): ReactElement {
  return <p className="text-sm text-neutral-500 dark:text-neutral-400">{reason}</p>;
}

function HistogramTable({ histogram }: { readonly histogram: HistogramDiagnostic }): ReactElement {
  if (histogram.n === 0) {
    return <EmptyDiagnostic reason="No entries with this data yet." />;
  }
  return (
    <div className="space-y-1">
      {histogram.mean !== null && <p className="text-sm">Mean: {histogram.mean.toFixed(4)}</p>}
      <table className="w-full text-sm">
        <tbody>
          {histogram.bins.map((bin) => (
            <tr key={bin.label} className="border-t border-neutral-100 dark:border-neutral-900">
              <td className="py-1 pr-4 text-neutral-600 dark:text-neutral-300">{bin.label}</td>
              <td className="py-1 text-right font-mono">{bin.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div className="space-y-2">
      {diagnostic.meanAbsDelta !== null && <p className="text-sm">Mean |Σp − 1|: {diagnostic.meanAbsDelta.toFixed(4)}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 dark:text-neutral-400">
            <th className="font-medium">Market</th>
            <th className="font-medium">Outcomes</th>
            <th className="text-right font-medium">|Σp − 1|</th>
          </tr>
        </thead>
        <tbody>
          {diagnostic.groups.map((group) => (
            <tr key={group.marketId} className="border-t border-neutral-100 dark:border-neutral-900">
              <td className="py-1 pr-4">{group.question}</td>
              <td className="py-1 pr-4 font-mono">{group.outcomeCount}</td>
              <td className="py-1 text-right font-mono">{group.absDelta.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GateTable({ histogram }: { readonly histogram: GateHistogramDiagnostic }): ReactElement {
  if (histogram.n === 0) {
    return <EmptyDiagnostic reason="No frozen entries yet." />;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm">
        CONSIDER: <span className="font-mono">{histogram.considerCount}</span> · NO_BET:{' '}
        <span className="font-mono">{histogram.noBetCount}</span>
      </p>
      <table className="w-full text-sm">
        <tbody>
          {histogram.reasonCounts.map((row) => (
            <tr key={row.reason} className="border-t border-neutral-100 dark:border-neutral-900">
              <td className="py-1 pr-4 text-neutral-600 dark:text-neutral-300">{row.reason}</td>
              <td className="py-1 text-right font-mono">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      methodology={
        <p>
          Walks the current live order book and the market&apos;s own fee config — never the
          frozen freeze-time snapshot — for one representative market, at a $100 reference fill.
          Steps: market midpoint → best ask → average fill price (from walking the book) → fee
          per share → effective cost per share → surviving edge (blended probability minus
          effective cost). See <code>docs/03-domain/ORDER_EXECUTION.md</code> §3. Because this
          recomputes against the current book, the edge shown can differ from the frozen{' '}
          <code>Recommendation</code> at freeze time if the book has moved since.
        </p>
      }
    >
      <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-300">{waterfall.question}</p>
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-t border-neutral-100 dark:border-neutral-900">
            <td className="py-1 pr-4 text-neutral-600 dark:text-neutral-300">Market midpoint</td>
            <td className="py-1 text-right font-mono">{formatPct(priceValue(steps.marketMidpoint))}</td>
          </tr>
          <tr className="border-t border-neutral-100 dark:border-neutral-900">
            <td className="py-1 pr-4 text-neutral-600 dark:text-neutral-300">Best ask</td>
            <td className="py-1 text-right font-mono">{formatPct(priceValue(steps.bestAsk))}</td>
          </tr>
          <tr className="border-t border-neutral-100 dark:border-neutral-900">
            <td className="py-1 pr-4 text-neutral-600 dark:text-neutral-300">Average fill price</td>
            <td className="py-1 text-right font-mono">{formatPct(priceValue(steps.averageFillPrice))}</td>
          </tr>
          <tr className="border-t border-neutral-100 dark:border-neutral-900">
            <td className="py-1 pr-4 text-neutral-600 dark:text-neutral-300">Fee per share</td>
            <td className="py-1 text-right font-mono">${usdcValue(steps.feePerShare).toFixed(5)}</td>
          </tr>
          <tr className="border-t border-neutral-100 dark:border-neutral-900">
            <td className="py-1 pr-4 text-neutral-600 dark:text-neutral-300">Effective cost per share</td>
            <td className="py-1 text-right font-mono">${usdcValue(steps.effectiveCostPerShare).toFixed(5)}</td>
          </tr>
          <tr className="border-t border-neutral-200 font-semibold dark:border-neutral-800">
            <td className="py-1 pr-4">Surviving edge</td>
            <td className="py-1 text-right font-mono">{waterfall.estimatedEdge.toFixed(4)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
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
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-xl font-bold">Resolution-free diagnostics</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Predictions are recorded and hashed before any resolution is known — not yet scored
          against an outcome. Nothing below claims or implies anything about this system&apos;s
          accuracy or profitability, or how it compares to the market. See{' '}
          <code>docs/05-ai/EVALUATION.md</code> §B8 for the full claims policy.
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-base font-semibold">Manifest</h2>
        <p className="mt-1 text-sm">
          <SampleCount n={report.entryCount} noun="frozen forecasts" />
        </p>
        {report.entryCount === 0 && (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            No forecasts have been frozen yet. Run <code>pnpm freeze</code> to produce a manifest;
            every diagnostic below will read from it once it exists.
          </p>
        )}
        {report.manifestHash !== null && (
          <p className="mt-2 break-all font-mono text-xs text-neutral-500 dark:text-neutral-400">
            SHA-256: {report.manifestHash.sha256}{' '}
            <span
              className={report.manifestHash.matchesFile ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}
            >
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
            <code>HIGH_DISPERSION_THRESHOLD</code> acts on per entry — this histogram shows it
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
            a verified published result — see <code>docs/05-ai/EVALUATION.md</code> §B7.
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
