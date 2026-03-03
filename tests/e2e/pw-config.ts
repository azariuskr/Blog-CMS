import { defineConfig } from '@playwright/test';
export default defineConfig({
  timeout: 120000,
  use: {
    headless: true,
    ignoreHTTPSErrors: true,
  },
});
