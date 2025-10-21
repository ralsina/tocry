import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Global teardown for Playwright tests
// This runs after all tests

export default async function globalTeardown (config) {
  console.log('🧹 Starting global test teardown')

  try {
    // Kill any remaining ToCry server processes on port 3001
    console.log('🔪 Checking for remaining server processes on port 3001...')

    try {
      // Find and kill any processes using port 3001
      await execAsync('lsof -ti:3001 | xargs -r kill -9 2>/dev/null || true')
      console.log('✅ Cleaned up port 3001')
    } catch (error) {
      // No processes found or error killing them - that's fine
      console.log('ℹ️ No processes found on port 3001 or cleanup completed')
    }

    try {
      // Also kill any crystal processes that might be test servers
      await execAsync("pgrep -f 'crystal.*src/main.cr' | xargs -r kill -9 2>/dev/null || true")
      console.log('✅ Cleaned up any remaining Crystal processes')
    } catch (error) {
      console.log('ℹ️ No Crystal processes found or cleanup completed')
    }
  } catch (error) {
    console.warn('⚠️ Warning during global cleanup:', error.message)
  }

  console.log('✅ Global teardown complete')
}
