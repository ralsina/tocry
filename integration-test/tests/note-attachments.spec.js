import { test, expect } from '@playwright/test'

// Helper to generate a unique board name for each test
function generateUniqueBoardName () {
  return `test-board-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}`
}

test.beforeEach(async ({ page }) => {
  const uniqueBoardName = generateUniqueBoardName()
  // Create the board via API before navigating
  const boardResponse = await page.request.post('/boards', {
    data: {
      name: uniqueBoardName
    }
  })

  // If the board creation fails, log details to help with debugging.
  if (!boardResponse.ok()) {
    console.error(
      `Error creating board: ${boardResponse.status()} ${boardResponse.statusText()}`
    )
    try {
      const body = await boardResponse.json()
      console.error(`Response body: ${JSON.stringify(body, null, 2)}`)
    } catch (e) {
      console.error(`Response body: ${await boardResponse.text()}`)
    }
  }
  await expect(boardResponse).toBeOK()
  // Navigate to a unique board URL to ensure isolation
  await page.goto(`/b/${uniqueBoardName}`)

  // Disable all CSS animations to prevent flakiness in tests
  await page.addStyleTag({ content: '* { animation: none !important; }' })

  // Ensure the app is loaded and ready
  await expect(page.locator('#add-lane-btn')).toBeVisible()
  await expect(page.locator('#board-selector')).toBeVisible()

  // Create a lane via API for note management tests
  const laneResponse = await page.request.post(
    `/boards/${uniqueBoardName}/lane`,
    {
      data: { name: 'Test Lane' }
    }
  )
  await expect(laneResponse).toBeOK()

  // Re-initialize lanes to ensure UI reflects API changes
  await page.reload()
  await expect(page.locator('.lane[data-lane-name="Test Lane"]')).toBeVisible()
})

test.describe('Note Attachments', () => {
  test('should allow uploading an attachment to a note', async ({ page }) => {
    const laneName = 'Test Lane'
    const noteTitle = 'Note with Attachment'
    const fileName = 'test-file.txt'
    const fileContent = 'This is a test attachment content.'

    // Disable all CSS animations to prevent flakiness in tests
    await page.addStyleTag({ content: '* { animation: none !important; }' })

    // 1. Add a note via UI
    const lane = page.locator(`.lane[data-lane-name="${laneName}"]`)
    await expect(lane.locator('.add-note-btn')).toBeVisible()
    await lane.locator('.add-note-btn').click()
    await expect(page.locator('#custom-prompt-dialog')).toBeVisible()
    await page
      .locator('#custom-prompt-dialog #prompt-dialog-input')
      .fill(noteTitle)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    const noteCard = lane.locator('.note-card', { hasText: noteTitle })
    await expect(noteCard).toBeVisible()

    // 2. Click the attach file button on the note card
    await noteCard.locator('.attach-file-btn').click()
    const attachModal = page.locator('#modal-attach-file')
    await expect(attachModal).toBeVisible()

    // 3. Create a dummy file and upload it
    const fileInput = attachModal.locator('#attach-file-input')
    await fileInput.setInputFiles([
      {
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(fileContent)
      }
    ])

    // 4. Verify success notification and attachment in the list (upload happens automatically)
    await expect(page.locator('.notification-toast.success').last()).toBeVisible()
    await expect(page.locator('.notification-toast.success').last()).toHaveText(
      `File '${fileName}' attached successfully.`
    )

    const attachmentItem = attachModal.locator(
      `.attachment-item a:has-text("${fileName}")`
    )
    await expect(attachmentItem).toBeVisible()

    // 5. Close the modal
    await attachModal.locator('#attach-file-close-btn').click()
    await expect(attachModal).not.toBeVisible()
  })

  test('should allow deleting an attachment from a note', async ({ page }) => {
    const laneName = 'Test Lane'
    const noteTitle = 'Note with Deletable Attachment'
    const fileName = 'deletable-file.txt'
    const fileContent = 'This file will be deleted.'

    // Disable all CSS animations to prevent flakiness in tests
    await page.addStyleTag({ content: '* { animation: none !important; }' })

    // 1. Add a note via UI
    const lane = page.locator(`.lane[data-lane-name="${laneName}"]`)
    await expect(lane.locator('.add-note-btn')).toBeVisible()
    await lane.locator('.add-note-btn').click()
    await expect(page.locator('#custom-prompt-dialog')).toBeVisible()
    await page
      .locator('#custom-prompt-dialog #prompt-dialog-input')
      .fill(noteTitle)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    const noteCard = lane.locator('.note-card', { hasText: noteTitle })
    await expect(noteCard).toBeVisible()

    // 2. Open attach modal and upload a file
    await noteCard.locator('.attach-file-btn').click()
    const attachModal = page.locator('#modal-attach-file')
    await expect(attachModal).toBeVisible()

    const fileInput = attachModal.locator('#attach-file-input')
    await fileInput.setInputFiles([
      {
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(fileContent)
      }
    ])

    // Upload happens automatically, wait for success notification
    await expect(page.locator('.notification-toast.success').last()).toBeVisible()
    await expect(
      attachModal.locator(`.attachment-item a:has-text("${fileName}")`)
    ).toBeVisible()

    // 3. Click the delete button for the attachment
    const deleteButton = attachModal.locator(
      `.attachment-item button[data-attachment-id*="${fileName}"]`
    )
    await deleteButton.click()

    // 4. Confirm deletion in the dialog
    const confirmDialog = page.locator('#custom-confirm-dialog')
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.locator('#confirm-dialog-ok-btn').click()

    // 5. Verify that attachment is removed from the list
    await expect(
      attachModal.locator(`.attachment-item span:has-text("${fileName}")`)
    ).not.toBeVisible()

    // 6. Close the modal
    await attachModal.locator('#attach-file-close-btn').click()
    await expect(attachModal).not.toBeVisible()
  })
})
