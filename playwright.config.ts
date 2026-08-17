import { defineConfig, devices } from '@playwright/test';

/** Chromium only, deliberately: ADR-0011. Breadth is not worth the minutes. */
const port = Number(process.env.PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // Locale and timezone are pinned so `toLocaleString`/`toLocaleDateString` formatting
  // (share counts, dates) is identical wherever this runs — a CI runner's default
  // locale/timezone is not something T6.1's "fully deterministic" claim can depend on.
  use: { baseURL, trace: 'on-first-retry', locale: 'en-US', timezoneId: 'UTC' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && PORT=${port} pnpm start`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
