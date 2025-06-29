import { defineConfig, devices } from '@playwright/test'

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
  globalSetup: undefined,

  projects: [
    {
      name: 'No Auth',
      use: {
        ...process.env.CI ? { headless: true } : {},
        baseURL: 'http://localhost:3000',
        browserName: 'chromium',
        headless: true,
        trace: 'on-first-retry'
      },
      webServer: {
        command: '../bin/tocry --data-path=testdata',
        url: 'http://localhost:3000',
        timeout: 10 * 1000,
        reuseExistingServer: !process.env.CI
      }
    },
    {
      name: 'Simple Auth',
      use: {
        ...process.env.CI ? { headless: true } : {},
        baseURL: 'http://localhost:3000',
        browserName: 'chromium',
        headless: true,
        trace: 'on-first-retry'
      },
      webServer: {
        command: 'TOCRY_AUTH_USER=testuser TOCRY_AUTH_PASS=testpass ../bin/tocry --data-path=testdata',
        url: 'http://localhost:3000',
        timeout: 10 * 1000,
        reuseExistingServer: !process.env.CI
      }
    },
    {
      name: 'Google Auth',
      use: {
        ...devices['Desktop Chrome'],
        env: {
          TOCRY_FAKE_AUTH_USER: 'test@example.com'
        }
      },
      webServer: {
        command: 'TOCRY_FAKE_AUTH_USER=test@example.com GOOGLE_CLIENT_ID=dummy GOOGLE_CLIENT_SECRET=dummy ../bin/tocry --data-path=testdata',
        url: 'http://localhost:3000',
        timeout: 10 * 1000,
        reuseExistingServer: !process.env.CI
      }
    }

  ]
})
