import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Playwright specs live in e2e/ and are run by `pnpm test:e2e`.
    // test/live/ talks to production Polymarket and is run only by
    // `pnpm test:live`, through vitest.live.config.ts. No live network in CI,
    // ever: a flaky demo-day test is worse than no test. The exclusion is a
    // directory plus a separate config, not a filename convention.
    exclude: ['node_modules/**', '.next/**', 'e2e/**', 'test/live/**'],
    // Component tests opt into jsdom per file with a docblock:
    //   /** @vitest-environment jsdom */
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
  },
});
