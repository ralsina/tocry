/**
 * Simple test server manager that handles per-test server lifecycle
 */

import { spawn, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, createWriteStream, readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Track active servers by port for cleanup
const activeServers = new Map()

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
  // Enhanced uniqueness: use timestamp + random + process ID
  const timestamp = Date.now()
  const randomPart = Math.random().toString(36).substr(2, 9)
  const processId = process.pid.toString(36)
  const testDataPath = `/tmp/test-data-${timestamp}-${randomPart}-${processId}`

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

        serverProcess.on('error', (error) => {
          clearTimeout(timeoutHandle)
          if (!serverReady && (error.message.includes('EADDRINUSE') || error.message.includes('Address already in use'))) {
            console.log(`⚠️ Port ${port} is in use, trying next port...`)
            resolve('PORT_IN_USE')
          } else {
            reject(error)
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

      // Port in use, clean up and try next
      try {
        serverProcess.kill()
      } catch (e) {
        // Process already dead
      }
    } catch (error) {
      console.log(`⚠️ Failed to start server on port ${port}: ${error.message}`)
      continue
    }
  }

  throw new Error(`Could not find an available port between ${portRange.start}-${portRange.end}`)
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
 * Stop a specific test server
 * @param {Object} serverInfo - Server info from startTestServer
 */
export async function stopTestServer (serverInfo) {
  if (!serverInfo || !serverInfo.port) {
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
      } catch (e) {
        // No process on this port, that's fine
      }
    }
  } catch (error) {
    console.log('⚠️ Error during cleanup:', error.message)
  }
}
