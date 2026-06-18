import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      'node_modules/**',
      'apps/**', // Portal apps have their own vitest configs
      'dist/**',
      '.next/**',
      'tests/integration/**', // Requires live server + test DB
      'tests/e2e/**', // Requires live server + test DB
    ],
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules/**',
        'src/lib/audit/**', // Requires integration tests
        '**/*.test.ts',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
});
