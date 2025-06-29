/* global localStorage */
import { test, expect } from '@playwright/test'

// Helper to generate a unique board name for each test
function generateUniqueBoardName () {
  return `test-board-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

test.beforeEach(async ({ page }) => {
  const uniqueBoardName = generateUniqueBoardName()
  // Create the board via API before navigating
  const response = await page.request.post('/boards', {
    data: {
      name: uniqueBoardName
    }
  })
  await expect(response).toBeOK()
  // Navigate to a unique board URL to ensure isolation
  await page.goto(`/b/${uniqueBoardName}`)

  // Disable all CSS animations to prevent flakiness in tests
  await page.addStyleTag({ content: '* { animation: none !important; }' })

  // Ensure the app is loaded and ready
  await expect(page.locator('#add-lane-btn')).toBeVisible()
  await expect(page.locator('#board-selector')).toBeVisible()

  // Select the newly created board in the selector (it should be auto-selected if it's the only one)
  await expect(page.locator('#board-selector')).toHaveValue(uniqueBoardName)
})

test.describe('Board Management', () => {
  test('should allow creating and selecting a new board', async ({ page }) => {
    const newBoardName = generateUniqueBoardName()

    // Use selectOption on the <select> element itself, which is the most robust way
    // to interact with dropdowns. The value for "New Board..." is __NEW_BOARD__.
    await page.locator('#board-selector').selectOption('__NEW_BOARD__')

    const promptDialog = page.locator('#custom-prompt-dialog')
    await expect(promptDialog).toBeVisible()

    await promptDialog.locator('#prompt-dialog-input').fill(newBoardName)
    await promptDialog.locator('#prompt-dialog-ok-btn').click()

    await expect(promptDialog).not.toBeVisible()
    await expect(page.locator('#board-selector')).toHaveValue(newBoardName)
  })

  test('should allow renaming the current board', async ({ page }) => {
    const originalBoardName = await page.locator('#board-selector').inputValue()
    const newBoardName = generateUniqueBoardName()

    // Select the "Rename current board..." option
    await page.locator('#board-selector').selectOption('__RENAME_BOARD__')

    const promptDialog = page.locator('#custom-prompt-dialog')
    await expect(promptDialog).toBeVisible()
    await expect(promptDialog.locator('#prompt-dialog-input')).toHaveValue(originalBoardName)

    // Fill in the new name and confirm
    await promptDialog.locator('#prompt-dialog-input').fill(newBoardName)
    await promptDialog.locator('#prompt-dialog-ok-btn').click()

    // Assert that the prompt dialog is no longer visible
    await expect(promptDialog).not.toBeVisible()

    // Assert that the board selector now shows the new board name
    await expect(page.locator('#board-selector')).toHaveValue(newBoardName)

    // Assert that the URL has been updated
    await expect(page).toHaveURL(`/b/${newBoardName}`)

    // Verify that the old board name is no longer in the selector options
    const options = await page.locator('#board-selector option').allTextContents()
    expect(options).not.toContain(`Board: ${originalBoardName}`)
  })
})

test.describe('Theme and Color Scheme', () => {
  test('should allow changing the color scheme and persist the choice', async ({ page }) => {
    const themeContainer = page.locator('.theme-and-color-switcher')
    const colorSwatch = page.locator('#current-color-swatch')
    const colorSelector = page.locator('#color-scheme-switcher')

    // 1. Assert selector is initially hidden by checking for the absence of 'is-open' class
    await expect(themeContainer).not.toHaveClass(/is-open/)

    // 2. Click the color swatch to reveal the selector
    await colorSwatch.click()
    await expect(themeContainer).toHaveClass(/is-open/)

    // 3. Change the color scheme to 'Green'
    await colorSelector.selectOption('Green')

    // 4. Assert that the color swatch and localStorage have updated
    // The color value is derived from `theme.js` for the 'Green' scheme's light theme
    await expect(colorSwatch).toHaveCSS('background-color', 'rgb(56, 142, 60)')
    const storedScheme = await page.evaluate(() => localStorage.getItem('colorScheme'))
    expect(storedScheme).toBe('Green')

    // 5. Reload the page to test for persistence
    await page.reload()

    // 6. Assert that the 'Green' scheme is still applied after the reload
    await expect(colorSwatch).toHaveCSS('background-color', 'rgb(56, 142, 60)')
    await expect(colorSelector).toHaveValue('Green')
  })
})
