import { defineConfig } from '@playwright/test';
import { browserChannel } from './scripts/browser-channel.mjs';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1, // one shared SQLite file — never parallelize (Appendix B.13)
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    channel: browserChannel(),
  },
});
