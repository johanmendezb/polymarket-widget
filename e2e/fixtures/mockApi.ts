/**
 * Installs `page.route()` interception for every relative URL the widget can
 * call (`/api/polymarket/*`, `/api/ai/forecast`). This is this suite's
 * network boundary: ADR-0011 requires Playwright to be "fully deterministic
 * ... no live network, ever", and intercepting in the browser, before a
 * request ever leaves it, is what makes that a guarantee rather than a hope.
 *
 * A trailing `**\/api/**` catch-all, registered first (Playwright runs the
 * most-recently-registered matching route first, so this one always yields
 * to a more specific handler registered after it), aborts anything nobody
 * asked for. A gap in test setup then fails loudly and instantly — a stuck
 * loading state — rather than reaching for the real, live Polymarket API.
 *
 * `src/ui/api-client.ts` checks the response body for an `error` key before
 * checking `response.ok` (`AI_NO_EVIDENCE` is a 200 carrying an error-shaped
 * body), so every mock here goes through this module's `fulfillJson` rather
 * than ad hoc `route.fulfill()` calls, to keep that envelope contract in one
 * place.
 */
import type { Page, Route } from '@playwright/test';

import { buildGoldenBook, buildGoldenMarket, goldenBook, goldenMarket, goldenRecommendation } from './golden';
import {
  errorEnvelope,
  successEnvelope,
  HTTP_STATUS_BY_CODE,
  type WireErrorCode,
  type WireHistoryResponse,
  type WireMarket,
  type WireOrderBook,
  type WireRecommendation,
  type WireSearchResponse,
} from './wireTypes';

export type MockOutcome<T> =
  | { readonly kind: 'success'; readonly data: T }
  | { readonly kind: 'error'; readonly code: WireErrorCode; readonly message: string }
  | { readonly kind: 'malformed' }
  | { readonly kind: 'abort' };

export interface MockConfig {
  readonly search?: MockOutcome<WireSearchResponse>;
  readonly market?: MockOutcome<WireMarket>;
  readonly book?: MockOutcome<WireOrderBook>;
  readonly history?: MockOutcome<WireHistoryResponse>;
  readonly forecast?: MockOutcome<WireRecommendation>;
}

async function fulfillOutcome<T>(route: Route, outcome: MockOutcome<T>): Promise<void> {
  if (outcome.kind === 'success') {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(successEnvelope(outcome.data)) });
    return;
  }
  if (outcome.kind === 'error') {
    await route.fulfill({
      status: HTTP_STATUS_BY_CODE[outcome.code],
      contentType: 'application/json',
      body: JSON.stringify(errorEnvelope(outcome.code, outcome.message)),
    });
    return;
  }
  if (outcome.kind === 'malformed') {
    // A 200 whose body is not JSON: `fetchJson`'s `response.json()` throws,
    // and the client surfaces `UPSTREAM_UNAVAILABLE` — the "shape change"
    // failure path, T6.2 #6. Never a live-network condition; this is us
    // choosing to serve garbage on purpose.
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'not json{{{' });
    return;
  }
  await route.abort('failed');
}

/** Golden-path defaults: every route succeeds with the shared fixture data. */
const DEFAULTS: Required<MockConfig> = {
  search: { kind: 'success', data: { markets: [goldenMarket], hasMore: false } },
  market: { kind: 'success', data: goldenMarket },
  book: { kind: 'success', data: goldenBook },
  history: { kind: 'success', data: { points: [] } },
  forecast: { kind: 'success', data: goldenRecommendation },
};

export async function installApiMocks(page: Page, config: MockConfig = {}): Promise<void> {
  const resolved: Required<MockConfig> = { ...DEFAULTS, ...config };

  await page.route('**/api/**', async (route) => {
    await route.abort('failed');
  });

  await page.route('**/api/polymarket/search**', async (route) => {
    await fulfillOutcome(route, resolved.search);
  });

  await page.route('**/api/polymarket/market/**', async (route) => {
    await fulfillOutcome(route, resolved.market);
  });

  await page.route('**/api/polymarket/book**', async (route) => {
    await fulfillOutcome(route, resolved.book);
  });

  await page.route('**/api/polymarket/history**', async (route) => {
    await fulfillOutcome(route, resolved.history);
  });

  await page.route('**/api/ai/forecast', async (route) => {
    await fulfillOutcome(route, resolved.forecast);
  });
}

export { buildGoldenBook, buildGoldenMarket };
