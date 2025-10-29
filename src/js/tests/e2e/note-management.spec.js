import { test, expect } from '@playwright/test'
import { startTestServer } from './helpers/test-server.js'

test.describe('Note Management', () => {
  let serverInfo = null

  test.afterEach(async () => {
    // Clean up the server after each test, regardless of test outcome
    if (serverInfo) {
      console.log(`🧹 Cleaning up server on port ${serverInfo.port}...`)
      await serverInfo.cleanup()
      console.log('✅ Server cleanup completed')
    }
  })

  // Shared helper function to create a note in a specific lane
  async function createNoteInLane (page, lane, title) {
    const addNoteButton = lane.locator('button.lane-action-btn:not(.delete):has-text("+")')
    await expect(addNoteButton).toBeVisible()

    // Click to open the modal dialog
    await addNoteButton.click({ force: true })

    // Wait for the modal to appear
    await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })

    // Fill in the prompt input field
    const modalInput = page.locator('input[x-model="modalManager.modalInput"]')
    await expect(modalInput).toBeVisible()
    await modalInput.fill(title)

    // Click the confirm button (within the modal)
    const modal = page.locator('div[x-show="modalManager.showModal"]')
    const confirmButton = modal.locator('button:has-text("OK")')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Wait for modal to close
    await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })

    // NEW: Editor now opens automatically - wait for it and close it
    await expect(page.locator('div[x-show="modalManager.editingNote"]')).toBeVisible({ timeout: 3000 })
    await page.waitForTimeout(500) // Brief pause for editor to initialize
    const editModal = page.locator('div[x-show="modalManager.editingNote"]')
    const cancelButton = editModal.locator('button:has-text("Cancel")')
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()

    // Wait for editor modal to close and note to be created
    await expect(page.locator('div[x-show="modalManager.editingNote"]')).not.toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(2000) // Wait longer for WebSocket update and UI refresh

    // Verify the note was created
    await expect(lane.locator('.note-card .note-title:has-text("' + title + '")')).toBeVisible({ timeout: 5000 })
  }

  async function setupNoteManagementBoard (page, boardName = 'note-management-test') {
    // Start a fresh server for this test
    serverInfo = await startTestServer({
      portRange: { start: 3100, end: 3200 }
    })

    // Create the board via API
    const boardResponse = await page.request.post(`${serverInfo.baseUrl}/api/v1/boards`, {
      data: { name: boardName }
    })

    if (!boardResponse.ok()) {
      throw new Error(`Failed to create board: ${boardResponse.statusText()}`)
    }

    await boardResponse.json()
    const board = { name: boardName }

    // Create lanes via API
    const lanesData = ['A', 'B', 'C'].map(name => ({ name }))
    const lanesResponse = await page.request.put(`${serverInfo.baseUrl}/api/v1/boards/${board.name}`, {
      data: { lanes: lanesData }
    })

    if (!lanesResponse.ok()) {
      throw new Error(`Failed to create lanes: ${lanesResponse.statusText()}`)
    }

    // Navigate to the board
    await page.goto(`${serverInfo.baseUrl}/b/${board.name}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    return {
      board,
      lanes: ['A', 'B', 'C'],
      boardUrl: `${serverInfo.baseUrl}/b/${board.name}`,
      serverInfo
    }
  }

  test('should create notes using UI with correct distribution (1 in A, 2 in B, 3 in C)', async ({ page }) => {
    // Setup isolated test environment
    await setupNoteManagementBoard(page)

    // Verify ABC lanes are present
    await expect(page.locator('.lane')).toHaveCount(3)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()

    // Get lanes
    const laneA = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("A")') }).first()
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()

    // Initially there should be no notes
    await expect(laneA.locator('.note-card')).toHaveCount(0)
    await expect(laneB.locator('.note-card')).toHaveCount(0)
    await expect(laneC.locator('.note-card')).toHaveCount(0)

    // Create 1 note in lane A
    await createNoteInLane(page, laneA, 'Note A1')
    await expect(laneA.locator('.note-card')).toHaveCount(1)

    // Create 2 notes in lane B
    await createNoteInLane(page, laneB, 'Note B1')
    await expect(laneB.locator('.note-card')).toHaveCount(1)

    await createNoteInLane(page, laneB, 'Note B2')
    await expect(laneB.locator('.note-card')).toHaveCount(2)

    // Create 3 notes in lane C
    await createNoteInLane(page, laneC, 'Note C1')
    await expect(laneC.locator('.note-card')).toHaveCount(1)

    await createNoteInLane(page, laneC, 'Note C2')
    await expect(laneC.locator('.note-card')).toHaveCount(2)

    await createNoteInLane(page, laneC, 'Note C3')
    await expect(laneC.locator('.note-card')).toHaveCount(3)

    // Verify final distribution
    await expect(laneA.locator('.note-card')).toHaveCount(1)
    await expect(laneB.locator('.note-card')).toHaveCount(2)
    await expect(laneC.locator('.note-card')).toHaveCount(3)

    // Verify total notes
    await expect(page.locator('.note-card')).toHaveCount(6)

    // Verify all notes are visible with correct titles
    await expect(laneA.locator('.note-card .note-title:has-text("Note A1")')).toBeVisible()
    await expect(laneB.locator('.note-card .note-title:has-text("Note B1")')).toBeVisible()
    await expect(laneB.locator('.note-card .note-title:has-text("Note B2")')).toBeVisible()
    await expect(laneC.locator('.note-card .note-title:has-text("Note C1")')).toBeVisible()
    await expect(laneC.locator('.note-card .note-title:has-text("Note C2")')).toBeVisible()
    await expect(laneC.locator('.note-card .note-title:has-text("Note C3")')).toBeVisible()
  })

  test('should reorder notes within lane C using drag&drop (C3,C1,C2)', async ({ page }) => {
    // Setup isolated test environment
    await setupNoteManagementBoard(page)

    // Create initial notes: 1 in A, 2 in B, 3 in C

    // Get lanes
    const laneA = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("A")') }).first()
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()

    // Create notes
    await createNoteInLane(page, laneA, 'Note A1')
    await createNoteInLane(page, laneB, 'Note B1')
    await createNoteInLane(page, laneB, 'Note B2')
    await createNoteInLane(page, laneC, 'Note C1')
    await createNoteInLane(page, laneC, 'Note C2')
    await createNoteInLane(page, laneC, 'Note C3')

    // Wait for all notes to be visible
    await page.waitForTimeout(3000)

    // Get initial order of notes in lane C (should be C1, C2, C3)
    const notesInLaneC = laneC.locator('.note-card')
    await expect(notesInLaneC).toHaveCount(3)

    // Get specific note elements
    const noteC1 = laneC.locator('.note-card:has(.note-title:has-text("Note C1"))')
    const noteC2 = laneC.locator('.note-card:has(.note-title:has-text("Note C2"))')
    const noteC3 = laneC.locator('.note-card:has(.note-title:has-text("Note C3"))')

    // Verify initial order
    await expect(noteC1).toBeVisible()
    await expect(noteC2).toBeVisible()
    await expect(noteC3).toBeVisible()

    // Drag C3 to position before C1 (to make it first)
    await noteC3.dragTo(noteC1)
    await page.waitForTimeout(2000)

    // Drag C1 to position after C2 (to make it last)
    await noteC1.dragTo(noteC2)
    await page.waitForTimeout(2000)

    // Verify the final order is C3, C2, C1 by checking positions
    const allNotesInC = laneC.locator('.note-card')
    const noteTitles = await allNotesInC.locator('.note-title').allTextContents()

    // The order should now be: Note C3, Note C2, Note C1
    expect(noteTitles[0]).toBe('Note C3')
    expect(noteTitles[1]).toBe('Note C2')
    expect(noteTitles[2]).toBe('Note C1')
  })

  test('should move notes from lane B into lane A using drag&drop', async ({ page }) => {
    // Setup isolated test environment
    await setupNoteManagementBoard(page)

    // Create initial notes: 1 in A, 2 in B, 3 in C

    // Get lanes
    const laneA = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("A")') }).first()
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()

    // Create notes
    await createNoteInLane(page, laneA, 'Note A1')
    await createNoteInLane(page, laneB, 'Note B1')
    await createNoteInLane(page, laneB, 'Note B2')
    await createNoteInLane(page, laneC, 'Note C1')
    await createNoteInLane(page, laneC, 'Note C2')
    await createNoteInLane(page, laneC, 'Note C3')

    // Wait for all notes to be visible
    await page.waitForTimeout(3000)

    // Verify initial distribution
    await expect(laneA.locator('.note-card')).toHaveCount(1)
    await expect(laneB.locator('.note-card')).toHaveCount(2)
    await expect(laneC.locator('.note-card')).toHaveCount(3)

    // Get specific notes from lane B to move
    const noteB1 = laneB.locator('.note-card:has(.note-title:has-text("Note B1"))')
    const noteB2 = laneB.locator('.note-card:has(.note-title:has-text("Note B2"))')

    // Move Note B1 to lane A
    await noteB1.dragTo(laneA)
    await page.waitForTimeout(2000)

    // Move Note B2 to lane A
    await noteB2.dragTo(laneA)
    await page.waitForTimeout(2000)

    // Verify final distribution
    await expect(laneA.locator('.note-card')).toHaveCount(3) // Should have A1, B1, B2
    await expect(laneB.locator('.note-card')).toHaveCount(0) // Should be empty
    await expect(laneC.locator('.note-card')).toHaveCount(3) // Should still have C1, C2, C3

    // Verify specific notes are in lane A
    await expect(laneA.locator('.note-card .note-title:has-text("Note A1")')).toBeVisible()
    await expect(laneA.locator('.note-card .note-title:has-text("Note B1")')).toBeVisible()
    await expect(laneA.locator('.note-card .note-title:has-text("Note B2")')).toBeVisible()

    // Verify lane B is empty
    await expect(laneB.locator('.note-card')).toHaveCount(0)
  })

  test('should delete a note using the edit modal with confirmation', async ({ page }) => {
    // Setup isolated test environment
    await setupNoteManagementBoard(page)

    // Create initial notes: 1 in A, 1 in B, 1 in C

    // Get lanes
    const laneA = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("A")') }).first()
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()

    // Create one note in each lane
    await createNoteInLane(page, laneA, 'Note A1')
    await createNoteInLane(page, laneB, 'Note B1')
    await createNoteInLane(page, laneC, 'Note C1')

    // Wait for all notes to be visible
    await page.waitForTimeout(3000)

    // Verify initial state: 3 notes total
    await expect(page.locator('.note-card')).toHaveCount(3)
    await expect(laneA.locator('.note-card')).toHaveCount(1)
    await expect(laneB.locator('.note-card')).toHaveCount(1)
    await expect(laneC.locator('.note-card')).toHaveCount(1)

    // Find and click on Note B1's edit button to open edit modal
    const noteB1 = laneB.locator('.note-card:has(.note-title:has-text("Note B1"))')
    await expect(noteB1).toBeVisible()
    const editButton = noteB1.locator('button.edit-note-btn[title="Edit note"]')
    await expect(editButton).toBeVisible()
    await editButton.click()

    // Wait for edit modal to appear
    await page.waitForTimeout(1000)
    const editModal = page.locator('div[x-show="modalManager.editingNote"]')
    await expect(editModal).toBeVisible({ timeout: 3000 })

    // Find and click the Delete button in the edit modal
    const deleteButton = editModal.locator('button:has-text("Delete")')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Wait for the confirmation modal to appear
    await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })

    // Verify the confirmation modal title and message
    const visibleModal = page.locator('div[x-show="modalManager.showModal"]')
    await expect(visibleModal.locator('.modal-header h3')).toContainText('Delete Note')
    await expect(visibleModal.locator('.modal-body p')).toContainText('Are you sure you want to delete this note?')

    // Click the "Delete Anyway" confirmation button
    const deleteConfirmButton = page.locator('button:has-text("Delete Anyway")')
    await expect(deleteConfirmButton).toBeVisible()
    await deleteConfirmButton.click()

    // Wait for the modal to close and deletion to complete
    await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(2000)

    // Verify final state: only 2 notes remain (A1 and C1)
    await expect(page.locator('.note-card')).toHaveCount(2)
    await expect(laneA.locator('.note-card')).toHaveCount(1)
    await expect(laneB.locator('.note-card')).toHaveCount(0) // B1 was deleted
    await expect(laneC.locator('.note-card')).toHaveCount(1)

    // Verify the deleted note is no longer visible
    await expect(laneB.locator('.note-card .note-title:has-text("Note B1")')).not.toBeVisible()
  })

  test('should delete multiple notes from different lanes', async ({ page }) => {
    // Setup isolated test environment
    await setupNoteManagementBoard(page)

    // Create initial notes: 1 in A, 2 in B, 1 in C

    // Helper function to delete a note
    const deleteNote = async (noteCard) => {
      const editButton = noteCard.locator('button.edit-note-btn[title="Edit note"]')
      await expect(editButton).toBeVisible()
      await editButton.click()
      await page.waitForTimeout(1000)

      const editModal = page.locator('div[x-show="modalManager.editingNote"]')
      await expect(editModal).toBeVisible({ timeout: 3000 })

      const deleteButton = editModal.locator('button:has-text("Delete")')
      await expect(deleteButton).toBeVisible()
      await deleteButton.click()

      await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })

      const visibleModal = page.locator('div[x-show="modalManager.showModal"]')
      await expect(visibleModal.locator('.modal-header h3')).toContainText('Delete Note')

      const deleteConfirmButton = page.locator('button:has-text("Delete Anyway")')
      await expect(deleteConfirmButton).toBeVisible()
      await deleteConfirmButton.click()

      await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
      await page.waitForTimeout(2000)
    }

    // Get lanes
    const laneA = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("A")') }).first()
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()

    // Create notes
    await createNoteInLane(page, laneA, 'Note A1')
    await createNoteInLane(page, laneB, 'Note B1')
    await createNoteInLane(page, laneB, 'Note B2')
    await createNoteInLane(page, laneC, 'Note C1')

    // Wait for all notes to be visible
    await page.waitForTimeout(3000)

    // Verify initial state: 4 notes total
    await expect(page.locator('.note-card')).toHaveCount(4)
    await expect(laneA.locator('.note-card')).toHaveCount(1)
    await expect(laneB.locator('.note-card')).toHaveCount(2)
    await expect(laneC.locator('.note-card')).toHaveCount(1)

    // Delete Note B1
    const noteB1 = laneB.locator('.note-card:has(.note-title:has-text("Note B1"))')
    await deleteNote(noteB1)

    // Delete Note C1
    const noteC1 = laneC.locator('.note-card:has(.note-title:has-text("Note C1"))')
    await deleteNote(noteC1)

    // Verify final state: only 2 notes remain (A1 and B2)
    await expect(page.locator('.note-card')).toHaveCount(2)
    await expect(laneA.locator('.note-card')).toHaveCount(1)
    await expect(laneB.locator('.note-card')).toHaveCount(1)
    await expect(laneC.locator('.note-card')).toHaveCount(0)

    // Verify specific notes remain
    await expect(laneA.locator('.note-card .note-title:has-text("Note A1")')).toBeVisible()
    await expect(laneB.locator('.note-card .note-title:has-text("Note B2")')).toBeVisible()
  })

  test('should delete all notes from all lanes', async ({ page }) => {
    test.setTimeout(60000) // Increase timeout to 60 seconds for this test
    // Setup isolated test environment
    await setupNoteManagementBoard(page)

    // Create initial notes: 1 in A, 2 in B, 3 in C (same as test 1)

    // Helper function to delete a note
    const deleteNote = async (noteCard) => {
      const editButton = noteCard.locator('button.edit-note-btn[title="Edit note"]')
      await expect(editButton).toBeVisible()
      await editButton.click()
      await page.waitForTimeout(1000)

      const editModal = page.locator('div[x-show="modalManager.editingNote"]')
      await expect(editModal).toBeVisible({ timeout: 3000 })

      const deleteButton = editModal.locator('button:has-text("Delete")')
      await expect(deleteButton).toBeVisible()
      await deleteButton.click()

      await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })

      const visibleModal = page.locator('div[x-show="modalManager.showModal"]')
      await expect(visibleModal.locator('.modal-header h3')).toContainText('Delete Note')

      const deleteConfirmButton = page.locator('button:has-text("Delete Anyway")')
      await expect(deleteConfirmButton).toBeVisible()
      await deleteConfirmButton.click()

      await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
      await page.waitForTimeout(2000)
    }

    // Get lanes
    const laneA = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("A")') }).first()
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()

    // Create the same distribution as test 1
    await createNoteInLane(page, laneA, 'Note A1')
    await createNoteInLane(page, laneB, 'Note B1')
    await createNoteInLane(page, laneB, 'Note B2')
    await createNoteInLane(page, laneC, 'Note C1')
    await createNoteInLane(page, laneC, 'Note C2')
    await createNoteInLane(page, laneC, 'Note C3')

    // Wait for all notes to be visible
    await page.waitForTimeout(3000)

    // Verify initial state: 6 notes total
    await expect(page.locator('.note-card')).toHaveCount(6)
    await expect(laneA.locator('.note-card')).toHaveCount(1)
    await expect(laneB.locator('.note-card')).toHaveCount(2)
    await expect(laneC.locator('.note-card')).toHaveCount(3)

    // Delete all notes from all lanes
    const noteA1 = laneA.locator('.note-card:has(.note-title:has-text("Note A1"))')
    await deleteNote(noteA1)

    const noteB1 = laneB.locator('.note-card:has(.note-title:has-text("Note B1"))')
    await deleteNote(noteB1)

    const noteB2 = laneB.locator('.note-card:has(.note-title:has-text("Note B2"))')
    await deleteNote(noteB2)

    const noteC1 = laneC.locator('.note-card:has(.note-title:has-text("Note C1"))')
    await deleteNote(noteC1)

    const noteC2 = laneC.locator('.note-card:has(.note-title:has-text("Note C2"))')
    await deleteNote(noteC2)

    const noteC3 = laneC.locator('.note-card:has(.note-title:has-text("Note C3"))')
    await deleteNote(noteC3)

    // Verify final state: no notes remain in any lane
    await expect(page.locator('.note-card')).toHaveCount(0)
    await expect(laneA.locator('.note-card')).toHaveCount(0)
    await expect(laneB.locator('.note-card')).toHaveCount(0)
    await expect(laneC.locator('.note-card')).toHaveCount(0)
  })
})
