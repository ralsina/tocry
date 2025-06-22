import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Navigate to the main application page
  await page.goto('/');
  // Ensure the app is loaded and ready
  await expect(page.locator('#add-lane-btn')).toBeVisible();
});

test.describe('Lane Management', () => {
  test('should allow creating a new lane', async ({ page }) => {
    const newLaneName = 'My New Test Lane';

    await page.locator('#add-lane-btn').click();

    const promptDialog = page.locator('#custom-prompt-dialog');
    await expect(promptDialog).toBeVisible();

    await promptDialog.locator('#prompt-dialog-input').fill(newLaneName);
    await promptDialog.locator('#prompt-dialog-ok-btn').click();

    await expect(promptDialog).not.toBeVisible();

    const newLane = page.locator(`.lane[data-lane-name="${newLaneName}"]`);
    await expect(newLane).toBeVisible();
    await expect(newLane.locator('.lane-title')).toHaveText(newLaneName);
  });

  test('should allow renaming a lane', async ({ page }) => {
    const originalLaneName = 'Lane to Rename';
    await page.locator('#add-lane-btn').click();
    await page.locator('#prompt-dialog-input').fill(originalLaneName);
    await page.locator('#prompt-dialog-ok-btn').click();
    await expect(page.locator(`.lane[data-lane-name="${originalLaneName}"]`)).toBeVisible();

    const newLaneName = 'Renamed Lane';
    const laneTitleElement = page.locator(`.lane[data-lane-name="${originalLaneName}"] .lane-title`);

    await laneTitleElement.click(); // Click to make editable

    await laneTitleElement.fill(newLaneName);
    await page.locator('body').click(); // Blur to save

    await expect(page.locator(`.lane[data-lane-name="${newLaneName}"] .lane-title`)).toHaveText(newLaneName);
  });

  test('should allow deleting a lane', async ({ page }) => {
    const laneToDeleteName = 'Lane to Delete';
    await page.locator('#add-lane-btn').click();
    await page.locator('#prompt-dialog-input').fill(laneToDeleteName);
    await page.locator('#prompt-dialog-ok-btn').click();
    const laneToDelete = page.locator(`.lane[data-lane-name="${laneToDeleteName}"]`);
    await expect(laneToDelete).toBeVisible();

    await laneToDelete.locator('.delete-lane-btn').click();

    const confirmDialog = page.locator('#custom-confirm-dialog');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.locator('#confirm-dialog-ok-btn').click();

    await expect(laneToDelete).not.toBeVisible();
  });
});
