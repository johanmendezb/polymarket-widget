import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * The live contract suite, run by `pnpm test:live` and by nothing else.
 *
 * It is a separate config, not a naming convention, because the exclusion has
 * to survive someone forgetting it. `vitest.config.ts` — the only config CI
 * ever runs — excludes `test/live/**` outright, so there is no invocation of
 * `pnpm test` that reaches the network.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/live/**/*.live.test.ts'],
    // Production Polymarket, over the public internet, sometimes cold.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // One suite, ordered output, so a failure reads as a report.
    fileParallelism: false,
  },
});
