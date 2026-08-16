import { expect, test } from '@playwright/test';

/**
 * Proves the container-query layout system and the explicit theme
 * parameter, per T4.1's acceptance criteria and ADR-0014. The widget's
 * document fills the viewport when loaded standalone (as it does inside a
 * host's iframe), so setting the page viewport width is equivalent to
 * changing the widget's own container width.
 */

test.describe('container queries drive layout, never the viewport', () => {
  test('stacks full-bleed with compact padding at 380px', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 600 });
    await page.goto('/widget?theme=light');

    const frame = page.getByTestId('widget-shell-frame');
    const padding = await frame.evaluate((el) => getComputedStyle(el).paddingLeft);
    const maxWidth = await frame.evaluate((el) => getComputedStyle(el).maxWidth);

    expect(padding).toBe('16px');
    expect(maxWidth).toBe('none');
  });

  test('caps width and grows padding once the container passes 640px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/widget?theme=light');

    const frame = page.getByTestId('widget-shell-frame');
    const padding = await frame.evaluate((el) => getComputedStyle(el).paddingLeft);
    const maxWidth = await frame.evaluate((el) => getComputedStyle(el).maxWidth);
    const box = await frame.boundingBox();

    expect(padding).toBe('24px');
    expect(maxWidth).toBe('640px');
    expect(box?.width).toBeLessThanOrEqual(640);
  });
});

test.describe('theme parameter', () => {
  test('light renders a light color-scheme and background', async ({ page }) => {
    await page.goto('/widget?theme=light');
    const shell = page.getByTestId('widget-shell');

    await expect(shell).toHaveAttribute('data-theme', 'light');
    const colorScheme = await shell.evaluate((el) => getComputedStyle(el).colorScheme);
    expect(colorScheme).toBe('light');
  });

  test('dark renders a dark color-scheme and a different background than light', async ({
    page,
  }) => {
    await page.goto('/widget?theme=dark');
    const shell = page.getByTestId('widget-shell');

    await expect(shell).toHaveAttribute('data-theme', 'dark');
    const colorScheme = await shell.evaluate((el) => getComputedStyle(el).colorScheme);
    expect(colorScheme).toBe('dark');

    const darkBackground = await shell.evaluate((el) => getComputedStyle(el).backgroundColor);

    await page.goto('/widget?theme=light');
    const lightBackground = await page
      .getByTestId('widget-shell')
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(darkBackground).not.toBe(lightBackground);
  });

  test('an unrecognised theme value falls back to auto rather than failing', async ({ page }) => {
    await page.goto('/widget?theme=nonsense');
    const shell = page.getByTestId('widget-shell');
    await expect(shell).toHaveAttribute('data-theme', 'auto');
  });
});

test('a fixture Recommendation renders through the shell with no page error', async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/widget?theme=light');

  await expect(page.getByTestId('fixture-recommendation')).toContainText('CONSIDER');
  expect(pageErrors).toEqual([]);
});
