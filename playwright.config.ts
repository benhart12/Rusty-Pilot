// Playwright config kept for future browser-based testing.
// Current smoke tests run via Vitest (npm run test:e2e) using fetch-based HTTP checks.
// Browser-based tests can be added here once a compatible environment is available.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'https://rustypilot-production.up.railway.app',
    headless: true,
  },
  timeout: 30000,
});
