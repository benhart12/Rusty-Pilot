import { defineConfig } from 'vitest/config';
import path from 'path';

const isE2E = process.env.TEST_MODE === 'e2e';

export default defineConfig({
  test: {
    environment: 'node',
    include: isE2E ? ['e2e/**/*.spec.ts'] : ['src/**/*.test.ts'],
    exclude: ['node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
