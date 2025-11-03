import { test, expect } from '@playwright/test'
import { setupFreshEnvironment } from './helpers/consolidated-helpers.js'

test.describe('Color Scheme Functionality', () => {
  let serverInfo = null

  test.afterEach(async () => {
    // Clean up the server after each test, regardless of test outcome
    if (serverInfo) {
      console.log(`🧹 Cleaning up server on port ${serverInfo.port}...`)
      await serverInfo.cleanup()
      console.log('✅ Server cleanup completed')
    }
  })

  test('should persist color scheme changes across page reloads', async ({ page }) => {
    // Setup fresh environment (no pre-existing data)
    serverInfo = (await setupFreshEnvironment(page)).serverInfo

    // Wait for the welcome screen and create a board
    await page.waitForSelector('[x-show="!loading && !loadingBoardFromUrl && !currentBoard && boards.length === 0 && !boardNotFound"]', { state: 'visible' })

    // Create a new board
    await page.waitForSelector('button:has-text("Create Your First Board")', { state: 'visible' })

    // Handle the prompt dialog for board name
    page.on('dialog', async dialog => {
      await dialog.accept('Color Test Board')
    })

    await page.click('button:has-text("Create Your First Board")')

    // Wait for the board to load
    await page.waitForSelector('[x-show="currentBoard && !boardNotFound"]', { state: 'visible' })
    await page.waitForTimeout(1000)

    // Test 1: Set color to Red
    console.log('🔴 Testing: Setting color scheme to Red')

    // Click the color swatch to open the selector
    await page.click('#current-color-swatch')

    // Wait for the dropdown to be visible
    await page.waitForSelector('#color-scheme-switcher', { state: 'visible' })

    // Verify the dropdown shows the correct initial color (should be blue by default)
    const initialColorSelect = page.locator('#color-scheme-switcher')
    await expect(initialColorSelect).toHaveValue('blue')

    // Change color to Red
    await page.selectOption('#color-scheme-switcher', 'red')

    // Verify the color swatch shows red (check the background color style)
    const colorSwatch = page.locator('#current-color-swatch')
    await expect(colorSwatch).toHaveCSS('background-color', /rgb\(255,\s*0,\s*0\)/) // Red color

    // Test 2: Reload and verify persistence
    console.log('🔄 Testing: Reloading page to verify persistence')
    await page.reload()

    // Wait for the board to load again
    await page.waitForSelector('[x-show="currentBoard && !boardNotFound"]', { state: 'visible' })
    await page.waitForTimeout(1000)

    // Verify the color swatch still shows red
    const colorSwatchAfterReload = page.locator('#current-color-swatch')
    await expect(colorSwatchAfterReload).toHaveCSS('background-color', /rgb\(255,\s*0,\s*0\)/) // Red color

    // Test 3: Click swatch and verify dropdown shows correct value
    console.log('🎯 Testing: Clicking color swatch to verify dropdown shows "Red"')

    // Click the color swatch to open the selector
    await page.click('#current-color-swatch')

    // Wait for the dropdown to be visible
    await page.waitForSelector('#color-scheme-switcher', { state: 'visible' })

    // Verify the dropdown now shows "Red"
    const colorSelectAfterReload = page.locator('#color-scheme-switcher')
    await expect(colorSelectAfterReload).toHaveValue('red')

    // Test 4: Change color to Pink
    console.log('🩷 Testing: Changing color scheme to Pink')

    // Change color to Pink
    await page.selectOption('#color-scheme-switcher', 'pink')

    // Verify the color swatch shows pink
    const colorSwatchPink = page.locator('#current-color-swatch')
    await expect(colorSwatchPink).toHaveCSS('background-color', /rgb\(255,\s*192,\s*203\)/) // Pink color

    // Test 5: Reload and verify pink persistence
    console.log('🔄 Testing: Reloading page to verify Pink persistence')
    await page.reload()

    // Wait for the board to load again
    await page.waitForSelector('[x-show="currentBoard && !boardNotFound"]', { state: 'visible' })
    await page.waitForTimeout(1000)

    // Verify the color swatch shows pink
    const colorSwatchPinkAfterReload = page.locator('#current-color-swatch')
    await expect(colorSwatchPinkAfterReload).toHaveCSS('background-color', /rgb\(255,\s*192,\s*203\)/) // Pink color

    // Test 6: Final verification - click swatch and verify dropdown shows "Pink"
    console.log('🎯 Testing: Final verification - clicking swatch shows "Pink" in dropdown')

    // Click the color swatch to open the selector
    await page.click('#current-color-swatch')

    // Wait for the dropdown to be visible
    await page.waitForSelector('#color-scheme-switcher', { state: 'visible' })

    // Verify the dropdown shows "Pink"
    const finalColorSelect = page.locator('#color-scheme-switcher')
    await expect(finalColorSelect).toHaveValue('pink')

    // Test 7: Test changing to another color (Green) for additional coverage
    console.log('🟢 Testing: Changing to Green for additional coverage')

    // Change color to Green
    await page.selectOption('#color-scheme-switcher', 'green')

    // Verify the color swatch shows green
    const colorSwatchGreen = page.locator('#current-color-swatch')
    await expect(colorSwatchGreen).toHaveCSS('background-color', /rgb\(0,\s*128,\s*0\)/) // Green color

    // Click swatch to verify dropdown
    await page.click('#current-color-swatch')
    await page.waitForSelector('#color-scheme-switcher', { state: 'visible' })

    // Verify dropdown shows "Green"
    const greenColorSelect = page.locator('#color-scheme-switcher')
    await expect(greenColorSelect).toHaveValue('green')

    console.log('✅ All color scheme tests passed successfully!')
  })

  test('should handle color scheme changes during active session', async ({ page }) => {
    // Setup fresh environment
    serverInfo = (await setupFreshEnvironment(page)).serverInfo

    // Create a board first
    await page.waitForSelector('[x-show="!loading && !loadingBoardFromUrl && !currentBoard && boards.length === 0 && !boardNotFound"]', { state: 'visible' })
    await page.waitForSelector('button:has-text("Create Your First Board")', { state: 'visible' })

    // Handle the prompt dialog for board name
    page.on('dialog', async dialog => {
      await dialog.accept('Session Color Test')
    })

    await page.click('button:has-text("Create Your First Board")')

    await page.waitForSelector('[x-show="currentBoard && !boardNotFound"]', { state: 'visible' })
    await page.waitForTimeout(1000)

    // Test rapid color changes in the same session
    const colorsToTest = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']

    for (const color of colorsToTest) {
      console.log(`🎨 Testing color: ${color}`)

      // Click color swatch
      await page.click('#current-color-swatch')
      await page.waitForSelector('#color-scheme-switcher', { state: 'visible' })

      // Select color
      await page.selectOption('#color-scheme-switcher', color)

      // Verify dropdown shows correct color
      const colorSelect = page.locator('#color-scheme-switcher')
      await expect(colorSelect).toHaveValue(color)

      // Verify color swatch updated (checking common colors)
      const colorSwatch = page.locator('#current-color-swatch')

      if (color === 'red') {
        await expect(colorSwatch).toHaveCSS('background-color', /rgb\(255,\s*0,\s*0\)/)
      } else if (color === 'blue') {
        await expect(colorSwatch).toHaveCSS('background-color', /rgb\(29,\s*136,\s*254\)/)
      } else if (color === 'green') {
        await expect(colorSwatch).toHaveCSS('background-color', /rgb\(0,\s*128,\s*0\)/)
      } else if (color === 'yellow') {
        await expect(colorSwatch).toHaveCSS('background-color', /rgb\(255,\s*204,\s*0\)/)
      } else if (color === 'purple') {
        await expect(colorSwatch).toHaveCSS('background-color', /rgb\(128,\s*0,\s*128\)/)
      } else if (color === 'orange') {
        await expect(colorSwatch).toHaveCSS('background-color', /rgb\s*\(\s*255,\s*165,\s*0\s*\)/)
      }

      // Close the dropdown by clicking outside
      await page.click('body')
      await page.waitForSelector('#color-scheme-switcher', { state: 'hidden' })

      // Brief pause to allow any transitions to complete
      await page.waitForTimeout(200)
    }

    console.log('✅ Rapid color changes test completed!')
  })

  test('should maintain color scheme when navigating between boards', async ({ page }) => {
    // Setup fresh environment
    serverInfo = (await setupFreshEnvironment(page)).serverInfo

    // Create first board with red color
    await page.waitForSelector('[x-show="!loading && !loadingBoardFromUrl && !currentBoard && boards.length === 0 && !boardNotFound"]', { state: 'visible' })
    await page.waitForSelector('button:has-text("Create Your First Board")', { state: 'visible' })

    // Handle the prompt dialog for board name
    page.on('dialog', async dialog => {
      await dialog.accept('Red Board')
    })

    await page.click('button:has-text("Create Your First Board")')

    await page.waitForSelector('[x-show="currentBoard && !boardNotFound"]', { state: 'visible' })
    await page.waitForTimeout(1000)

    // Set first board to red
    await page.click('#current-color-swatch')
    await page.waitForSelector('#color-scheme-switcher', { state: 'visible' })
    await page.selectOption('#color-scheme-switcher', 'red')

    // Go back to board selection
    await page.click('[x-show="currentBoard && boards.length > 0"] button[aria-label*="board"]')
    await page.waitForSelector('[x-show="!loading && !currentBoard && boards.length > 0 && !boardNotFound"]', { state: 'visible' })

    // Create second board
    await page.waitForSelector('button:has-text("Create New Board")', { state: 'visible' })

    // Handle the prompt dialog for board name
    page.on('dialog', async dialog => {
      await dialog.accept('Blue Board')
    })

    await page.click('button:has-text("Create New Board")')

    await page.waitForSelector('[x-show="currentBoard && !boardNotFound"]', { state: 'visible' })
    await page.waitForTimeout(1000)

    // Second board should be blue (default)
    await expect(page.locator('#current-color-swatch')).toHaveCSS('background-color', /rgb\(29,\s*136,\s*254\)/)

    // Navigate back to board selection and load first board
    await page.click('[x-show="currentBoard && boards.length > 0"] button[aria-label*="board"]')
    await page.waitForSelector('[x-show="!loading && !currentBoard && boards.length > 0 && !boardNotFound"]', { state: 'visible' })

    // Select first board
    await page.click('[x-text="Red Board"]')

    await page.waitForSelector('[x-show="currentBoard && !boardNotFound"]', { state: 'visible' })
    await page.waitForTimeout(1000)

    // Verify first board is still red
    await expect(page.locator('#current-color-swatch')).toHaveCSS('background-color', /rgb\(255,\s*0,\s*0\)/)

    // Verify dropdown shows red
    await page.click('#current-color-swatch')
    await page.waitForSelector('#color-scheme-switcher', { state: 'visible' })
    await expect(page.locator('#color-scheme-switcher')).toHaveValue('red')

    console.log('✅ Board navigation color scheme test completed!')
  })
})
