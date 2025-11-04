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

    // Click the "Create Your First Board" button normally - it should be visible
    await page.click('button:has-text("Create Your First Board")')

    // Should see the modal with "Input Required" title
    const modal = page.locator('.modal:has(h3:has-text("Input Required"))')
    await expect(modal).toBeVisible()

    // Find the input field and enter "Color Test Board"
    const inputField = modal.locator('input[type="text"]')
    await expect(inputField).toBeVisible()
    await inputField.fill('Color Test Board')

    // Click the "OK" button
    const okButton = modal.locator('button:has-text("OK")')
    await expect(okButton).toBeVisible()
    await okButton.click()

    // Modal should disappear after creating the board
    await expect(modal).not.toBeVisible()

    // Wait for frontend to update the boards list after successful board creation
    await page.waitForTimeout(2000)

    // Should see "Create your first lanes" banner
    const lanesBanner = page.locator('h3:has-text("Create Your First Lanes")')
    await expect(lanesBanner).toBeVisible()

    // Click the "Simple" element to create default lanes
    const simpleOption = page.locator('.lane-template-card:has-text("Simple")')
    await expect(simpleOption).toBeVisible()
    await simpleOption.click()

    // Should see 3 lanes after clicking Simple
    const lanes = page.locator('.lane')
    await expect(lanes).toHaveCount(3)

    // Wait a moment for lanes to be fully rendered
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
    await expect(colorSwatch).toHaveCSS('background-color', 'rgb(211, 47, 47)') // Material Design Red

    // Test 2: Navigate away and back to verify persistence
    console.log('🔄 Testing: Navigating away and back to verify persistence')

    // Get the current board URL
    const currentUrl = page.url()

    // Navigate to a different page first (about:blank is simple)
    await page.goto('about:blank')
    await page.waitForTimeout(1000)

    // Navigate back to the board
    await page.goto(currentUrl)

    // Wait for the color swatch to be visible (indicates board is loaded)
    const colorSwatchAfterNav = page.locator('#current-color-swatch')
    await expect(colorSwatchAfterNav).toBeVisible()
    await page.waitForTimeout(1000)

    // Verify the color swatch still shows red
    const colorSwatchAfterReload = page.locator('#current-color-swatch')
    await expect(colorSwatchAfterReload).toHaveCSS('background-color', 'rgb(211, 47, 47)') // Material Design Red

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
    await expect(colorSwatchPink).toHaveCSS('background-color', 'rgb(233, 30, 99)') // Material Design Pink

    // Test 5: Navigate away and back to verify pink persistence
    console.log('🔄 Testing: Navigating away and back to verify Pink persistence')

    // Get the current board URL
    const currentPinkUrl = page.url()

    // Navigate to a different page first (about:blank is simple)
    await page.goto('about:blank')
    await page.waitForTimeout(1000)

    // Navigate back to the board
    await page.goto(currentPinkUrl)

    // Wait for the color swatch to be visible (indicates board is loaded)
    const colorSwatchAfterPinkNav = page.locator('#current-color-swatch')
    await expect(colorSwatchAfterPinkNav).toBeVisible()
    await page.waitForTimeout(1000)

    // Verify the color swatch shows pink
    const colorSwatchPinkAfterReload = page.locator('#current-color-swatch')
    await expect(colorSwatchPinkAfterReload).toHaveCSS('background-color', 'rgb(233, 30, 99)') // Material Design Pink

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
    await expect(colorSwatchGreen).toHaveCSS('background-color', 'rgb(56, 142, 60)') // Material Design Green

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

    // Click the "Create Your First Board" button normally - it should be visible
    await page.click('button:has-text("Create Your First Board")')

    // Should see the modal with "Input Required" title
    const modal = page.locator('.modal:has(h3:has-text("Input Required"))')
    await expect(modal).toBeVisible()

    // Find the input field and enter "Session Color Test"
    const inputField = modal.locator('input[type="text"]')
    await expect(inputField).toBeVisible()
    await inputField.fill('Session Color Test')

    // Click the "OK" button
    const okButton = modal.locator('button:has-text("OK")')
    await expect(okButton).toBeVisible()
    await okButton.click()

    // Modal should disappear after creating the board
    await expect(modal).not.toBeVisible()

    // Wait for frontend to update the boards list after successful board creation
    await page.waitForTimeout(2000)

    // Should see "Create your first lanes" banner
    const lanesBanner = page.locator('h3:has-text("Create Your First Lanes")')
    await expect(lanesBanner).toBeVisible()

    // Click the "Simple" element to create default lanes
    const simpleOption = page.locator('.lane-template-card:has-text("Simple")')
    await expect(simpleOption).toBeVisible()
    await simpleOption.click()

    // Should see 3 lanes after clicking Simple
    const lanes = page.locator('.lane')
    await expect(lanes).toHaveCount(3)

    // Wait a moment for lanes to be fully rendered
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
        await expect(colorSwatch).toHaveCSS('background-color', 'rgb(211, 47, 47)')
      } else if (color === 'blue') {
        await expect(colorSwatch).toHaveCSS('background-color', 'rgb(0, 123, 255)')
      } else if (color === 'green') {
        await expect(colorSwatch).toHaveCSS('background-color', 'rgb(56, 142, 60)')
      } else if (color === 'yellow') {
        await expect(colorSwatch).toHaveCSS('background-color', 'rgb(255, 235, 59)')
      } else if (color === 'purple') {
        await expect(colorSwatch).toHaveCSS('background-color', 'rgb(156, 39, 176)')
      } else if (color === 'orange') {
        await expect(colorSwatch).toHaveCSS('background-color', 'rgb(255, 152, 0)')
      }

      // Close the dropdown by clicking outside
      await page.click('body')
      await page.waitForSelector('#color-scheme-switcher', { state: 'hidden' })

      // Brief pause to allow any transitions to complete
      await page.waitForTimeout(200)
    }

    console.log('✅ Rapid color changes test completed!')
  })
})
