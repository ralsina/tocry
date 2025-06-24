import fs from 'fs/promises'
import path from 'path'
import os from 'os'

async function globalSetup () {
  console.log('Global setup: Preparing unique data directory...')
  let uniqueDataDir
  try {
    // Create a unique temporary directory for this test run's data
    // Using os.tmpdir() ensures it's in the system's temporary location
    uniqueDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tocry-test-data-'))
    console.log(`Using unique data directory: ${uniqueDataDir}`)

    // Set an environment variable that playwright.config.js can read
    // This is the mechanism to pass the dynamic path to the webServer command
    process.env.PLAYWRIGHT_TEST_DATA_DIR = uniqueDataDir

    // Return the path so globalTeardown can receive it as an argument
    return uniqueDataDir
  } catch (error) {
    console.error('Failed to prepare unique data directory during global setup:', error.message)
    // Exit with a non-zero code to stop the test run if setup fails.
    process.exit(1)
  }
}

export default globalSetup
