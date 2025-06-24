import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    headless: true,
    trace: 'on-first-retry'
  },
  webServer: {
    // Command to start the backend server in test mode.
    // Pass the unique data directory generated in global-setup.js.
    // Use a fallback to 'data' if the environment variable is not yet set (e.g., during config loading).
    command: `../bin/tocry --data-path=${process.env.PLAYWRIGHT_TEST_DATA_DIR || 'data'}`,
    url: 'http://localhost:3000',
    timeout: 10 * 1000, // Increased timeout to give the server more time to start
    reuseExistingServer: !process.env.CI
  },
  globalSetup: require.resolve('./tests/global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js')
})
