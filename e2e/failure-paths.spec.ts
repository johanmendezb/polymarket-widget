import { expect, test, type Page } from '@playwright/test';

import { buildGoldenMarket, goldenRecommendation } from './fixtures/golden';
import { installApiMocks } from './fixtures/mockApi';
import { thinBook, thinMarket } from './fixtures/thin';

/**
 * T6.2 — the six failure paths (`docs/07-testing/TEST_STRATEGY.md`,
 * `docs/01-product/USER_FLOWS.md` §Failure flows). Each proves the widget
 * degrades the way the product spec promises, not merely that it avoids
 * crashing. Fully deterministic against fixture-derived mocks — no live
 * network, ADR-0011.
 */

async function openMarketDetail(page: Page): Promise<void> {
  await page.goto('/widget?theme=light');
  await page.getByRole('combobox').fill('fed');
  await page.getByRole('option').first().click();
}

test('1. gate fires: a wide-spread market yields NO_BET with a visible, citable reason', async ({ page }) => {
  await installApiMocks(page, {
    market: { kind: 'success', data: buildGoldenMarket({ bestBid: 0.3, bestAsk: 0.45, spread: 0.15 }) },
    forecast: {
      kind: 'success',
      data: { ...goldenRecommendation, verdict: 'NO_BET', reasons: ['SPREAD_TOO_WIDE'], suggestedFractionOfBankroll: null },
    },
  });
  await openMarketDetail(page);

  await page.getByRole('button', { name: 'Get a second opinion' }).click();
  await expect(page.getByText('No bet', { exact: true })).toBeVisible();

  const reasonSummary = page.getByText('Spread too wide', { exact: true });
  await expect(reasonSummary).toBeVisible();
  await reasonSummary.click();
  await expect(
    page.getByText('The quoted spread exceeds the claimed edge, so the edge would not survive actually trading it.'),
  ).toBeVisible();
});

test('2. AI route failure: the golden path still completes to a simulated position', async ({ page }) => {
  await installApiMocks(page, {
    forecast: { kind: 'error', code: 'INTERNAL', message: 'Simulated upstream failure.' },
  });
  await openMarketDetail(page);

  await page.getByRole('button', { name: 'Get a second opinion' }).click();
  await expect(page.getByText('Simulated upstream failure.')).toBeVisible();

  // AI is an independent data path (USER_FLOWS.md State B): the rest of the
  // widget is not allowed to know it failed.
  await page.getByRole('radiogroup', { name: 'Outcome' }).getByRole('radio').first().click();
  await page.locator('#order-amount-input').fill('25');
  await expect(page.getByText('Simulated order — no wallet, no signature, no funds move.')).toBeVisible();

  await page.getByRole('button', { name: 'Review bet' }).click();
  await page.getByRole('button', { name: 'Place simulated bet' }).click();
  await expect(page.getByText('Simulated. No funds moved.')).toBeVisible();
});

test('3. thin book: requesting more than the book holds caps the input and shows the maximum', async ({ page }) => {
  await installApiMocks(page, {
    search: { kind: 'success', data: { markets: [thinMarket], hasMore: false } },
    market: { kind: 'success', data: thinMarket },
    book: { kind: 'success', data: thinBook },
  });

  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/widget?theme=light');
  await page.getByRole('combobox').fill('israel');
  await page.getByRole('option').first().click();
  await page.getByRole('radiogroup', { name: 'Outcome' }).getByRole('radio').first().click();

  await page.getByRole('button', { name: 'shares' }).click();
  await page.locator('#order-amount-input').fill('5000');

  await expect(page.getByRole('button', { name: /Only [\d,.]+ shares available at this price/ })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('4. closed market: acceptingOrders false disables the ticket with an explanation', async ({ page }) => {
  await installApiMocks(page, {
    market: { kind: 'success', data: buildGoldenMarket({ acceptingOrders: false }) },
  });
  await openMarketDetail(page);

  await page.getByRole('radiogroup', { name: 'Outcome' }).getByRole('radio').first().click();

  await expect(
    page.getByText('This market is not accepting orders right now, so no fill can be priced. The ticket is disabled.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Market is not accepting orders' })).toBeDisabled();
  await expect(page.locator('#order-amount-input')).toBeDisabled();
});

test('5. upstream 429: the book renders "refreshing paused", not a generic error', async ({ page }) => {
  await installApiMocks(page, {
    book: { kind: 'error', code: 'UPSTREAM_RATE_LIMITED', message: 'Refreshing paused: upstream is rate-limiting requests.' },
  });
  await openMarketDetail(page);

  await page.getByRole('radiogroup', { name: 'Outcome' }).getByRole('radio').first().click();

  await expect(page.getByText('Refreshing paused: upstream is rate-limiting requests.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  // Distinct from the terminal closed-market case: the amount field is not disabled.
  await expect(page.locator('#order-amount-input')).toBeEnabled();
});

test('6. upstream shape change: a malformed market response degrades gracefully, no white screen', async ({ page }) => {
  await installApiMocks(page, {
    market: { kind: 'malformed' },
  });

  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/widget?theme=light');
  await page.getByRole('combobox').fill('fed');
  await page.getByRole('option').first().click();

  await expect(page.getByText('The server returned an unreadable response.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  // The shell itself is still alive, not a blank page.
  await expect(page.getByRole('button', { name: '← Back' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
