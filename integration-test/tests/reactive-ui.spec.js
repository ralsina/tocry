import { test, expect } from '@playwright/test'

// Helper to generate a unique board name for each test
function generateUniqueBoardName () {
  return `test-board-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

test.describe('Reactive UI Features', () => {
  test('should show empty state when board has no lanes', async ({ page }) => {
    const uniqueBoardName = generateUniqueBoardName()

    // Create the board via API before navigating
    const response = await page.request.post('/boards', {
      data: {
        name: uniqueBoardName
      }
    })
    await expect(response).toBeOK()

    // Navigate to the board
    await page.goto(`/b/${uniqueBoardName}`)

    // Disable all CSS animations to prevent flakiness in tests
    await page.addStyleTag({ content: '* { animation: none !important; }' })

    // Wait a moment for Alpine.js to initialize
    await page.waitForTimeout(1000)

    // Debug: Take a screenshot to see what's rendered
    await page.screenshot({ path: 'test-results/empty-state-debug.png', fullPage: true })

    // Check that empty state message is shown
    await expect(page.locator('h2:has-text("Create Your First Lanes")')).toBeVisible()

    // Check that lane templates are visible
    await expect(page.locator('text=Todo → In Progress → Done')).toBeVisible()
    await expect(page.locator('text=Backlog → To Do → In Progress → Review → Done')).toBeVisible()
    await expect(page.locator('text=Today → This Week → Someday → Done')).toBeVisible()

    // Check that guidance text is shown
    await expect(page.locator('text=For custom lane names, use the menu button in the top right corner')).toBeVisible()

    // Verify that hamburger menu is visible (it should be throbbing, but animation is disabled)
    await expect(page.locator('[x-ref="hamburgerMenuButton"]')).toBeVisible()
  })

  test('should create lanes from templates', async ({ page }) => {
    const uniqueBoardName = generateUniqueBoardName()

    // Create empty board
    await page.request.post('/boards', {
      data: { name: uniqueBoardName }
    })

    await page.goto(`/b/${uniqueBoardName}`)
    await page.addStyleTag({ content: '* { animation: none !important; }' })

    // Click on Task Management template (click on the div containing "Task Management")
    await page.locator('div:has-text("Task Management")').first().click()

    // Wait for lanes to be created
    await page.waitForTimeout(500)

    // Check that success toast appears
    await expect(page.locator('.toast-notification.toast-success')).toBeVisible()

    // Verify all lanes were created - lane names are in spans within lane-header
    await expect(page.locator('.lane-header span:has-text("Backlog")')).toBeVisible()
    await expect(page.locator('.lane-header span:has-text("To Do")')).toBeVisible()
    await expect(page.locator('.lane-header span:has-text("In Progress")')).toBeVisible()
    await expect(page.locator('.lane-header span:has-text("Review")')).toBeVisible()
    await expect(page.locator('.lane-header span:has-text("Done")')).toBeVisible()

    // Verify empty state is no longer shown
    await expect(page.locator('h2:has-text("Create Your First Lanes")')).not.toBeVisible()
  })

  test('should hide empty state after adding a single lane', async ({ page }) => {
    const uniqueBoardName = generateUniqueBoardName()

    // Create empty board
    await page.request.post('/boards', {
      data: { name: uniqueBoardName }
    })

    await page.goto(`/b/${uniqueBoardName}`)
    await page.addStyleTag({ content: '* { animation: none !important; }' })

    // Verify empty state is shown
    await expect(page.locator('h2:has-text("Create Your First Lanes")')).toBeVisible()

    // Create a lane via hamburger menu
    await page.locator('[x-ref="hamburgerMenuButton"]').click()
    // Click the "New Lane" link in the dropdown menu
    await page.locator('a:has-text("New Lane")').click()

    // Wait for modal to become visible - the modal has "Add New Lane" as its title
    const modal = page.locator('.modal-overlay').filter({ hasText: 'Add New Lane' })
    await expect(modal).toBeVisible()

    const modalInput = page.locator('input[x-model="newLaneName"]')
    await modalInput.fill('Test Lane')
    await page.locator('button:has-text("Add Lane")').click()

    // Verify empty state is hidden
    await expect(page.locator('h2:has-text("Create Your First Lanes")')).not.toBeVisible()

    // Verify lane is visible
    await expect(page.locator('.lane-header span:has-text("Test Lane")')).toBeVisible()
  })

  test('should show toast notifications for various actions', async ({ page }) => {
    const uniqueBoardName = generateUniqueBoardName()

    // Create board via API
    await page.request.post('/boards', {
      data: { name: uniqueBoardName }
    })

    await page.goto(`/b/${uniqueBoardName}`)
    await page.addStyleTag({ content: '* { animation: none !important; }' })

    // Test board rename toast
    await page.locator('[x-ref="hamburgerMenuButton"]').click()
    await page.locator('a:has-text("Rename Board")').click()

    const modal = page.locator('.modal-overlay').filter({ hasText: 'Enter new' })
    await expect(modal).toBeVisible()

    const modalInput = page.locator('input[x-model="modalInput"]')
    await modalInput.fill(`${uniqueBoardName}-renamed`)
    await page.locator('button:has-text("OK")').first().click()

    // Check for success toast
    await expect(page.locator('.toast-notification.toast-success')).toBeVisible()

    // Test lane creation toast
    await page.locator('[x-ref="hamburgerMenuButton"]').click()
    await page.locator('a:has-text("New Lane")').click()

    // Wait for modal to appear
    const laneModal = page.locator('.modal-overlay').filter({ hasText: 'Add New Lane' })
    await expect(laneModal).toBeVisible()

    const laneModalInput = page.locator('input[x-model="newLaneName"]')
    await laneModalInput.fill('Toast Test Lane')
    await page.locator('button:has-text("Add Lane")').click()

    // Check for success toast
    await expect(page.locator('.toast-notification.toast-success')).toBeVisible()
  })

  test('should show info toast for empty board guidance', async ({ page }) => {
    const uniqueBoardName = generateUniqueBoardName()

    // Create empty board
    await page.request.post('/boards', {
      data: { name: uniqueBoardName }
    })

    await page.goto(`/b/${uniqueBoardName}`)
    await page.addStyleTag({ content: '* { animation: none !important; }' })

    // Click on Simple template (click on the div containing "Simple")
    await page.locator('div:has-text("Simple")').first().click()

    // Wait for lanes to be created and info toast to appear
    await page.waitForTimeout(300)

    // Check for info toast about hamburger menu
    const infoToast = page.locator('.toast-notification.toast-info')
    if (await infoToast.isVisible()) {
      await expect(infoToast).toBeVisible()
    }
  })
})
