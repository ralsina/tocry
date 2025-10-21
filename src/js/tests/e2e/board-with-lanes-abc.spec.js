import { test, expect } from '@playwright/test'
import { setupTestBoard } from './helpers/consolidated-helpers.js'

test.describe('Board with Lanes A, B, C', () => {
  let serverInfo = null

  test.afterEach(async () => {
    // Clean up the server after each test, regardless of test outcome
    if (serverInfo) {
      console.log(`🧹 Cleaning up server on port ${serverInfo.port}...`)
      await serverInfo.cleanup()
      console.log('✅ Server cleanup completed')
    }
  })

  test('should display board with lanes A, B, C', async ({ page }) => {
    // Setup a board with lanes A, B, C
    const setup = await setupTestBoard(page, {
      boardName: 'test-board-abc',
      laneNames: ['A', 'B', 'C']
    })

    // Store server info for cleanup
    serverInfo = setup.serverInfo

    // Should see the board is loaded
    await expect(page.locator('.lane')).toHaveCount(3)

    // Should see lanes with correct names
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()
  })
})
