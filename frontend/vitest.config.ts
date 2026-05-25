import { defineConfig } from 'vitest/config';

/** Saf util testleri — jsdom / React test ortamı gerekmez. */
export default defineConfig({
  test: {
    environment: 'node',
    include:       ['src/**/*.test.ts'],
    exclude:       ['node_modules/**'],
    testTimeout:   15_000,
  },
});
