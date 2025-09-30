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
  await expect(page.locator('[x-ref="hamburgerMenuButton"]')).toBeVisible()

  // Wait for board to be loaded (check select element with x-model)
  const boardSelect = page.locator('select[x-model="currentBoardName"]')
  await expect(boardSelect).toBeVisible()
  await expect(boardSelect).toHaveValue(uniqueBoardName)
})

test.describe('Board Management', () => {
  test('should allow creating and selecting a new board', async ({ page }) => {
    const newBoardName = generateUniqueBoardName()

    // Click hamburger menu to open board menu
    await page.locator('[x-ref="hamburgerMenuButton"]').click()

    // Click "New Board" option
    await page.locator('text=New Board').click()

    // Wait for modal to appear
    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()

    // Fill in board name
    const modalInput = page.locator('input[x-model="modalInput"]')
    await expect(modalInput).toBeVisible()
    await modalInput.fill(newBoardName)

    // Click confirm button
    await page.locator('button:has-text("OK")').first().click()

    // Verify modal is closed and board is created
    await expect(modal).not.toBeVisible()

    // Check that success toast appears
    await expect(page.locator('.toast-notification.toast-success')).toBeVisible()

    // Verify board is selected
    const boardSelect = page.locator('select[x-model="currentBoardName"]')
    await expect(boardSelect).toHaveValue(newBoardName)
  })

  test('should allow renaming the current board', async ({ page }) => {
    test.skip(process.env.TOCRY_FAKE_AUTH_USER, 'This test is broken for Google Auth mode.')
    const boardSelect = page.locator('select[x-model="currentBoardName"]')
    const originalBoardName = await boardSelect.inputValue()
    const newBoardName = generateUniqueBoardName()

    // Click hamburger menu to open board menu
    await page.locator('[x-ref="hamburgerMenuButton"]').click()

    // Click "Rename Board" option
    await page.locator('text=Rename Board').click()

    // Wait for modal to appear
    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()

    // Verify input has current board name
    const modalInput = page.locator('input[x-model="modalInput"]')
    await expect(modalInput).toHaveValue(originalBoardName)

    // Fill in the new name and confirm
    await modalInput.fill(newBoardName)
    await page.locator('button:has-text("OK")').first().click()

    // Assert that the modal is no longer visible
    await expect(modal).not.toBeVisible()

    // Check that success toast appears
    await expect(page.locator('.toast-notification.toast-success')).toBeVisible()

    // Assert that the board selector now shows the new board name
    await expect(boardSelect).toHaveValue(newBoardName)

    // Assert that the URL has been updated
    await expect(page).toHaveURL(`/b/${newBoardName}`)

    // Verify that the old board name is no longer in the selector options
    const options = await boardSelect.locator('option').allTextContents()
    expect(options).not.toContain(originalBoardName)
  })

  test('should allow sharing the current board', async ({ page }) => {
    test.skip(!process.env.TOCRY_FAKE_AUTH_USER, 'This test is for Google Auth mode only.')
    const shareEmail = 'test_share@example.com'

    // Click hamburger menu to open board menu
    await page.locator('[x-ref="hamburgerMenuButton"]').click()

    // Click "Share Board" option
    await page.locator('text=Share Board').click()

    // Wait for modal to appear
    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()

    // Fill in email
    const modalInput = page.locator('input[x-model="modalInput"]')
    await modalInput.fill(shareEmail)

    // Click confirm button
    await page.locator('button:has-text("Share")').first().click()

    // Assert that the modal is no longer visible
    await expect(modal).not.toBeVisible()

    // Assert that a success notification appears
    await expect(page.locator('.toast-notification.toast-success')).toBeVisible()
  })
})

test.describe('Theme and Color Scheme', () => {
  test('should allow changing the color scheme and persist the choice', async ({ page }) => {
    // Wait for theme switcher to be available
    const themeSwitcher = page.locator('#theme-switcher')
    await expect(themeSwitcher).toBeVisible()

    // Switch to dark mode first
    await themeSwitcher.selectOption('Dark')
    await page.waitForTimeout(100)

    // Verify dark mode is applied
    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'))
    expect(storedTheme).toBe('dark')

    // Test color scheme in dark mode
    const colorSelector = page.locator('#color-scheme-switcher')
    if (await colorSelector.isVisible()) {
      await colorSelector.selectOption('Cyan')
      await page.waitForTimeout(100)

      const storedColor = await page.evaluate(() => localStorage.getItem('colorScheme'))
      expect(storedColor).toBe('Cyan')
    }

    // Reload and verify persistence
    await page.reload()
    await expect(themeSwitcher).toHaveValue('Dark')
  })
})
