import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 3 * 1000,
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
    command: '../bin/tocry --data-path=testdata',
    url: 'http://localhost:3000',
    timeout: 10 * 1000, // Increased timeout to give the server more time to start
    reuseExistingServer: !process.env.CI
  },
  globalSetup: undefined
})
