import { expect, test } from '@playwright/test';

import { installApiMocks } from './fixtures/mockApi';
import { goldenMarket } from './fixtures/golden';

/**
 * T6.1 — the golden path, fully deterministic against fixture-derived
 * mocks (ADR-0011, `docs/06-execution/BACKLOG.md` T6.1). Search, select,
 * open detail, request the AI second opinion, select an outcome, enter an
 * amount, confirm, verify the position.
 *
 * The five preview values are asserted against numbers computed
 * independently below — by hand-walking the same three real recorded ask
 * levels the mock serves (`test/fixtures/clob-book-liquid.json`, top three
 * levels: 0.75 / 0.76 / 0.77) — not by calling `walkBook`/`computeFee` from
 * `src/simulation`. A test that called the app's own book-walk to compute
 * its own expected value would still pass against a broken book walk; see
 * `docs/07-testing/TEST_STRATEGY.md` and the polymarket-domain skill.
 *
 * Entering $150,000 crosses from level 1 into level 2 and partway into
 * level 3, on purpose: at this book's actual depth (~$68k resting at the
 * top level alone), nothing smaller shows a non-zero price impact, and a
 * preview that never crosses a level cannot prove the VWAP wiring — the
 * exact defect this test exists to catch (`polymarket-domain` skill, trap 1
 * and `TEST_STRATEGY.md` test #1).
 *
 * Hand computation (budget-walk algorithm, `walkAsksForBudget`):
 *   level 1: 90,953.73 sh @ 0.75  -> cost 68,215.2975   (full level, budget remaining 81,784.7025)
 *   level 2: 96,758.01 sh @ 0.76  -> cost 73,536.0876   (full level, budget remaining  8,248.6149)
 *   level 3: 8,248.6149 / 0.77 = 10,712.486883... sh @ 0.77 (partial, budget exhausted)
 *   sharesFilled = 198,424.226883...            -> "198,424.23"
 *   grossCost    = 150,000.00 (the full budget)
 *   averagePrice = 150,000 / 198,424.226883... = 0.755956076...   -> "75.6c" (best "75.0c")
 *   fee = shares * 0.05 * p * (1-p), p = averagePrice
 *       = 198,424.226883 * 0.05 * 0.755956076 * 0.244043924
 *       = 1,830.32943 (rounded to 5dp)                            -> "$1830.33"
 *   totalCost = grossCost + fee = 151,830.32943                   -> "$151830.33"
 *   payoutIfWin = sharesFilled                                    -> "$198424.23"
 *   netProfitIfWin = payoutIfWin - totalCost = 46,593.897453...   -> "$46593.90"
 */

const EXPECTED = {
  shares: '198,424.23',
  avgPriceCents: '75.6c',
  topOfBookCents: '75.0c',
  fee: '$1830.33',
  totalCost: '$151830.33',
  payout: '$198424.23',
  netProfit: '$46593.90',
} as const;

test('golden path: search, AI second opinion, preview, confirm, position', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await installApiMocks(page);
  await page.goto('/widget?theme=light');

  // --- State A: search ------------------------------------------------
  await page.getByRole('combobox').fill('fed');
  const resultOption = page.getByRole('option').first();
  await expect(resultOption).toContainText(goldenMarket.question);
  await resultOption.click();

  // --- State B: market detail ------------------------------------------
  await expect(page.getByRole('heading', { name: goldenMarket.question })).toBeVisible();

  // AI second opinion: independent data path, user-invoked (USER_FLOWS.md State B).
  await page.getByRole('button', { name: 'Get a second opinion' }).click();
  await expect(page.getByText('AI second opinion', { exact: true })).toBeVisible();
  // The outcome under estimate is context, not the verdict. Asserting the two
  // separately is the point: "AI second opinion — Yes" used to read as a
  // verdict of Yes sitting next to the title.
  await expect(page.getByText('Estimating the probability of “Yes”')).toBeVisible();
  await expect(page.getByText('Consider', { exact: true })).toBeVisible();

  // Select the Yes outcome -> State C.
  await page.getByRole('radiogroup', { name: 'Outcome' }).getByRole('radio').first().click();

  // --- State C: order preview -------------------------------------------
  await expect(page.getByText('Simulated order — no wallet, no signature, no funds move.')).toBeVisible();
  await page.locator('#order-amount-input').fill('150000');

  const previewLine = (label: string | RegExp) => page.getByText(label, { exact: typeof label === 'string' }).locator('xpath=following-sibling::dd[1]');

  await expect(previewLine('Shares')).toHaveText(EXPECTED.shares);
  await expect(previewLine('Avg. price')).toContainText(EXPECTED.avgPriceCents);
  await expect(previewLine('Avg. price')).toContainText(`best ${EXPECTED.topOfBookCents}`);
  await expect(previewLine(/^Fee \(/)).toHaveText(EXPECTED.fee);
  await expect(previewLine('Total cost')).toHaveText(EXPECTED.totalCost);
  const payoutLine = previewLine('If Yes resolves, you receive');
  await expect(payoutLine).toContainText(EXPECTED.payout);
  await expect(payoutLine).toContainText(`+${EXPECTED.netProfit}`);

  const reviewButton = page.getByRole('button', { name: 'Review bet' });
  await expect(reviewButton).toBeEnabled();
  await reviewButton.click();
  await page.getByRole('button', { name: 'Place simulated bet' }).click();

  // --- State D: confirmation ---------------------------------------------
  await expect(page.getByText('Simulated. No funds moved.')).toBeVisible();
  const confirmationLine = (label: string | RegExp) => page.getByText(label, { exact: typeof label === 'string' }).locator('xpath=following-sibling::dd[1]');

  await expect(confirmationLine('Shares')).toHaveText(EXPECTED.shares);
  await expect(confirmationLine('Entry avg. price')).toHaveText(EXPECTED.avgPriceCents);
  await expect(confirmationLine('Fee paid')).toHaveText(EXPECTED.fee);
  await expect(confirmationLine('Total cost')).toHaveText(EXPECTED.totalCost);
  const confirmedPayout = confirmationLine('If Yes resolves, you receive');
  await expect(confirmedPayout).toContainText(EXPECTED.payout);
  await expect(confirmedPayout).toContainText(`+${EXPECTED.netProfit}`);

  // The position list, in-memory for the session.
  const positionRow = page.locator('li', { hasText: goldenMarket.question });
  await expect(positionRow).toContainText('Yes');
  await expect(positionRow).toContainText(`${EXPECTED.shares} shares`);
  await expect(positionRow).toContainText(EXPECTED.totalCost);

  expect(pageErrors).toEqual([]);
});
