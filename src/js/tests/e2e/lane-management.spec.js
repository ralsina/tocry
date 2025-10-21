import { test, expect } from '@playwright/test'
import { startTestServer } from './helpers/test-server.js'
import {
  getLaneByName,
  getCurrentLaneOrder,
  getLaneNameElement,
  dragLaneWithValidation,
  setupTestBoard
} from './helpers/consolidated-helpers.js'

test.describe('Lane Management', () => {
  let serverInfo = null

  test.afterEach(async () => {
    // Clean up the server after each test, regardless of test outcome
    if (serverInfo) {
      console.log(`🧹 Cleaning up server on port ${serverInfo.port}...`)
      await serverInfo.cleanup()
      console.log('✅ Server cleanup completed')
    }
  })

  async function setupLaneManagementBoard (page, boardName = 'lane-management-test') {
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

  test('should create lane D using add lane button and confirm ABCD lanes', async ({ page }) => {
    await setupLaneManagementBoard(page)

    // Verify initial ABC lanes are present
    await expect(page.locator('.lane')).toHaveCount(3)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()

    // Verify the board menu (hamburger menu) is visible and clickable
    const boardMenuButton = page.locator('button[aria-label="Board menu"]')
    await expect(boardMenuButton).toBeVisible()

    // Verify "New Lane" menu item is NOT visible before clicking the hamburger menu
    const newLaneMenuItem = page.locator('a:has-text("New Lane")')
    await expect(newLaneMenuItem).not.toBeVisible()

    // Click the hamburger menu to open the dropdown
    await boardMenuButton.click()

    // Wait for the menu dropdown to appear and verify "New Lane" becomes visible
    await expect(newLaneMenuItem).toBeVisible({ timeout: 2000 })

    // Click "New Lane" in the now-visible dropdown menu
    await newLaneMenuItem.click()

    // Verify the dropdown menu closes after clicking "New Lane"
    await expect(newLaneMenuItem).not.toBeVisible({ timeout: 1000 })

    // Wait for the modal to appear
    await page.waitForTimeout(500)

    // Verify the modal is visible and find the lane name input
    const laneInput = page.locator('input[placeholder="Lane name"]')
    await expect(laneInput).toBeVisible()
    await laneInput.fill('D')

    // Click the "Add Lane" button in the modal
    const confirmButton = page.locator('button:has-text("Add Lane")')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Wait for the lane to be added
    await page.waitForTimeout(1000)

    // Verify there are now 4 lanes: A, B, C, D
    await expect(page.locator('.lane')).toHaveCount(4)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("D")')).toBeVisible()
  })

  test.describe('Flaky Lane Reordering Tests', () => {
    // Configure retries for these flaky tests
    test.describe.configure({ retries: 3 })

    test('should drag lane B to position of lane A and check BAC order', async ({ page }) => {
      await setupTestBoard(page, {
        boardName: 'lane-drag-test-bac',
        laneNames: ['A', 'B', 'C']
      })

      // Verify initial ABC lanes are present and visible
      await expect(page.locator('.lane')).toHaveCount(3)
      await expect(getLaneByName(page, 'A')).toBeVisible()
      await expect(getLaneByName(page, 'B')).toBeVisible()
      await expect(getLaneByName(page, 'C')).toBeVisible()

      // Verify initial lane order
      const initialOrder = await getCurrentLaneOrder(page)
      console.log('Initial lane order:', initialOrder)
      expect(initialOrder).toEqual(['A', 'B', 'C'])

      // Perform the lane drag operation with validation
      // Drag lane B to position of lane A, expecting B, A, C order
      await dragLaneWithValidation(page, 'B', 'A', ['B', 'A', 'C'])

      // Additional verification using the new test IDs
      await expect(getLaneNameElement(page, 'B')).toBeVisible()
      await expect(getLaneNameElement(page, 'A')).toBeVisible()
      await expect(getLaneNameElement(page, 'C')).toBeVisible()

      // Verify the lane elements are in the correct DOM order
      const allLanes = page.locator('.lane')
      await expect(allLanes).toHaveCount(3)
      await expect(allLanes.nth(0).locator('[data-testid="lane-name-B"]')).toBeVisible()
      await expect(allLanes.nth(1).locator('[data-testid="lane-name-A"]')).toBeVisible()
      await expect(allLanes.nth(2).locator('[data-testid="lane-name-C"]')).toBeVisible()
    })

    test('should drag lane A to position of lane C and check BCA order', async ({ page }) => {
      await setupTestBoard(page, {
        boardName: 'lane-drag-test-bca',
        laneNames: ['A', 'B', 'C']
      })

      // Verify initial ABC lanes are present and visible
      await expect(page.locator('.lane')).toHaveCount(3)
      await expect(getLaneByName(page, 'A')).toBeVisible()
      await expect(getLaneByName(page, 'B')).toBeVisible()
      await expect(getLaneByName(page, 'C')).toBeVisible()

      // Verify initial lane order
      const initialOrder = await getCurrentLaneOrder(page)
      console.log('Initial lane order:', initialOrder)
      expect(initialOrder).toEqual(['A', 'B', 'C'])

      // First, drag lane B to position of lane A to get BAC order
      await dragLaneWithValidation(page, 'B', 'A', ['B', 'A', 'C'])

      // Verify intermediate BAC order
      const intermediateOrder = await getCurrentLaneOrder(page)
      console.log('Lane order after first drag:', intermediateOrder)
      expect(intermediateOrder).toEqual(['B', 'A', 'C'])

      // Then drag lane A to position of lane C to get BCA order
      await dragLaneWithValidation(page, 'A', 'C', ['B', 'C', 'A'])

      // Verify final BCA order
      const finalOrder = await getCurrentLaneOrder(page)
      console.log('Lane order after second drag:', finalOrder)
      expect(finalOrder).toEqual(['B', 'C', 'A'])

      // Additional verification using the new test IDs
      const allLanes = page.locator('.lane')
      await expect(allLanes).toHaveCount(3)
      await expect(allLanes.nth(0).locator('[data-testid="lane-name-B"]')).toBeVisible()
      await expect(allLanes.nth(1).locator('[data-testid="lane-name-C"]')).toBeVisible()
      await expect(allLanes.nth(2).locator('[data-testid="lane-name-A"]')).toBeVisible()
    })
  })

  test('should delete lane B and confirm only A and C remain', async ({ page }) => {
    await setupLaneManagementBoard(page)
    // Verify initial ABC lanes are present
    await expect(page.locator('.lane')).toHaveCount(3)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()

    // Find lane B and its delete button
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const deleteButtonB = laneB.locator('button.lane-action-btn.delete:has-text("×")')

    await expect(laneB).toBeVisible()
    await expect(deleteButtonB).toBeVisible()

    // Click the delete button for lane B
    await deleteButtonB.click()

    // Wait for the confirmation modal to appear
    await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })

    // Verify the modal title and message (target the visible modal)
    const visibleModal = page.locator('div[x-show="modalManager.showModal"]')
    await expect(visibleModal.locator('.modal-header h3')).toContainText('Delete Lane')
    await expect(visibleModal.locator('.modal-body p')).toContainText('Are you sure you want to delete this lane? All notes in it will be deleted.')

    // Click the "Delete Anyway" confirmation button
    const deleteConfirmButton = page.locator('button:has-text("Delete Anyway")')
    await expect(deleteConfirmButton).toBeVisible()
    await deleteConfirmButton.click()

    // Wait for the modal to close and deletion to complete
    await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(2000)

    // Verify only lanes A and C remain
    await expect(page.locator('.lane')).toHaveCount(2)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).not.toBeVisible()
  })

  test('should delete lane C from ABCD setup and confirm ABD remain', async ({ page }) => {
    await setupLaneManagementBoard(page)
    // First create lane D to have ABCD setup
    const boardMenuButton = page.locator('button[aria-label="Board menu"]')
    await expect(boardMenuButton).toBeVisible()

    const newLaneMenuItem = page.locator('a:has-text("New Lane")')
    await expect(newLaneMenuItem).not.toBeVisible()

    await boardMenuButton.click()
    await expect(newLaneMenuItem).toBeVisible({ timeout: 2000 })
    await newLaneMenuItem.click()
    await expect(newLaneMenuItem).not.toBeVisible({ timeout: 1000 })

    await page.waitForTimeout(500)
    const laneInput = page.locator('input[placeholder="Lane name"]')
    await expect(laneInput).toBeVisible()
    await laneInput.fill('D')

    const confirmButton = page.locator('button:has-text("Add Lane")')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Wait for the lane to be created and modal to close automatically
    await page.waitForTimeout(1000)

    // Verify the modal closed automatically after lane creation
    await expect(page.locator('div[x-show="modalManager.showAddLane"]')).not.toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(1000)

    // Verify ABCD lanes are present
    await expect(page.locator('.lane')).toHaveCount(4)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("D")')).toBeVisible()

    // Find lane C and its delete button
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()
    const deleteButtonC = laneC.locator('button.lane-action-btn.delete:has-text("×")')

    await expect(laneC).toBeVisible()
    await expect(deleteButtonC).toBeVisible()

    // Click the delete button for lane C
    await deleteButtonC.click()

    // Wait for the confirmation modal to appear
    await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })

    // Verify the modal title and message (target the visible modal)
    const visibleModal = page.locator('div[x-show="modalManager.showModal"]')
    await expect(visibleModal.locator('.modal-header h3')).toContainText('Delete Lane')
    await expect(visibleModal.locator('.modal-body p')).toContainText('Are you sure you want to delete this lane? All notes in it will be deleted.')

    // Click the "Delete Anyway" confirmation button
    const deleteConfirmButton = page.locator('button:has-text("Delete Anyway")')
    await expect(deleteConfirmButton).toBeVisible()
    await deleteConfirmButton.click()

    // Wait for the modal to close and deletion to complete
    await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(2000)

    // Verify only lanes A, B, D remain (in that order)
    await expect(page.locator('.lane')).toHaveCount(3)
    const remainingLanes = page.locator('.lane')
    await expect(remainingLanes.nth(0).locator('span[x-text="lane.name"]')).toContainText('A')
    await expect(remainingLanes.nth(1).locator('span[x-text="lane.name"]')).toContainText('B')
    await expect(remainingLanes.nth(2).locator('span[x-text="lane.name"]')).toContainText('D')
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).not.toBeVisible()
  })

  test('should delete all lanes one by one starting with C', async ({ page }) => {
    await setupLaneManagementBoard(page)
    // Verify initial ABC lanes are present
    await expect(page.locator('.lane')).toHaveCount(3)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()

    // Delete lane C first
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()
    const deleteButtonC = laneC.locator('button.lane-action-btn.delete:has-text("×")')
    await expect(deleteButtonC).toBeVisible()
    await deleteButtonC.click()

    // Wait for the confirmation modal to appear
    await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })
    const confirmButtonC = page.locator('button:has-text("Delete Anyway")')
    await expect(confirmButtonC).toBeVisible()
    await confirmButtonC.click()
    await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(2000)

    // Verify A and B remain
    await expect(page.locator('.lane')).toHaveCount(2)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).not.toBeVisible()

    // Delete lane B next
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const deleteButtonB = laneB.locator('button.lane-action-btn.delete:has-text("×")')
    await expect(deleteButtonB).toBeVisible()
    await deleteButtonB.click()

    // Wait for the confirmation modal to appear
    await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })
    const confirmButtonB = page.locator('button:has-text("Delete Anyway")')
    await expect(confirmButtonB).toBeVisible()
    await confirmButtonB.click()
    await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(2000)

    // Verify only lane A remains
    await expect(page.locator('.lane')).toHaveCount(1)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).not.toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).not.toBeVisible()

    // Delete lane A last
    const laneA = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("A")') }).first()
    const deleteButtonA = laneA.locator('button.lane-action-btn.delete:has-text("×")')
    await expect(deleteButtonA).toBeVisible()
    await deleteButtonA.click()

    // Wait for the confirmation modal to appear
    await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })
    const confirmButtonA = page.locator('button:has-text("Delete Anyway")')
    await expect(confirmButtonA).toBeVisible()
    await confirmButtonA.click()
    await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(2000)

    // Verify no lanes remain
    await expect(page.locator('.lane')).toHaveCount(0)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).not.toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).not.toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).not.toBeVisible()
  })

  test('should delete middle lane B and verify A and C order is maintained', async ({ page }) => {
    await setupLaneManagementBoard(page)
    // Verify initial ABC lanes are present
    await expect(page.locator('.lane')).toHaveCount(3)

    // Get the lane order before deletion
    const lanesBefore = page.locator('.lane')
    const laneNamesBefore = await Promise.all([
      lanesBefore.nth(0).locator('span[x-text="lane.name"]').textContent(),
      lanesBefore.nth(1).locator('span[x-text="lane.name"]').textContent(),
      lanesBefore.nth(2).locator('span[x-text="lane.name"]').textContent()
    ])
    console.log('Initial lane order:', laneNamesBefore)

    // Verify initial order is A, B, C
    await expect(lanesBefore.nth(0).locator('span[x-text="lane.name"]')).toContainText('A')
    await expect(lanesBefore.nth(1).locator('span[x-text="lane.name"]')).toContainText('B')
    await expect(lanesBefore.nth(2).locator('span[x-text="lane.name"]')).toContainText('C')

    // Find and delete lane B (the middle lane)
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const deleteButtonB = laneB.locator('button.lane-action-btn.delete:has-text("×")')
    await expect(deleteButtonB).toBeVisible()
    await deleteButtonB.click()

    // Wait for the confirmation modal to appear
    await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })

    // Verify the modal title and message (target the visible modal)
    const visibleModal = page.locator('div[x-show="modalManager.showModal"]')
    await expect(visibleModal.locator('.modal-header h3')).toContainText('Delete Lane')
    await expect(visibleModal.locator('.modal-body p')).toContainText('Are you sure you want to delete this lane? All notes in it will be deleted.')

    // Click the "Delete Anyway" confirmation button
    const deleteConfirmButton = page.locator('button:has-text("Delete Anyway")')
    await expect(deleteConfirmButton).toBeVisible()
    await deleteConfirmButton.click()

    // Wait for the modal to close and deletion to complete
    await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(2000)

    // Verify only 2 lanes remain and their order is preserved
    await expect(page.locator('.lane')).toHaveCount(2)
    const lanesAfter = page.locator('.lane')

    const laneNamesAfter = await Promise.all([
      lanesAfter.nth(0).locator('span[x-text="lane.name"]').textContent(),
      lanesAfter.nth(1).locator('span[x-text="lane.name"]').textContent()
    ])
    console.log('Lane order after deleting B:', laneNamesAfter)

    // Verify order is A, C (A was first, C was third, now they're first and second)
    await expect(lanesAfter.nth(0).locator('span[x-text="lane.name"]')).toContainText('A')
    await expect(lanesAfter.nth(1).locator('span[x-text="lane.name"]')).toContainText('C')
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).not.toBeVisible()
  })

  test('should rename lane B with notes and preserve notes in renamed lane', async ({ page }) => {
    await setupLaneManagementBoard(page)
    // Create initial notes: 1 in A, 2 in B, 1 in C
    const createNoteInLane = async (lane, title) => {
      const addNoteButton = lane.locator('button.lane-action-btn:not(.delete):has-text("+")')
      await expect(addNoteButton).toBeVisible()
      await addNoteButton.click({ force: true })

      await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })
      const modalInput = page.locator('input[x-model="modalManager.modalInput"]')
      await expect(modalInput).toBeVisible()
      await modalInput.fill(title)

      const modal = page.locator('div[x-show="modalManager.showModal"]')
      const confirmButton = modal.locator('button:has-text("OK")')
      await expect(confirmButton).toBeVisible()
      await confirmButton.click()

      await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
      await page.waitForTimeout(2000)
      await expect(lane.locator('.note-card .note-title:has-text("' + title + '")')).toBeVisible({ timeout: 5000 })
    }

    // Get lanes
    const laneA = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("A")') }).first()
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()

    // Create notes: 1 in A, 2 in B, 1 in C
    await createNoteInLane(laneA, 'Note A1')
    await createNoteInLane(laneB, 'Note B1')
    await createNoteInLane(laneB, 'Note B2')
    await createNoteInLane(laneC, 'Note C1')

    // Wait for all notes to be visible
    await page.waitForTimeout(3000)

    // Verify initial state: 4 notes total, lane B has 2 notes
    await expect(page.locator('.note-card')).toHaveCount(4)
    await expect(laneA.locator('.note-card')).toHaveCount(1)
    await expect(laneB.locator('.note-card')).toHaveCount(2)
    await expect(laneC.locator('.note-card')).toHaveCount(1)

    // Verify specific notes are in lane B
    await expect(laneB.locator('.note-card .note-title:has-text("Note B1")')).toBeVisible()
    await expect(laneB.locator('.note-card .note-title:has-text("Note B2")')).toBeVisible()

    // Double-click on lane B name to start renaming
    const laneBName = laneB.locator('span[x-text="lane.name"]:has-text("B")')
    await expect(laneBName).toBeVisible()
    await laneBName.dblclick()

    // Wait for the input field to appear - after double-click only one input will be visible
    await page.waitForTimeout(500)
    // Find the single visible input that appears when editing a lane
    const laneRenameInput = page.locator('input[x-model="editingLaneName"]:visible')
    await expect(laneRenameInput).toBeVisible()

    // Verify the input contains the current lane name "B"
    await expect(laneRenameInput).toHaveValue('B')

    // Clear the input and type new name "Renamed B"
    await laneRenameInput.clear()
    await laneRenameInput.fill('Renamed B')

    // Press Enter to confirm the rename
    await laneRenameInput.press('Enter')

    // Wait for the rename to complete
    await page.waitForTimeout(2000)

    // Verify the number of lanes is the same (3 lanes)
    await expect(page.locator('.lane')).toHaveCount(3)

    // Verify the renamed lane is now at the same position with the new name
    const renamedLane = page.locator('.lane').nth(1) // Lane B was at position 1 (0-indexed)
    await expect(renamedLane.locator('span[x-text="lane.name"]')).toContainText('Renamed B')

    // Verify the original lane names A and C are still present (use exact text matching)
    await expect(page.locator('span[x-text="lane.name"]', { hasText: /^A$/ })).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]', { hasText: /^C$/ })).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]', { hasText: /^B$/ })).not.toBeVisible()

    // Verify the renamed lane still has the same 2 notes
    await expect(renamedLane.locator('.note-card')).toHaveCount(2)
    await expect(renamedLane.locator('.note-card .note-title:has-text("Note B1")')).toBeVisible()
    await expect(renamedLane.locator('.note-card .note-title:has-text("Note B2")')).toBeVisible()

    // Verify other lanes still have their notes
    await expect(laneA.locator('.note-card')).toHaveCount(1)
    await expect(laneC.locator('.note-card')).toHaveCount(1)

    // Verify total notes count is still 4
    await expect(page.locator('.note-card')).toHaveCount(4)
  })

  test('should rename lane A to "New First Lane" and preserve notes', async ({ page }) => {
    await setupLaneManagementBoard(page)
    // Create initial notes: 1 in A, 1 in B, 1 in C
    const createNoteInLane = async (lane, title) => {
      const addNoteButton = lane.locator('button.lane-action-btn:not(.delete):has-text("+")')
      await expect(addNoteButton).toBeVisible()
      await addNoteButton.click({ force: true })

      await expect(page.locator('div[x-show="modalManager.showModal"]')).toBeVisible({ timeout: 2000 })
      const modalInput = page.locator('input[x-model="modalManager.modalInput"]')
      await expect(modalInput).toBeVisible()
      await modalInput.fill(title)

      const modal = page.locator('div[x-show="modalManager.showModal"]')
      const confirmButton = modal.locator('button:has-text("OK")')
      await expect(confirmButton).toBeVisible()
      await confirmButton.click()

      await expect(page.locator('div[x-show="modalManager.showModal"]')).not.toBeVisible({ timeout: 2000 })
      await page.waitForTimeout(2000)
      await expect(lane.locator('.note-card .note-title:has-text("' + title + '")')).toBeVisible({ timeout: 5000 })
    }

    // Get lanes
    const laneA = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("A")') }).first()
    const laneB = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("B")') }).first()
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()

    // Create one note in each lane
    await createNoteInLane(laneA, 'Note A1')
    await createNoteInLane(laneB, 'Note B1')
    await createNoteInLane(laneC, 'Note C1')

    // Wait for all notes to be visible
    await page.waitForTimeout(3000)

    // Verify initial state: 3 notes total
    await expect(page.locator('.note-card')).toHaveCount(3)

    // Double-click on lane A name to start renaming (first lane)
    const laneAName = laneA.locator('span[x-text="lane.name"]:has-text("A")')
    await expect(laneAName).toBeVisible()
    await laneAName.dblclick()

    // Wait for the input field to appear - after double-click only one input will be visible
    await page.waitForTimeout(500)
    // Find the single visible input that appears when editing a lane
    const laneRenameInput = page.locator('input[x-model="editingLaneName"]:visible')
    await expect(laneRenameInput).toBeVisible()

    // Clear the input and type new name
    await laneRenameInput.clear()
    await laneRenameInput.fill('New First Lane')

    // Press Enter to confirm the rename
    await laneRenameInput.press('Enter')

    // Wait for the rename to complete
    await page.waitForTimeout(2000)

    // Verify the number of lanes is the same (3 lanes)
    await expect(page.locator('.lane')).toHaveCount(3)

    // Verify the renamed lane is now at the first position with the new name
    const renamedFirstLane = page.locator('.lane').nth(0) // First lane
    await expect(renamedFirstLane.locator('span[x-text="lane.name"]')).toContainText('New First Lane')

    // Verify the renamed lane still has its note
    await expect(renamedFirstLane.locator('.note-card')).toHaveCount(1)
    await expect(renamedFirstLane.locator('.note-card .note-title:has-text("Note A1")')).toBeVisible()

    // Verify other lanes are unaffected
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:text-is("A")')).not.toBeVisible()

    // Verify total notes count is still 3
    await expect(page.locator('.note-card')).toHaveCount(3)
  })

  test('should rename lane C to "Last Lane" and cancel rename with Escape', async ({ page }) => {
    await setupLaneManagementBoard(page)
    // Get lane C (the one we're going to test)
    const laneC = page.locator('.lane').filter({ has: page.locator('span[x-text="lane.name"]:has-text("C")') }).first()

    // Verify initial state: 3 lanes, no notes
    await expect(page.locator('.lane')).toHaveCount(3)
    await expect(page.locator('.note-card')).toHaveCount(0)

    // Double-click on lane C name to start renaming (last lane)
    const laneCName = laneC.locator('span[x-text="lane.name"]:has-text("C")')
    await expect(laneCName).toBeVisible()
    await laneCName.dblclick()

    // Wait for the input field to appear
    await page.waitForTimeout(500)
    const laneRenameInput = laneC.locator('input[x-model="editingLaneName"]')
    await expect(laneRenameInput).toBeVisible()

    // Verify the input contains the current lane name "C"
    await expect(laneRenameInput).toHaveValue('C')

    // Type a new name but then cancel with Escape
    await laneRenameInput.clear()
    await laneRenameInput.fill('Last Lane')
    await laneRenameInput.press('Escape')

    // Wait for the cancellation to complete
    await page.waitForTimeout(1000)

    // Verify the number of lanes is the same (3 lanes)
    await expect(page.locator('.lane')).toHaveCount(3)

    // Verify the lane name is still "C" (rename was cancelled)
    await expect(page.locator('span[x-text="lane.name"]:has-text("A")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("B")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()
    await expect(page.locator('span[x-text="lane.name"]:has-text("Last Lane")')).not.toBeVisible()

    // Verify the input field is no longer visible
    await expect(laneC.locator('input[x-model="editingLaneName"]')).not.toBeVisible()

    // Verify lane C name is still displayed as a span
    await expect(laneC.locator('span[x-text="lane.name"]:has-text("C")')).toBeVisible()
  })
})
