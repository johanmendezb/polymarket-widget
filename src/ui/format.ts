/**
 * Presentation-only number and time formatting. No domain logic lives here —
 * every value arriving already carries its meaning; this module only decides
 * how many digits and which glyphs the user sees.
 */
import { priceValue, usdcValue, type Price, type Usdc } from '@/domain';

/** `0.624` -> `"$0.62"`. Two decimal places, the unit the user actually spends. */
export function formatUsdc(value: Usdc): string {
  const n = usdcValue(value);
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

/** `0.624` -> `"62.4c"`. The order-preview convention for a per-share price. */
export function formatPriceCents(value: Price): string {
  return `${(priceValue(value) * 100).toFixed(1)}c`;
}

/** `0.618` -> `"61.8%"`. */
export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Shares are usually fractional at the margin; show up to 2dp, trimmed. */
export function formatShares(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** "updated 3s ago" / "updated 4m ago". `nowMs` is injected so this stays pure and testable. */
export function formatFreshness(fetchedAtMs: number, nowMs: number): string {
  const deltaSeconds = Math.max(0, Math.round((nowMs - fetchedAtMs) / 1000));
  if (deltaSeconds < 60) return `updated ${deltaSeconds}s ago`;
  const minutes = Math.round(deltaSeconds / 60);
  return `updated ${minutes}m ago`;
}

/** `1234567` -> `"$1.2M"`. Compact, for list-row volume figures. `null` renders as an em dash. */
export function formatCompactUsd(value: number | null): string {
  if (value === null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function formatCloseDate(iso: string | null): string {
  if (iso === null) return 'no close date set';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'no close date set';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
