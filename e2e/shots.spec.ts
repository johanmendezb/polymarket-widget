import { test } from '@playwright/test';
import { installApiMocks } from './fixtures/mockApi';
import { goldenMarket } from './fixtures/golden';

for (const theme of ['light', 'dark'] as const) {
  for (const [name, w] of [['narrow', 380], ['wide', 1100]] as const) {
    test(`shot ${theme} ${name}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await installApiMocks(page);
      await page.goto(`/widget?theme=${theme}`);
      await page.getByRole('combobox').fill('fed');
      await page.getByRole('option').first().waitFor();
      await page.screenshot({ path: `/tmp/shots/A-search-${theme}-${name}.png`, fullPage: true });
      await page.getByRole('option').first().click();
      await page.getByRole('heading', { name: goldenMarket.question }).waitFor();
      await page.getByRole('button', { name: 'Get a second opinion' }).click();
      await page.getByText('AI second opinion', { exact: true }).waitFor();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `/tmp/shots/B-detail-${theme}-${name}.png`, fullPage: true });
      await page.getByRole('radiogroup', { name: 'Outcome' }).getByRole('radio').first().click();
      await page.locator('#order-amount-input').fill('150000');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `/tmp/shots/C-preview-${theme}-${name}.png`, fullPage: true });
    });
  }
}
