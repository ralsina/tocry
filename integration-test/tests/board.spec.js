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
})
