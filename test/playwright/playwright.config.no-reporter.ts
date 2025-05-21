import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['list']],
  testDir: './tests',
});