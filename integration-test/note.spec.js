import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#add-lane-btn')).toBeVisible();

  // Ensure we have at least two lanes for drag and drop tests
  const lane1Name = 'Lane A';
  const lane2Name = 'Lane B';

  // Create Lane A
  await page.locator('#add-lane-btn').click();
  await page.locator('#prompt-dialog-input').fill(lane1Name);
  await page.locator('#prompt-dialog-ok-btn').click();
  await expect(page.locator(`.lane[data-lane-name="${lane1Name}"]`)).toBeVisible();

  // Create Lane B
  await page.locator('#add-lane-btn').click();
  await page.locator('#prompt-dialog-input').fill(lane2Name);
  await page.locator('#prompt-dialog-ok-btn').click();
  await expect(page.locator(`.lane[data-lane-name="${lane2Name}"]`)).toBeVisible();
});

test.describe('Note Management', () => {
  test('should allow adding a note to a lane', async ({ page }) => {
    const laneName = 'Lane A';
    const noteTitle = 'My First Note';

    const laneA = page.locator(`.lane[data-lane-name="${laneName}"]`);
    await laneA.locator('.add-note-btn').click();

    const promptDialog = page.locator('#custom-prompt-dialog');
    await expect(promptDialog).toBeVisible();
    await promptDialog.locator('#prompt-dialog-input').fill(noteTitle);
    await promptDialog.locator('#prompt-dialog-ok-btn').click();
    await expect(promptDialog).not.toBeVisible();

    const newNote = laneA.locator(`.note-card`, { hasText: noteTitle });
    await expect(newNote).toBeVisible();
    await expect(newNote.locator('h4')).toHaveText(noteTitle);
  });

  test('should allow dragging a note between lanes', async ({ page }) => {
    const laneA = page.locator(`.lane[data-lane-name="Lane A"]`);
    const laneB = page.locator(`.lane[data-lane-name="Lane B"]`);

    // Add a note to Lane A
    const noteTitle = 'Draggable Note';
    await laneA.locator('.add-note-btn').click();
    await page.locator('#prompt-dialog-input').fill(noteTitle);
    await page.locator('#prompt-dialog-ok-btn').click();
    const noteToDrag = laneA.locator(`.note-card`, { hasText: noteTitle });
    await expect(noteToDrag).toBeVisible();

    // Perform drag and drop
    await noteToDrag.dragTo(laneB.locator('.notes-list'));

    // Assert the note is no longer in Lane A
    await expect(laneA.locator(`.note-card`, { hasText: noteTitle })).not.toBeVisible();

    // Assert the note is now in Lane B
    const movedNote = laneB.locator(`.note-card`, { hasText: noteTitle });
    await expect(movedNote).toBeVisible();
  });

  test('should allow reordering notes within the same lane', async ({ page }) => {
    const laneA = page.locator(`.lane[data-lane-name="Lane A"]`);

    // Add three notes to Lane A
    await laneA.locator('.add-note-btn').click();
    await page.locator('#prompt-dialog-input').fill('Note 1');
    await page.locator('#prompt-dialog-ok-btn').click();

    await laneA.locator('.add-note-btn').click();
    await page.locator('#prompt-dialog-input').fill('Note 2');
    await page.locator('#prompt-dialog-ok-btn').click();

    await laneA.locator('.add-note-btn').click();
    await page.locator('#prompt-dialog-input').fill('Note 3');
    await page.locator('#prompt-dialog-ok-btn').click();

    const note1 = laneA.locator(`.note-card`, { hasText: 'Note 1' });
    const note3 = laneA.locator(`.note-card`, { hasText: 'Note 3' });

    // Verify initial order
    await expect(laneA.locator('.note-card h4')).toHaveText(['Note 1', 'Note 2', 'Note 3']);

    // Drag Note 1 to be after Note 3
    await note1.dragTo(note3);

    // Verify new order
    await expect(laneA.locator('.note-card h4')).toHaveText(['Note 2', 'Note 3', 'Note 1']);
  });
});
