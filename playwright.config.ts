import { defineConfig } from '@playwright/test';
import { E2E_ADMIN_PASSWORD } from './tests/e2e/helpers';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1, // one shared SQLite file — never parallelize (Appendix B.13)
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: '3100', DATABASE_PATH: '.data/e2e.db', ADMIN_PASSWORD: E2E_ADMIN_PASSWORD },
  },
});
