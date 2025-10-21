import { cleanupLingeringProcesses } from './test-server.js'

// Global setup for Playwright tests
// Start a single server for all tests and clean up lingering processes
export default async function globalSetup (config) {
  console.log('🚀 Global test setup - starting shared server and cleaning up any lingering processes...')

  // Clean up any lingering test processes
  cleanupLingeringProcesses()

  // Start a single shared server for all tests
  const { startTestServer } = await import('./test-server.js')
  const serverInfo = await startTestServer({
    portRange: { start: 3100, end: 3100 }, // Fixed port for shared server
    keepAlive: true
  })

  // Store server info for tests to use
  process.env.TEST_SERVER_PORT = serverInfo.port.toString()
  process.env.TEST_SERVER_URL = serverInfo.baseUrl

  console.log(`✅ Global setup complete - shared ToCry server running on port ${serverInfo.port}`)

  // Return cleanup function for global teardown
  return async () => {
    console.log('🧹 Global teardown - stopping shared server...')
    const { stopTestServer } = await import('./test-server.js')
    await stopTestServer(serverInfo)
    console.log('✅ Shared server stopped')
  }
}
