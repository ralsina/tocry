import { test } from '@playwright/test'
import { setupTestBoard } from './helpers/consolidated-helpers.js'

test.describe('Alpine Store Debugging', () => {
  let serverInfo = null

  test.afterEach(async () => {
    // Clean up the server after each test, regardless of test outcome
    if (serverInfo) {
      console.log(`🧹 Cleaning up server on port ${serverInfo.port}...`)
      await serverInfo.cleanup()
      console.log('✅ Server cleanup completed')
    }
  })

  test('should access Alpine store correctly', async ({ page }) => {
    // Setup a board with lanes first
    serverInfo = (await setupTestBoard(page, {
      boardName: 'debug-board',
      laneNames: ['A', 'B', 'C']
    })).serverInfo

    // Try different ways to access the Alpine data
    const debugData = await page.evaluate(() => {
      return {
        // Method 1: Check if Alpine exists
        alpineExists: !!window.Alpine,
        // Method 2: Check store function
        storeFunctionExists: !!window.Alpine?.store,
        // Method 3: Try to access the toCryApp component data
        // The component is on the div with x-data="toCryApp"
        toCryAppElement: !!document.querySelector('[x-data="toCryApp"]'),
        // Method 4: Try to access Alpine data from the element
        alpineData: (() => {
          const element = document.querySelector('[x-data="toCryApp"]')
          if (element && element._x_dataStack) {
            return element._x_dataStack[0] // Get the first item in the data stack
          }
          return null
        })()
      }
    })

    console.log('Debug data:', JSON.stringify(debugData, (key, value) => {
      // Handle circular references by excluding problematic properties
      if (key === 'store' || key === 'themeManager' || key === 'api') {
        return '[Object]'
      }
      return value
    }, 2))

    // If we have Alpine data, let's see its structure
    if (debugData.alpineData) {
      const appStructure = await page.evaluate(() => {
        const element = document.querySelector('[x-data="toCryApp"]')
        if (element && element._x_dataStack) {
          const appData = element._x_dataStack[0]
          return {
            keys: Object.keys(appData),
            hasCurrentBoard: !!appData.currentBoard,
            hasBoards: !!appData.boards && appData.boards.length > 0,
            currentBoardName: appData.currentBoardName,
            boardsCount: appData.boards?.length || 0,
            // If currentBoard exists, get its structure
            currentBoard: appData.currentBoard
              ? {
                  keys: Object.keys(appData.currentBoard),
                  firstVisibleLane: appData.currentBoard.firstVisibleLane,
                  lanes: appData.currentBoard.lanes?.length || 0,
                  laneNames: appData.currentBoard.lanes?.map(l => l.name) || []
                }
              : null
          }
        }
        return null
      })
      console.log('App structure:', JSON.stringify(appStructure, (key, value) => {
        // Handle circular references by excluding problematic properties
        if (key === 'store' || key === 'themeManager' || key === 'api') {
          return '[Object]'
        }
        return value
      }, 2))
    }
  })
})
