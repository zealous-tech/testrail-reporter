import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['@zealteam/testrail-reporter']],
  globalTimeout: 60 * 60 * 1000,
});
