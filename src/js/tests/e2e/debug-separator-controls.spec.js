import { test, expect } from '@playwright/test'
import { setupTestBoard } from './helpers/consolidated-helpers.js'

test.describe('Debug Separator Controls', () => {
  let serverInfo = null

  test.afterEach(async () => {
    // Clean up the server after each test, regardless of test outcome
    if (serverInfo) {
      console.log(`🧹 Cleaning up server on port ${serverInfo.port}...`)
      await serverInfo.cleanup()
      console.log('✅ Server cleanup completed')
    }
  })

  test('debug separator control behavior', async ({ page }) => {
    // Setup board with ABC lanes
    const setup = await setupTestBoard(page, {
      boardName: 'debug-separator-controls',
      laneNames: ['A', 'B', 'C']
    })

    // Store server info for cleanup
    serverInfo = setup.serverInfo

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Debug: Check board state and control availability
    const debugInfo = await page.evaluate(() => {
      const appData = document.querySelector('[x-data="toCryApp"]')._x_dataStack[0]
      const board = appData.currentBoard
      const separator = document.querySelector('.lane-separator')
      const rightControl = separator?.querySelector('.separator-control-right')
      const leftControl = separator?.querySelector('.separator-control-left')

      return {
        hasBoard: !!board,
        boardName: board?.name,
        firstVisibleLane: board?.firstVisibleLane,
        lanesCount: board?.lanes?.length,
        laneNames: board?.lanes?.map(l => l.name),
        rightControlExists: !!rightControl,
        rightControlDisabled: rightControl?.disabled,
        leftControlExists: !!leftControl,
        leftControlDisabled: leftControl?.disabled,
        // Try to call the Alpine functions directly
        canIncreaseFirstVisibleLane: appData.canIncreaseFirstVisibleLane?.(),
        canDecreaseFirstVisibleLane: appData.canDecreaseFirstVisibleLane?.(),
        // Check the computed disabled states
        rightControlComputedDisabled: rightControl?.hasAttribute('disabled'),
        leftControlComputedDisabled: leftControl?.hasAttribute('disabled')
      }
    })

    console.log('Debug info:', JSON.stringify(debugInfo, null, 2))

    // Verify initial state
    expect(debugInfo.hasBoard).toBe(true)
    expect(debugInfo.lanesCount).toBe(3)
    expect(debugInfo.firstVisibleLane).toBe(0)

    // Check if controls exist
    expect(debugInfo.rightControlExists).toBe(true)
    expect(debugInfo.leftControlExists).toBe(true)

    // Log the disabled states for investigation
    console.log('Right control disabled:', debugInfo.rightControlDisabled)
    console.log('Left control disabled:', debugInfo.leftControlDisabled)
    console.log('canIncreaseFirstVisibleLane:', debugInfo.canIncreaseFirstVisibleLane)
    console.log('canDecreaseFirstVisibleLane:', debugInfo.canDecreaseFirstVisibleLane)

    // Based on our understanding, the right control should be enabled for 3 lanes
    // and left control should be disabled when firstVisibleLane = 0
    expect(debugInfo.canDecreaseFirstVisibleLane).toBe(false)
    expect(debugInfo.canIncreaseFirstVisibleLane).toBe(true)

    // The controls should match these computed values
    expect(debugInfo.leftControlComputedDisabled).toBe(true)
    expect(debugInfo.rightControlComputedDisabled).toBe(false)
  })
})
