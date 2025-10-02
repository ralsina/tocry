import { test, expect } from '@playwright/test'

/* global DataTransfer, DragEvent, ClipboardEvent */

// Helper to generate a unique board name for each test
function generateUniqueBoardName () {
  return `test-board-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

test.describe('Drag and Drop functionality', () => {
  test.beforeEach(async ({ page }) => {
    const uniqueBoardName = generateUniqueBoardName()
    // Create the board via API before navigating
    const response = await page.request.post('/boards', {
      data: {
        name: uniqueBoardName
      }
    })
    await expect(response).toBeOK()
    // Navigate to the main application page
    await page.goto(`/b/${uniqueBoardName}`)

    // Disable all CSS animations to prevent flakiness in tests
    await page.addStyleTag({ content: '* { animation: none !important; }' })

    // Ensure the app is loaded and ready
    await expect(page.locator('[x-ref="hamburgerMenuButton"]')).toBeVisible()

    // Wait for board to be loaded (check select element with x-model)
    const boardSelect = page.locator('select[x-model="currentBoardName"]')
    await expect(boardSelect).toBeVisible()
    await expect(boardSelect).toHaveValue(uniqueBoardName)

    // Add a lane for the tests to use
    const newLaneName = 'Test Lane'

    // Click hamburger menu to open board menu
    await page.locator('[x-ref="hamburgerMenuButton"]').click()

    // Click "New Lane" option in menu
    await page.locator('a:has-text("New Lane")').click()

    // Wait for modal to appear
    const modal = page.locator('.modal-overlay').filter({ hasText: 'Add New Lane' })
    await expect(modal).toBeVisible()

    // Fill in lane name
    const modalInput = page.locator('input[x-model="newLaneName"]')
    await modalInput.fill(newLaneName)
    await modalInput.press('Enter')

    // Wait a moment for the lane to be created
    await page.waitForTimeout(1000)

    const newLane = page.locator('.lane').filter({ hasText: newLaneName }).first()
    await expect(newLane).toBeVisible()
  })

  test('should create a new note when an image is dropped into a lane', async ({ page }) => {
    const laneNotesLocator = page.locator('.lane-notes').first()
    const initialNoteCount = await laneNotesLocator.locator('.note-card').count()

    // Create a dummy image buffer (1x1 transparent PNG)
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

    // Simulate a drop event with an image file on the lane notes area
    await laneNotesLocator.evaluate((node, buffer) => {
      const dataTransfer = new DataTransfer()
      const blob = new Blob([buffer], { type: 'image/png' })
      const file = new File([blob], 'test-image.png', { type: 'image/png' })
      dataTransfer.items.add(file)

      const dropEvent = new DragEvent('drop', {
        dataTransfer,
        bubbles: true,
        cancelable: true
      })
      node.dispatchEvent(dropEvent)
    }, imageBuffer)

    // Verify a new note card appeared. Increased timeout for potential upload/processing.
    await expect(laneNotesLocator.locator('.note-card')).toHaveCount(initialNoteCount + 1, { timeout: 10000 })
    // Further assertions could be added here if the app provides specific visual cues for image notes.
    // For example, if image notes have a specific class or a predictable title.
  })

  test('should add an image to a note when dropped on it', async ({ page }) => {
    const laneNotesLocator = page.locator('.lane-notes').first()
    const noteText = 'An existing note'

    // Create a note to drop the image onto using paste functionality
    await laneNotesLocator.evaluate((node, text) => {
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
        bubbles: true,
        cancelable: true
      })
      pasteEvent.clipboardData.setData('text/plain', text)
      node.dispatchEvent(pasteEvent)
    }, noteText)

    await expect(laneNotesLocator.locator('.note-card')).toHaveCount(1)
    const noteLocator = laneNotesLocator.locator('.note-card').first()
    await expect(noteLocator.locator('h4')).toHaveText(noteText)

    // Create a dummy image buffer (1x1 transparent PNG)
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

    // Simulate a drop event with an image file on the note card
    await noteLocator.evaluate((node, buffer) => {
      const dataTransfer = new DataTransfer()
      const blob = new Blob([buffer], { type: 'image/png' })
      const file = new File([blob], 'test-image.png', { type: 'image/png' })
      dataTransfer.items.add(file)

      const dropEvent = new DragEvent('drop', {
        dataTransfer,
        bubbles: true,
        cancelable: true
      })
      node.dispatchEvent(dropEvent)
    }, imageBuffer)

    // Verify the note content now includes the image
    const imageLocator = noteLocator.locator('.note-content img')
    await expect(imageLocator).toBeVisible({ timeout: 10000 })
    await expect(imageLocator).toHaveAttribute('alt', 'test-image.png')
  })
})
