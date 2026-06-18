import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/utils/integration-setup.ts'],
    globalSetup: ['./tests/utils/global-setup.ts'],
    include: ['tests/integration/**/*.test.ts', 'tests/e2e/**/*.test.ts'],
    testTimeout: 60_000, // containers need more time
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules/**',
        '**/*.test.ts',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
