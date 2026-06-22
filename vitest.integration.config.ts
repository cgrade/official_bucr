import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.integration.ts'],
    include: ['tests/integration/**/*.test.ts', 'tests/e2e/**/*.test.ts'],
    exclude: ['node_modules/**', 'apps/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false, // DB tests run sequentially
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
});
