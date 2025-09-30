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

test.describe('Lane and Note Management', () => {
  test('should allow creating a new lane', async ({ page }) => {
    const newLaneName = 'My New Test Lane'

    // Click hamburger menu to open board menu
    await page.locator('[x-ref="hamburgerMenuButton"]').click()

    // Click "New Lane" option
    await page.locator('text=New Lane').click()

    // Wait for modal to appear
    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()

    // Fill in lane name
    const modalInput = page.locator('input[x-model="modalInput"]')
    await modalInput.fill(newLaneName)

    // Click confirm button
    await page.locator('button:has-text("OK")').first().click()

    // Verify modal is closed
    await expect(modal).not.toBeVisible()

    // Check that success toast appears
    await expect(page.locator('.toast-notification.toast-success')).toBeVisible()

    // Find the lane by checking for the title text
    const laneTitle = page.locator('.lane-title').filter({ hasText: newLaneName })
    await expect(laneTitle).toBeVisible()
  })

  test('should allow renaming a lane', async ({ page }) => {
    const originalLaneName = 'Lane to Rename'
    // Create the lane first
    await page.locator('[x-ref="hamburgerMenuButton"]').click()
    await page.locator('text=New Lane').click()
    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()
    const modalInput = page.locator('input[x-model="modalInput"]')
    await modalInput.fill(originalLaneName)
    await page.locator('button:has-text("OK")').first().click()
    await expect(modal).not.toBeVisible()

    // Find the lane by title
    const laneTitle = page.locator('.lane-title').filter({ hasText: originalLaneName })
    await expect(laneTitle).toBeVisible()

    const newLaneName = 'Renamed Lane'

    // Double-click to edit lane title
    await laneTitle.dblclick()

    // Wait for input to appear
    const editInput = page.locator('.lane-title input')
    await expect(editInput).toBeVisible()
    await editInput.fill(newLaneName)
    await editInput.press('Enter')

    // Assert lane has new name
    await expect(page.locator('.lane-title').filter({ hasText: newLaneName })).toBeVisible()
    // Ensure the old lane name is gone
    await expect(page.locator('.lane-title').filter({ hasText: originalLaneName })).not.toBeVisible()
  })

  test('should allow deleting a lane', async ({ page }) => {
    const laneToDeleteName = 'Lane to Delete'
    // Create the lane first
    await page.locator('[x-ref="hamburgerMenuButton"]').click()
    await page.locator('text=New Lane').click()
    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()
    const modalInput = page.locator('input[x-model="modalInput"]')
    await modalInput.fill(laneToDeleteName)
    await page.locator('button:has-text("OK")').first().click()
    await expect(modal).not.toBeVisible()

    // Find the lane by title
    const laneTitle = page.locator('.lane-title').filter({ hasText: laneToDeleteName })
    const laneContainer = laneTitle.locator('..').locator('..') // Go up to lane container
    await expect(laneTitle).toBeVisible()

    // Find delete button within the lane (gear icon)
    const deleteButton = laneContainer.locator('button[aria-label*="Delete"]').first()
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Confirm deletion in modal
    await expect(page.locator('.modal-overlay')).toBeVisible()
    await page.locator('button:has-text("Delete")').first().click()

    // Assert lane is no longer visible
    await expect(laneTitle).not.toBeVisible()
  })

  test('should allow reordering lanes via drag and drop', async ({ page }) => {
    test.setTimeout(10000) // Increase timeout for this specific test

    // Create three lanes via UI
    const laneNames = ['Lane One', 'Lane Two', 'Lane Three']
    for (const name of laneNames) {
      await page.locator('[x-ref="hamburgerMenuButton"]').click()
      await page.locator('text=New Lane').click()
      const modal = page.locator('.modal-overlay')
      await expect(modal).toBeVisible()
      const modalInput = page.locator('input[x-model="modalInput"]')
      await modalInput.fill(name)
      await page.locator('button:has-text("OK")').first().click()
      await expect(modal).not.toBeVisible()
    }

    // Wait for all lanes to be visible
    await page.waitForTimeout(500)

    // Get locators for the lanes by their titles
    const laneOne = page.locator('.lane-title').filter({ hasText: 'Lane One' })
    const laneTwo = page.locator('.lane-title').filter({ hasText: 'Lane Two' })
    const laneThree = page.locator('.lane-title').filter({ hasText: 'Lane Three' })

    await expect(laneOne).toBeVisible()
    await expect(laneTwo).toBeVisible()
    await expect(laneThree).toBeVisible()

    // Verify initial order
    await expect(page.locator('.lane .lane-title')).toHaveText([
      'Lane One',
      'Lane Two',
      'Lane Three'
    ])

    // Drag 'Lane One' to 'Lane Three'
    await laneOne.dragTo(laneThree)

    // Wait for drag operation to complete
    await page.waitForTimeout(300)

    // Verify the new order: Lane Two, Lane Three, Lane One
    await expect(page.locator('.lane .lane-title')).toHaveText(['Lane Two', 'Lane Three', 'Lane One'])
  })
})
