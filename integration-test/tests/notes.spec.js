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
    console.error(`Error creating board: ${boardResponse.status()} ${boardResponse.statusText()}`)
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

  // Create Lane A and Lane B via API for note management tests
  const laneAResponse = await page.request.post(
    `/boards/${uniqueBoardName}/lane`,
    {
      data: { name: 'Lane A' }
    }
  )
  await expect(laneAResponse).toBeOK()

  const laneBResponse = await page.request.post(
    `/boards/${uniqueBoardName}/lane`,
    {
      data: { name: 'Lane B' }
    }
  )
  await expect(laneBResponse).toBeOK()

  // Re-initialize lanes to ensure UI reflects API changes
  await page.reload()
  await expect(page.locator('.lane[data-lane-name="Lane A"]')).toBeVisible()
  await expect(page.locator('.lane[data-lane-name="Lane B"]')).toBeVisible()
})

test.describe('Note Management', () => {
  test('should allow adding a note to a lane', async ({ page }) => {
    const laneName = 'Lane A'
    const noteTitle = 'My First Note'

    const lane = page.locator(`.lane[data-lane-name="${laneName}"]`)

    // Click add note button for the lane
    await lane.locator('.add-note-btn').click()
    await expect(page.locator('#custom-prompt-dialog')).toBeVisible()
    await page
      .locator('#custom-prompt-dialog #prompt-dialog-input')
      .fill(noteTitle)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()

    // Assert note is visible using hasText for robustness
    const noteCard = lane.locator('.note-card', { hasText: noteTitle })
    await expect(noteCard).toBeVisible()
    await expect(noteCard.locator('.note-summary h4')).toHaveText(noteTitle)
  })

  test('should allow editing a note', async ({ page }) => {
    test.setTimeout(10000) // Increase timeout for this specific test to 10 seconds
    const laneName = 'Lane A'
    const originalNoteTitle = 'Note to Edit'
    const newNoteTitle = 'Edited Note Title'
    const newNoteContent = 'This is the new content for the note.'

    // Add the note via UI for easier interaction
    const lane = page.locator(`.lane[data-lane-name="${laneName}"]`)
    await lane.locator('.add-note-btn').click()
    await page
      .locator('#custom-prompt-dialog #prompt-dialog-input')
      .fill(originalNoteTitle)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    const noteCard = lane.locator('.note-card', { hasText: originalNoteTitle })
    await expect(noteCard).toBeVisible()

    // Double-click to open the edit dialog
    await noteCard.dblclick()
    const editDialog = page.locator('#modal-edit-note')
    // Ensure the edit dialog is visible
    await expect(editDialog).toBeVisible()
    // Ensure the input field is enabled before attempting to fill it
    await expect(editDialog.locator('#edit-note-title')).toBeVisible()

    // Edit title and content
    await editDialog.locator('#edit-note-title').fill(newNoteTitle) // This line is fine

    // Edit content (assuming ToastUI Editor is present)
    // This interacts with the ToastUI Editor's content area
    await editDialog.locator('.toastui-editor-md-container').click() // Ensure editor is in markdown mode and focused
    // The .fill() action will wait for the element to be visible and editable.
    await editDialog.locator('.ProseMirror').first().fill(newNoteContent)

    // Save changes
    await editDialog.locator('#edit-note-save-btn').click()
    await expect(editDialog).not.toBeVisible()

    // Assert note has new title and content
    const updatedNoteCard = lane.locator('.note-card', {
      hasText: newNoteTitle
    })
    await expect(updatedNoteCard).toBeVisible()
    await expect(updatedNoteCard.locator('.note-summary h4')).toHaveText(
      newNoteTitle
    )

    // Verify content by re-opening and checking
    await updatedNoteCard.dblclick()
    await expect(editDialog).toBeVisible()
    // The content is inside the ProseMirror div, not the md-container.
    await expect(editDialog.locator('.ProseMirror').first()).toHaveText(
      newNoteContent
    )
    await editDialog.locator('#edit-note-cancel-btn').click() // Close without saving
  })

  test('should allow deleting a note', async ({ page }) => {
    const laneName = 'Lane A'
    const noteTitle = 'Note to Delete'

    // Add the note via UI for easier interaction
    const lane = page.locator(`.lane[data-lane-name="${laneName}"]`)
    await lane.locator('.add-note-btn').click()
    await page
      .locator('#custom-prompt-dialog #prompt-dialog-input')
      .fill(noteTitle)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    const noteCard = lane.locator('.note-card', { hasText: noteTitle })
    await expect(noteCard).toBeVisible()

    // Click delete button for the note
    await noteCard.locator('.delete-note-btn').click()
    const confirmDialog = page.locator('#custom-confirm-dialog')
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.locator('#confirm-dialog-ok-btn').click()

    // Assert note is no longer visible
    await expect(noteCard).not.toBeVisible()
  })

  test('should allow dragging a note between lanes', async ({ page }) => {
    const laneA = page.locator('.lane[data-lane-name="Lane A"]')
    const laneB = page.locator('.lane[data-lane-name="Lane B"]')

    // Add a note to Lane A
    const noteTitle = 'Draggable Note'
    await laneA.locator('.add-note-btn').click()
    await page
      .locator('#custom-prompt-dialog #prompt-dialog-input')
      .fill(noteTitle)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    const noteToDrag = laneA.locator('.note-card', { hasText: noteTitle })
    await expect(noteToDrag).toBeVisible()

    // Perform drag and drop
    await noteToDrag.dragTo(laneB.locator('.notes-list'))

    // Assert the note is no longer in Lane A
    await expect(
      laneA.locator('.note-card', { hasText: noteTitle })
    ).not.toBeVisible()

    // Assert the note is now in Lane B
    const movedNote = laneB.locator('.note-card', { hasText: noteTitle })
    await expect(movedNote).toBeVisible()
  })

  test('should allow reordering notes within the same lane', async ({
    page
  }) => {
    const laneA = page.locator('.lane[data-lane-name="Lane A"]')

    // Add three notes to Lane A
    await laneA.locator('.add-note-btn').click()
    await page
      .locator('#custom-prompt-dialog #prompt-dialog-input')
      .fill('Note 1')
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    await expect(
      laneA.locator('.note-card', { hasText: 'Note 1' })
    ).toBeVisible()

    await laneA.locator('.add-note-btn').click()
    await page
      .locator('#custom-prompt-dialog #prompt-dialog-input')
      .fill('Note 2')
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    await expect(
      laneA.locator('.note-card', { hasText: 'Note 2' })
    ).toBeVisible()

    await laneA.locator('.add-note-btn').click()
    await page
      .locator('#custom-prompt-dialog #prompt-dialog-input')
      .fill('Note 3')
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    await expect(
      laneA.locator('.note-card', { hasText: 'Note 3' })
    ).toBeVisible()

    // Wait for all three notes to be present before asserting their text content and order
    await expect(laneA.locator('.note-card')).toHaveCount(3)

    const note1 = laneA.locator('.note-card', { hasText: 'Note 1' })
    const note3 = laneA.locator('.note-card', { hasText: 'Note 3' })

    // Verify initial order
    await expect(laneA.locator('.note-card h4')).toHaveText([
      'Note 3',
      'Note 2',
      'Note 1'
    ]) // Initial order check

    // Drag Note 1 to be after Note 3
    await note1.dragTo(note3)

    // Verify new order
    await expect(laneA.locator('.note-card h4')).toHaveText([
      'Note 1',
      'Note 3',
      'Note 2'
    ]) // Expected order after dragging Note 1 after Note 3
  })
})

test.describe('Public Note Management', () => {
  test('should allow making a note public and show permalink', async ({ page, browser }) => {
    const laneName = 'Lane A'
    const noteTitle = 'Public Note'
    const noteContent = 'This note is public.'

    const lane = page.locator(`.lane[data-lane-name="${laneName}"]`)

    // 1. Add the note via UI
    await lane.locator('.add-note-btn').click()
    await expect(page.locator('#custom-prompt-dialog')).toBeVisible()
    await page.locator('#custom-prompt-dialog #prompt-dialog-input').fill(noteTitle)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    const noteCard = lane.locator('.note-card', { hasText: noteTitle })
    await expect(noteCard).toBeVisible()

    // 2. Open the edit dialog and make it public
    await noteCard.dblclick()
    const editDialog = page.locator('#modal-edit-note')
    await expect(editDialog).toBeVisible()

    await editDialog.locator('.toastui-editor-md-container').click()
    await editDialog.locator('.ProseMirror').first().fill(noteContent)

    const publicSwitch = editDialog.locator('#edit-note-public')
    await publicSwitch.check()
    await editDialog.locator('#edit-note-save-btn').click()
    await expect(editDialog).not.toBeVisible()

    // 3. Verify the permalink button is visible
    const permalinkButton = noteCard.locator('.permalink-btn')
    await expect(permalinkButton).toBeVisible()

    // 4. Click the permalink button and verify the modal
    await permalinkButton.click()
    const permalinkModal = page.locator('#modal-permalink')
    await expect(permalinkModal).toBeVisible()

    const permalinkUrlInput = permalinkModal.locator('#permalink-url')
    const permalinkUrl = await permalinkUrlInput.inputValue()
    expect(permalinkUrl).toMatch(/\/n\/[a-f0-9-]{36}$/)

    // 5. Navigate to the permalink URL in a new page/context
    const newPage = await browser.newPage()
    await newPage.goto(permalinkUrl)
    await expect(newPage.locator('h1', { hasText: noteTitle })).toBeVisible()
    await expect(newPage.locator('#note-content')).toHaveText(noteContent)
    await newPage.close()

    // 6. Close the permalink modal
    await permalinkModal.locator('#permalink-close-btn').click()
    await expect(permalinkModal).not.toBeVisible()
  })

  test('should allow making a public note private and hide permalink', async ({ page, browser }) => {
    const laneName = 'Lane A'
    const noteTitle = 'Private Note'
    const noteContent = 'This note is private.'

    const lane = page.locator(`.lane[data-lane-name="${laneName}"]`)

    // 1. Add the note and make it public
    await lane.locator('.add-note-btn').click()
    await page.locator('#custom-prompt-dialog #prompt-dialog-input').fill(noteTitle)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    const noteCard = lane.locator('.note-card', { hasText: noteTitle })
    await expect(noteCard).toBeVisible()

    await noteCard.dblclick()
    const editDialog = page.locator('#modal-edit-note')
    await editDialog.locator('.toastui-editor-md-container').click()
    await editDialog.locator('.ProseMirror').first().fill(noteContent)
    await editDialog.locator('#edit-note-public').check()
    await editDialog.locator('#edit-note-save-btn').click()
    await expect(editDialog).not.toBeVisible()

    // Get the permalink URL before making it private
    await noteCard.locator('.permalink-btn').click()
    const permalinkModal = page.locator('#modal-permalink')
    const permalinkUrl = await permalinkModal.locator('#permalink-url').inputValue()
    await permalinkModal.locator('#permalink-close-btn').click()
    await expect(permalinkModal).not.toBeVisible()

    // 2. Open the edit dialog and make it private
    await noteCard.dblclick()
    await expect(editDialog).toBeVisible()
    await editDialog.locator('#edit-note-public').uncheck()
    await editDialog.locator('#edit-note-save-btn').click()
    await expect(editDialog).not.toBeVisible()

    // 3. Verify the permalink button is hidden
    await expect(noteCard.locator('.permalink-btn')).not.toBeVisible()

    // 4. Verify the note is no longer accessible via permalink
    const newPage = await browser.newPage()
    const response = await newPage.goto(permalinkUrl)
    expect(response.status()).toBe(404) // Expecting a 404 Not Found
    await newPage.close()
  })

  test('should update public status via permalink modal and reflect on card', async ({ page }) => {
    const laneName = 'Lane A'
    const noteTitle = 'Toggle Public Note'
    const noteContent = 'This note will be toggled.'

    const lane = page.locator(`.lane[data-lane-name="${laneName}"]`)

    // 1. Add the note
    await lane.locator('.add-note-btn').click()
    await page.locator('#custom-prompt-dialog #prompt-dialog-input').fill(noteTitle)
    await page.locator('#custom-prompt-dialog #prompt-dialog-ok-btn').click()
    const noteCard = lane.locator('.note-card', { hasText: noteTitle })
    await expect(noteCard).toBeVisible()

    // 2. Open edit dialog, make public, save
    await noteCard.dblclick()
    const editDialog = page.locator('#modal-edit-note')
    await editDialog.locator('.toastui-editor-md-container').click()
    await editDialog.locator('.ProseMirror').first().fill(noteContent)
    await editDialog.locator('#edit-note-public').check()
    await editDialog.locator('#edit-note-save-btn').click()
    await expect(editDialog).not.toBeVisible()

    // Verify permalink button is visible
    const permalinkButton = noteCard.locator('.permalink-btn')
    await expect(permalinkButton).toBeVisible()

    // 3. Open permalink modal and toggle to private
    await permalinkButton.click()
    const permalinkModal = page.locator('#modal-permalink')
    await expect(permalinkModal).toBeVisible()
    const permalinkPublicSwitch = permalinkModal.locator('#permalink-public-switch')
    await permalinkPublicSwitch.uncheck()
    await expect(permalinkPublicSwitch).not.toBeChecked()
    await permalinkModal.locator('#permalink-close-btn').click()
    await expect(permalinkModal).not.toBeVisible()

    // 4. Verify permalink button is hidden on card
    await expect(permalinkButton).not.toBeVisible()

    // 5. Open edit dialog and verify public switch is unchecked
    await noteCard.dblclick()
    await expect(editDialog).toBeVisible()
    await expect(editDialog.locator('#edit-note-public')).not.toBeChecked()
    await editDialog.locator('#edit-note-cancel-btn').click() // Close without saving

    // 6. Open permalink modal again and toggle to public
    // Need to re-open edit dialog and make it public first to get the button back
    await noteCard.dblclick()
    await editDialog.locator('#edit-note-public').check()
    await editDialog.locator('#edit-note-save-btn').click()
    await expect(editDialog).not.toBeVisible()

    await expect(permalinkButton).toBeVisible()
    await permalinkButton.click()
    await expect(permalinkModal).toBeVisible()
    await permalinkPublicSwitch.check()
    await expect(permalinkPublicSwitch).toBeChecked()
    await permalinkModal.locator('#permalink-close-btn').click()
    await expect(permalinkModal).not.toBeVisible()

    // 7. Verify permalink button is visible on card
    await expect(permalinkButton).toBeVisible()

    // 8. Open edit dialog and verify public switch is checked
    await noteCard.dblclick()
    await expect(editDialog).toBeVisible()
    await expect(editDialog.locator('#edit-note-public')).toBeChecked()
    await editDialog.locator('#edit-note-cancel-btn').click() // Close without saving
  })
})
