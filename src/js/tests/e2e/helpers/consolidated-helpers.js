/**
 * Consolidated test helpers for ToCry E2E tests
 * Combines functionality from test-server.js, test-data-setup.js, test-setup.js, etc.
 */

import { spawn, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, createWriteStream, readFileSync, rmSync, writeFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Track active servers by port for cleanup
const activeServers = new Map()

/**
 * Create a unique test data directory
 * @returns {string} Path to the created test data directory
 */
export function createTestDataDir () {
  const testDataPath = `/tmp/test-data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${process.pid.toString(36)}`

  if (!existsSync(testDataPath)) {
    mkdirSync(testDataPath, { recursive: true })
  }

  // Create .version file to skip migrations and prevent logs/ from being treated as a board
  const versionFile = join(testDataPath, '.version')
  const projectRoot = join(__dirname, '../../../../..')
  try {
    const currentVersion = execSync('shards version', { cwd: projectRoot }).toString().trim()
    writeFileSync(versionFile, currentVersion)
    console.log(`📝 Created .version file with version: ${currentVersion}`)
  } catch (error) {
    console.error(`❌ Failed to create .version file: ${error.message}`)
    // Fallback to a known version
    writeFileSync(versionFile, '0.24.0')
  }

  return testDataPath
}

/**
 * Clean up a test data directory
 * @param {string} dataDir - Path to the test data directory to clean up
 */
export function cleanupTestDataDir (dataDir) {
  try {
    if (existsSync(dataDir)) {
      rmSync(dataDir, { recursive: true, force: true })
    }
  } catch (error) {
    console.log(`⚠️ Could not clean up test data directory: ${error.message}`)
  }
}

/**
 * Start a ToCry server on an available port
 * @param {Object} options - Server options
 * @returns {Promise<Object>} - Server info with port and cleanup function
 */
export async function startTestServer (options = {}) {
  const {
    portRange = { start: 3100, end: 3200 },
    timeout = 10000
  } = options

  const projectRoot = join(__dirname, '../../../../..')
  const testDataPath = createTestDataDir()

  for (let port = portRange.start; port <= portRange.end; port++) {
    try {
      console.log(`🚀 Starting ToCry server on port ${port}...`)

      // Create log directory for this test
      const logDir = join(testDataPath, 'logs')
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true })
      }
      const stdoutFile = join(logDir, 'server-stdout.log')
      const stderrFile = join(logDir, 'server-stderr.log')

      const binaryPath = join(projectRoot, 'bin', 'tocry')
      const serverProcess = spawn(binaryPath, [
        '--data-path=' + testDataPath,
        `--port=${port}`
      ], {
        cwd: projectRoot,
        stdio: 'pipe',
        detached: false
      })

      // Create log streams immediately
      const stdoutStream = createWriteStream(stdoutFile, { flags: 'a' })
      const stderrStream = createWriteStream(stderrFile, { flags: 'a' })

      let serverError = ''
      let serverReady = false

      const serverInfo = {
        process: serverProcess,
        port,
        testDataPath,
        logDir,
        stdoutFile,
        stderrFile,
        stdoutStream,
        stderrStream,
        baseUrl: `http://localhost:${port}`,
        cleanup: () => stopTestServer(serverInfo)
      }

      const result = await new Promise((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
          if (!serverReady) {
            serverProcess.kill('SIGKILL')
            reject(new Error(`Server startup timeout on port ${port}`))
          }
        }, timeout)

        // Tee the output to both our detection logic and log files
        serverProcess.stdout.on('data', (data) => {
          const output = data.toString()

          // Write to log file
          stdoutStream.write(output)

          // Check for startup completion
          if (!serverReady && output.includes('Kemal is ready to lead')) {
            serverReady = true
            clearTimeout(timeoutHandle)
            console.log(`✅ ToCry server started successfully on port ${port}`)

            // Track this server for cleanup
            activeServers.set(port, serverInfo)
            resolve(serverInfo)
          }
        })

        serverProcess.stderr.on('data', (data) => {
          const error = data.toString()
          serverError += error

          // Write to log file
          stderrStream.write(error)

          if (error.includes('Address already in use') || error.includes('EADDRINUSE')) {
            if (!serverReady) {
              clearTimeout(timeoutHandle)
              console.log(`⚠️ Port ${port} is in use, trying next port...`)
              serverProcess.kill()
              resolve('PORT_IN_USE')
            }
          }
        })

        serverProcess.on('exit', (code, signal) => {
          clearTimeout(timeoutHandle)
          if (!serverReady) {
            if (code !== 0 && code !== null) {
              if (serverError.includes('EADDRINUSE') || serverError.includes('Address already in use')) {
                console.log(`⚠️ Port ${port} is in use, trying next port...`)
                resolve('PORT_IN_USE')
              } else {
                console.log(`❌ Server on port ${port} exited with code ${code}`)
                console.log(`📝 Check logs: ${stderrFile}`)
                reject(new Error(`Server process exited with code ${code}: ${serverError}`))
              }
            } else if (signal) {
              console.log(`❌ Server on port ${port} killed by signal ${signal}`)
              console.log(`📝 Check logs: ${stderrFile}`)
              reject(new Error(`Server process killed by signal ${signal}`))
            }
          }
        })
      })

      if (result !== 'PORT_IN_USE') {
        return result
      }
    } catch (error) {
      console.log(`⚠️ Failed to start server on port ${port}: ${error.message}`)
      continue
    }
  }

  throw new Error(`Could not find an available port between ${portRange.start}-${portRange.end}`)
}

/**
 * Stop a specific test server
 * @param {Object} serverInfo - Server info from startTestServer
 */
export async function stopTestServer (serverInfo) {
  if (!serverInfo) {
    return
  }

  console.log(`🛑 Stopping ToCry server on port ${serverInfo.port}...`)

  try {
    // Remove from active servers tracking
    activeServers.delete(serverInfo.port)

    // Close log streams
    if (serverInfo.stdoutStream) {
      serverInfo.stdoutStream.end()
    }
    if (serverInfo.stderrStream) {
      serverInfo.stderrStream.end()
    }

    // Kill the process directly
    if (serverInfo.process) {
      serverInfo.process.kill('SIGKILL')
      console.log(`✅ ToCry server on port ${serverInfo.port} stopped`)
    }
  } catch (error) {
    console.log(`⚠️ Error stopping server on port ${serverInfo.port}:`, error.message)
  }
}

/**
 * Stop all active test servers
 */
export async function stopAllTestServers () {
  console.log(`🧹 Stopping all active test servers (${activeServers.size} servers)...`)

  const stopPromises = Array.from(activeServers.values()).map(serverInfo =>
    stopTestServer(serverInfo)
  )

  await Promise.all(stopPromises)
  console.log('✅ All test servers stopped')
}

/**
 * Show recent server logs for debugging
 * @param {Object} serverInfo - Server info from startTestServer
 * @param {number} lines - Number of lines to show from each log file
 */
export function showServerLogs (serverInfo, lines = 20) {
  if (!serverInfo || !serverInfo.logDir) {
    console.log('❌ No server log directory available')
    return
  }

  const { stdoutFile, stderrFile } = serverInfo
  console.log(`\n🔍 Server logs for port ${serverInfo.port}:`)
  console.log(`📁 Data directory: ${serverInfo.testDataPath}`)
  console.log(`📝 Log files: ${stdoutFile} and ${stderrFile}\n`)

  try {
    if (existsSync(stderrFile)) {
      const stderrContent = readFileSync(stderrFile, 'utf8')
      const stderrLines = stderrContent.trim().split('\n')
      console.log(`📋 Last ${lines} lines of server stderr:`)
      stderrLines.slice(-lines).forEach(line => console.log(`STDERR: ${line}`))
    }
  } catch (error) {
    console.log(`⚠️ Could not read stderr log: ${error.message}`)
  }

  try {
    if (existsSync(stdoutFile)) {
      const stdoutContent = readFileSync(stdoutFile, 'utf8')
      const stdoutLines = stdoutContent.trim().split('\n')
      console.log(`\n📋 Last ${lines} lines of server stdout:`)
      stdoutLines.slice(-lines).forEach(line => console.log(`STDOUT: ${line}`))
    }
  } catch (error) {
    console.log(`⚠️ Could not read stdout log: ${error.message}`)
  }
}

/**
 * Clean up any lingering test processes using lsof
 */
export function cleanupLingeringProcesses () {
  try {
    // Find any processes using our test port range and kill them
    for (let port = 3100; port <= 3200; port++) {
      try {
        const lsofOutput = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).toString().trim()
        if (lsofOutput) {
          const pid = parseInt(lsofOutput)
          console.log(`🔪 Found lingering process on port ${port} (PID: ${pid}), killing...`)
          execSync(`kill -9 ${pid}`, { stdio: 'inherit' })
        }
      } catch (error) {
        // No process using this port, which is good
      }
    }
  } catch (error) {
    console.log(`⚠️ Could not check for lingering processes: ${error.message}`)
  }
}

/**
 * Start a new server for this test
 * @returns {Promise<Object>} - Server info with cleanup function
 */
export async function getSharedServerInfo () {
  // Start a fresh server for each test
  const serverInfo = await startTestServer({
    portRange: { start: 3100, end: 3200 }, // Use port range for per-test servers
    keepAlive: false // Server will be cleaned up by test
  })

  return serverInfo
}

/**
 * Setup a fresh environment (no boards)
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} - Server info
 */
export async function setupFreshEnvironment (page, options = {}) {
  // Start a fresh server for this test
  const serverInfo = await getSharedServerInfo()

  // Navigate to the root - no data setup needed
  await page.goto(`${serverInfo.baseUrl}/`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  return { serverInfo }
}

/**
 * Setup a test board with specified lanes
 * @param {Page} page - Playwright page object
 * @param {Object} options - Setup options
 * @param {string} options.boardName - Name of the board to create
 * @param {Array<string>} options.laneNames - Names of lanes to create
 * @param {boolean} options.navigateToBoard - Whether to navigate to the board after setup
 * @returns {Promise<Object>} - Created board data and server info
 */
export async function setupTestBoard (page, options = {}) {
  const {
    boardName = 'test-board',
    laneNames = ['A', 'B', 'C'],
    navigateToBoard = true
  } = options

  // Start a fresh server for this test
  const serverInfo = await getSharedServerInfo()

  // Create the board via API
  const boardResponse = await page.request.post(`${serverInfo.baseUrl}/api/v1/boards`, {
    data: { name: boardName }
  })

  if (!boardResponse.ok()) {
    throw new Error(`Failed to create board: ${boardResponse.statusText()}`)
  }

  // Create lanes via API using board update endpoint
  const lanesPayload = laneNames.map(name => ({ name }))
  const updateResponse = await page.request.put(`${serverInfo.baseUrl}/api/v1/boards/${boardName}`, {
    data: { lanes: lanesPayload }
  })
  if (!updateResponse.ok()) {
    throw new Error(`Failed to create lanes: ${updateResponse.statusText()}`)
  }

  // Get the board details after updating with lanes
  const boardDetailsResponse = await page.request.get(`${serverInfo.baseUrl}/api/v1/boards/${boardName}`)
  if (!boardDetailsResponse.ok()) {
    throw new Error(`Failed to get board details: ${boardDetailsResponse.statusText()}`)
  }
  const board = await boardDetailsResponse.json()

  if (navigateToBoard) {
    // Navigate to the board (use board name, not ID)
    await page.goto(`${serverInfo.baseUrl}/b/${board.name}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  }

  return { board, serverInfo }
}

/**
 * Setup a board with existing notes (for testing note operations)
 * @param {Page} page - Playwright page object
 * @param {Object} options - Setup options
 * @returns {Promise<Object>} - Created board data and server info
 */
export async function setupBoardWithNotes (page, options = {}) {
  const {
    boardName = 'notes-test-board',
    laneNames = ['Todo', 'Doing', 'Done'],
    notes = {
      Todo: ['Task 1', 'Task 2'],
      Doing: ['Task 3'],
      Done: ['Task 4', 'Task 5']
    }
  } = options

  // Start a fresh server for this test
  const serverInfo = await getSharedServerInfo()

  // Create the board via API
  const boardResponse = await page.request.post(`${serverInfo.baseUrl}/api/v1/boards`, {
    data: { name: boardName }
  })

  if (!boardResponse.ok()) {
    throw new Error(`Failed to create board: ${boardResponse.statusText()}`)
  }

  const board = await boardResponse.json()

  // Create lanes and notes
  for (const laneName of laneNames) {
    // Create lane
    const laneResponse = await page.request.post(`${serverInfo.baseUrl}/api/v1/boards/${board.id}/lanes`, {
      data: { name: laneName }
    })

    if (!laneResponse.ok()) {
      throw new Error(`Failed to create lane '${laneName}': ${laneResponse.statusText()}`)
    }

    const lane = await laneResponse.json()

    // Create notes in this lane
    const noteTitles = notes[laneName] || []
    for (const noteTitle of noteTitles) {
      const noteResponse = await page.request.post(`${serverInfo.baseUrl}/api/v1/boards/${board.id}/lanes/${lane.id}/notes`, {
        data: { title: noteTitle }
      })

      if (!noteResponse.ok()) {
        throw new Error(`Failed to create note '${noteTitle}': ${noteResponse.statusText()}`)
      }
    }
  }

  // Navigate to the board
  await page.goto(`${serverInfo.baseUrl}/b/${board.id}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  return { board, serverInfo }
}

/**
 * Cleanup a test board
 * @param {Page} page - Playwright page object
 * @param {string} boardName - Name of the board to delete
 * @param {Object} serverInfo - Server info
 */
export async function cleanupTestBoard (page, boardName, serverInfo) {
  try {
    const response = await page.request.delete(`${serverInfo.baseUrl}/api/v1/boards/${boardName}`)
    if (!response.ok()) {
      console.log(`⚠️ Failed to delete board '${boardName}': ${response.statusText()}`)
    }
  } catch (error) {
    console.log(`⚠️ Error cleaning up test board: ${error.message}`)
  }
}

// ============================================================================
// LANE MANAGEMENT HELPERS
// ============================================================================

/**
 * Get lane element by name using test ID
 * @param {Page} page - Playwright page object
 * @param {string} laneName - Name of the lane
 * @returns {Locator} Lane element locator
 */
export function getLaneByName (page, laneName) {
  return page.locator(`[data-testid="lane-${laneName}"]`)
}

/**
 * Get lane header element by name using test ID
 * @param {Page} page - Playwright page object
 * @param {string} laneName - Name of the lane
 * @returns {Locator} Lane header element locator
 */
export function getLaneHeaderByName (page, laneName) {
  return page.locator(`[data-testid="lane-header-${laneName}"]`)
}

/**
 * Get lane name span element by name using test ID
 * @param {Page} page - Playwright page object
 * @param {string} laneName - Name of the lane
 * @returns {Locator} Lane name span element locator
 */
export function getLaneNameElement (page, laneName) {
  return page.locator(`[data-testid="lane-name-${laneName}"]`)
}

/**
 * Get all lane elements in order
 * @param {Page} page - Playwright page object
 * @returns {Locator} All lane elements
 */
export function getAllLanes (page) {
  return page.locator('.lane')
}

/**
 * Get current lane order from DOM
 * @param {Page} page - Playwright page object
 * @returns {Promise<string[]>} Array of lane names in current order
 */
export async function getCurrentLaneOrder (page) {
  const lanes = getAllLanes(page)
  const laneCount = await lanes.count()
  const laneNames = []

  for (let i = 0; i < laneCount; i++) {
    const laneName = await lanes.nth(i).locator('[data-testid^="lane-name-"]').textContent()
    if (laneName) {
      laneNames.push(laneName.trim())
    }
  }

  return laneNames
}

/**
 * Wait for lane reordering to complete and verify the expected order
 * @param {Page} page - Playwright page object
 * @param {string[]} expectedOrder - Expected lane order
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} True if order matches expected
 */
export async function waitForLaneOrder (page, expectedOrder, timeout = 5000) {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const currentOrder = await getCurrentLaneOrder(page)

    if (JSON.stringify(currentOrder) === JSON.stringify(expectedOrder)) {
      return true
    }

    // Wait a bit before checking again
    await page.waitForTimeout(100)
  }

  // Final check with timeout error
  const currentOrder = await getCurrentLaneOrder(page)
  if (JSON.stringify(currentOrder) !== JSON.stringify(expectedOrder)) {
    throw new Error(`Lane order mismatch after ${timeout}ms. Expected: [${expectedOrder.join(', ')}], Got: [${currentOrder.join(', ')}]`)
  }

  return true
}

/**
 * Perform lane drag and drop operation with validation
 * @param {Page} page - Playwright page object
 * @param {string} sourceLaneName - Name of the lane to drag
 * @param {string} targetLaneName - Name of the lane to drop on
 * @param {string[]} expectedOrder - Expected lane order after drag
 * @returns {Promise<void>}
 */
export async function dragLaneWithValidation (page, sourceLaneName, targetLaneName, expectedOrder) {
  console.log(`Dragging lane '${sourceLaneName}' to position of '${targetLaneName}'`)

  // Get source and target lanes
  const sourceLane = getLaneByName(page, sourceLaneName)
  const targetLane = getLaneByName(page, targetLaneName)

  // Verify both lanes exist and are visible
  await sourceLane.waitFor({ state: 'visible' })
  await targetLane.waitFor({ state: 'visible' })

  // Get initial order for logging
  const initialOrder = await getCurrentLaneOrder(page)
  console.log('Initial lane order:', initialOrder)

  // Perform the drag operation
  await sourceLane.dragTo(targetLane)

  // Wait for the reordering to complete with validation
  await waitForLaneOrder(page, expectedOrder)

  // Verify final order
  const finalOrder = await getCurrentLaneOrder(page)
  console.log('Final lane order:', finalOrder)

  // Double-check the order is correct
  if (JSON.stringify(finalOrder) !== JSON.stringify(expectedOrder)) {
    throw new Error(`Lane reordering failed. Expected: [${expectedOrder.join(', ')}], Got: [${finalOrder.join(', ')}]`)
  }
}

/**
 * Wait for API call to complete (board update)
 * @param {Page} page - Playwright page object
 * @param {string} boardName - Name of the board being updated
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<void>}
 */
export async function waitForBoardUpdate (page, boardName, timeout = 3000) {
  // Wait for the board update API call to complete
  // This is a simplified version - in a real implementation you might want to
  // intercept the network request and wait for it specifically
  await page.waitForTimeout(500)

  // Additional verification could be added here, such as:
  // - Checking for success/error messages
  // - Verifying the board state via API
  // - Monitoring network requests
}

/**
 * Setup lane management board with specific lanes
 * @param {Page} page - Playwright page object
 * @param {string} boardName - Name of the board to create
 * @param {string[]} laneNames - Array of lane names to create
 * @returns {Promise<Object>} Board information
 */
export async function setupLaneManagementBoard (page, boardName = 'lane-management-test', laneNames = ['A', 'B', 'C']) {
  // Import and use existing setup function if available
  const { setupTestBoard } = await import('./consolidated-helpers.js')

  return setupTestBoard(page, {
    boardName,
    laneNames
  })
}
