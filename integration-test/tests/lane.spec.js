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

test.describe('Lane and Note Management', () => {
  test('should allow creating a new lane', async ({ page }) => {
    const newLaneName = 'My New Test Lane'

    await page.locator('#add-lane-btn').click()

    const promptDialog = page.locator('#custom-prompt-dialog')
    await expect(promptDialog).toBeVisible()

    await promptDialog.locator('#prompt-dialog-input').fill(newLaneName)
    await promptDialog.locator('#prompt-dialog-ok-btn').click()

    await expect(promptDialog).not.toBeVisible()

    const newLane = page.locator(`.lane[data-lane-name="${newLaneName}"]`)
    await expect(newLane).toBeVisible()
    await expect(newLane.locator('.lane-title')).toHaveText(newLaneName)
  })

  test('should allow renaming a lane', async ({ page }) => {
    const originalLaneName = 'Lane to Rename'
    // Create the lane first
    await page.locator('#add-lane-btn').click()
    await page.locator('#custom-prompt-dialog #prompt-dialog-input').fill(originalLaneName)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    await expect(page.locator(`.lane[data-lane-name="${originalLaneName}"]`)).toBeVisible()

    const newLaneName = 'Renamed Lane'
    const laneTitleElement = page.locator(`.lane[data-lane-name="${originalLaneName}"] .lane-title`)

    await laneTitleElement.click() // Click to make editable
    // Fill new name and blur to save
    await laneTitleElement.fill(newLaneName)
    await page.locator('body').click() // Blur to save

    // Assert lane has new name
    await expect(page.locator(`.lane[data-lane-name="${newLaneName}"] .lane-title`)).toHaveText(newLaneName)
    // Ensure the old lane is gone (by name)
    await expect(page.locator(`.lane[data-lane-name="${originalLaneName}"]`)).not.toBeVisible()
  })

  test('should allow deleting a lane', async ({ page }) => {
    const laneToDeleteName = 'Lane to Delete'
    // Create the lane first
    await page.locator('#add-lane-btn').click()
    await page.locator('#custom-prompt-dialog #prompt-dialog-input').fill(laneToDeleteName)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    const laneToDelete = page.locator(`.lane[data-lane-name="${laneToDeleteName}"]`)
    await expect(laneToDelete).toBeVisible()

    // Click delete button and confirm
    await laneToDelete.locator('.delete-lane-btn').click()
    const confirmDialog = page.locator('#custom-confirm-dialog')
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.locator('#confirm-dialog-ok-btn').click()

    // Assert lane is no longer visible
    await expect(laneToDelete).not.toBeVisible()
  })

  test('should allow reordering lanes via drag and drop', async ({ page }) => {
    test.setTimeout(10000) // Increase timeout for this specific test

    // Create three lanes via UI
    const laneNames = ['Lane One', 'Lane Two', 'Lane Three']
    for (const name of laneNames) {
      await page.locator('#add-lane-btn').click()
      await expect(page.locator('#custom-prompt-dialog')).toBeVisible()
      await page.locator('#custom-prompt-dialog #prompt-dialog-input').fill(name)
      await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
      await expect(page.locator('#custom-prompt-dialog')).not.toBeVisible()
      await expect(page.locator(`.lane[data-lane-name="${name}"]`)).toBeVisible()
    }

    // Get locators for the lanes
    // The `data-lane-name` attribute is set in render.js and used for identification.
    const laneOne = page.locator('.lane[data-lane-name="Lane One"]')
    page.locator('.lane[data-lane-name="Lane Two"]')
    const laneThree = page.locator('.lane[data-lane-name="Lane Three"]')

    // Verify initial order. Assuming new lanes are added to the beginning of the list,
    // similar to how notes are handled in notes.spec.js.
    // So, if added in order One, Two, Three, the display order will be Three, Two, One.
    await expect(page.locator('.lane .lane-title')).toHaveText([
      'Lane One',
      'Lane Two',
      'Lane Three'
    ])

    // Drag 'Lane One' (which is currently the last element) to 'Lane Three' (which is currently the first element).
    // This should place 'Lane One' before 'Lane Three'.
    await laneOne.dragTo(laneThree)

    // Verify the new order: Lane One, Lane Three, Lane Two
    await expect(page.locator('.lane .lane-title')).toHaveText(['Lane Two', 'Lane Three', 'Lane One'])
  })
})
