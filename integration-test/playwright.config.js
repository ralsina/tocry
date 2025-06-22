import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    // Command to start the backend server in test mode.
    // This assumes KEMAL_ENV=test is used in the Crystal app to enable test-specific features.
    command: '../bin/tocry',
    url: 'http://localhost:3000',
    timeout: 2 * 1000, // Give server plenty of time to start
    reuseExistingServer: !process.env.CI,
  },
  globalSetup: require.resolve('./tests/global-setup.js'),
});
