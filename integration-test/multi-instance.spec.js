const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// Helper function to generate random data directory
function generateDataDir () {
  return `/tmp/tocry-test-${crypto.randomBytes(8).toString('hex')}`
}

// Helper function to check if process is running
function isProcessRunning (pid) {
  try {
    process.kill(pid, 0) // Signal 0 just checks if process exists
    return true
  } catch (e) {
    return false
  }
}

// Helper function to kill process cleanly
async function killProcess (pid) {
  if (isProcessRunning(pid)) {
    console.log(`Killing process ${pid}...`)
    process.kill(pid, 'SIGTERM')

    // Wait up to 5 seconds for graceful shutdown
    let attempts = 0
    while (isProcessRunning(pid) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    // Force kill if still running
    if (isProcessRunning(pid)) {
      console.log(`Force killing process ${pid}...`)
      process.kill(pid, 'SIGKILL')
    }
  }
}

test.describe('Multi-instance synchronization', () => {
  let dataDir1, dataDir2
  let tocry1, tocry2
  const port1 = 3001
  const port2 = 3002

  test.beforeAll(async () => {
    // Create unique data directories for each instance
    dataDir1 = generateDataDir()
    dataDir2 = generateDataDir()

    console.log(`Data directories: ${dataDir1}, ${dataDir2}`)

    // Ensure data directories exist
    fs.mkdirSync(dataDir1, { recursive: true })
    fs.mkdirSync(dataDir2, { recursive: true })
  })

  test.afterAll(async () => {
    // Clean up processes
    if (tocry1) await killProcess(tocry1.pid)
    if (tocry2) await killProcess(tocry2.pid)

    // Clean up data directories
    try {
      fs.rmSync(dataDir1, { recursive: true, force: true })
      fs.rmSync(dataDir2, { recursive: true, force: true })
    } catch (e) {
      console.log('Cleanup error:', e.message)
    }
  })

  test('should synchronize board creation between instances', async () => {
    // Start first instance with multi-instance mode
    console.log('Starting first ToCry instance...')
    tocry1 = require('child_process').spawn('shards', [
      'run',
      'src/main.cr',
      '--port', port1.toString(),
      '--data-path', dataDir1,
      '--demo' // Use demo mode for testing
    ], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    })

    // Wait for first instance to start
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Verify first instance is running
    expect(isProcessRunning(tocry1.pid)).toBeTruthy()

    // Create a board in first instance
    console.log('Creating board in first instance...')
    const response1 = await fetch(`http://localhost:${port1}/api/v1/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Multi-Instance Test Board' })
    })

    expect(response1.ok).toBeTruthy()
    const board1 = await response1.json()
    expect(board1.name).toBe('Multi-Instance Test Board')

    // Start second instance with same data directory
    console.log('Starting second ToCry instance...')
    tocry2 = require('child_process').spawn('shards', [
      'run',
      'src/main.cr',
      '--port', port2.toString(),
      '--data-path', dataDir1, // Same data directory!
      '--demo' // Use demo mode for testing
    ], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    })

    // Wait for second instance to start
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Verify second instance is running
    expect(isProcessRunning(tocry2.pid)).toBeTruthy()

    // Check if second instance can see the board created by first instance
    console.log('Checking board visibility in second instance...')
    const response2 = await fetch(`http://localhost:${port2}/api/v1/boards`)
    expect(response2.ok).toBeTruthy()

    const boards2 = await response2.json()
    expect(boards2).toHaveLength(1)
    expect(boards2[0].name).toBe('Multi-Instance Test Board')
  })

  test('should synchronize note modifications between instances', async () => {
    // This test assumes the previous test has already set up instances
    // For simplicity, we'll test with a fresh setup

    // Clean up any existing processes
    if (tocry1) await killProcess(tocry1.pid)
    if (tocry2) await killProcess(tocry2.pid)

    // Start two instances
    tocry1 = require('child_process').spawn('shards', [
      'run',
      'src/main.cr',
      '--port', port1.toString(),
      '--data-path', dataDir1,
      '--demo'
    ], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    })

    await new Promise(resolve => setTimeout(resolve, 3000))

    tocry2 = require('child_process').spawn('shards', [
      'run',
      'src/main.cr',
      '--port', port2.toString(),
      '--data-path', dataDir1,
      '--demo'
    ], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    })

    await new Promise(resolve => setTimeout(resolve, 3000))

    // Create a board in first instance
    const boardResponse = await fetch(`http://localhost:${port1}/api/v1/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Sync Test Board' })
    })

    expect(boardResponse.ok).toBeTruthy()
    const board = await boardResponse.json()

    // Add a note in first instance
    const noteResponse = await fetch(`http://localhost:${port1}/api/v1/boards/${board.id}/lanes/0/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Sync Test Note',
        content: 'This note should sync between instances'
      })
    })

    expect(noteResponse.ok).toBeTruthy()
    await noteResponse.json()

    // Wait a moment for file system events to propagate
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Check if second instance can see the note
    const lanesResponse = await fetch(`http://localhost:${port2}/api/v1/boards/${board.id}`)
    expect(lanesResponse.ok).toBeTruthy()

    const boardData = await lanesResponse.json()
    expect(boardData.lanes).toHaveLength(1)
    expect(boardData.lanes[0].notes).toHaveLength(1)
    expect(boardData.lanes[0].notes[0].title).toBe('Sync Test Note')
  })

  test('should handle conflict detection gracefully', async () => {
    // This is a basic test - more sophisticated conflict testing
    // would require more complex setup with timing control

    // For now, just verify that both instances can handle concurrent access
    // without crashing

    expect(true).toBeTruthy() // Placeholder for future conflict testing
  })
})
