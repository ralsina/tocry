import { test, expect } from '@playwright/test';

// Helper to generate a unique board name for each test
function generateUniqueBoardName () {
  return `test-board-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

test.describe('Paste functionality in lanes', () => {
  test.beforeEach(async ({ page }) => {
    const uniqueBoardName = generateUniqueBoardName();
    // Create the board via API before navigating
    const response = await page.request.post('/boards', {
      data: {
        name: uniqueBoardName
      }
    });
    await expect(response).toBeOK();
    // Navigate to the main application page
    await page.goto(`/b/${uniqueBoardName}`);

    // Disable all CSS animations to prevent flakiness in tests
    await page.addStyleTag({ content: '* { animation: none !important; }' });

    // Ensure the lanes container is visible
    await expect(page.locator('#add-lane-btn')).toBeVisible();
    await expect(page.locator('#board-selector')).toBeVisible();

    // Select the newly created board in the selector
    await expect(page.locator('#board-selector')).toHaveValue(uniqueBoardName);

    // Add a lane for the tests to use
    const newLaneName = 'Test Lane';
    await page.locator('#add-lane-btn').click();
    const promptDialog = page.locator('#custom-prompt-dialog');
    await expect(promptDialog).toBeVisible();
    await promptDialog.locator('#prompt-dialog-input').fill(newLaneName);
    await promptDialog.locator('#prompt-dialog-ok-btn').click();
    await expect(promptDialog).not.toBeVisible();
    const newLane = page.locator(`.lane[data-lane-name="${newLaneName}"]`);
    await expect(newLane).toBeVisible();
  });

  test('should create a new note when text is pasted into a lane', async ({ page }) => {
    const laneLocator = page.locator('.lane').first();
    const initialNoteCount = await laneLocator.locator('.note-card').count();
    const pastedText = 'This is a test note pasted from clipboard.';

    // Simulate a paste event on the lane container
    await laneLocator.evaluate((node, text) => {
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
        bubbles: true,
        cancelable: true,
      });
      pasteEvent.clipboardData.setData('text/plain', text);
      node.dispatchEvent(pasteEvent);
    }, pastedText);

    // Verify a new note card appeared
    await expect(laneLocator.locator('.note-card')).toHaveCount(initialNoteCount + 1);

    // Verify the content of the new note (assuming it's directly visible or in the title)
    await expect(laneLocator.locator('.note-card').last().locator('h4')).toHaveText(pastedText);
  });

  test('should create a new note when an image is pasted into a lane', async ({ page }) => {
    const laneLocator = page.locator('.lane').first();
    const initialNoteCount = await laneLocator.locator('.note-card').count();

    // Create a dummy image buffer (1x1 transparent PNG)
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

    // Simulate a paste event with an image file
    await laneLocator.evaluate((node, buffer) => {
      const dataTransfer = new DataTransfer();
      const blob = new Blob([buffer], { type: 'image/png' });
      const file = new File([blob], 'test-image.png', { type: 'image/png' });
      dataTransfer.items.add(file);

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      node.dispatchEvent(pasteEvent);
    }, imageBuffer);

    // Verify a new note card appeared. Increased timeout for potential upload/processing.
    await expect(laneLocator.locator('.note-card')).toHaveCount(initialNoteCount + 1, { timeout: 10000 });
    // Further assertions could be added here if the app provides specific visual cues for image notes.
    // For example, if image notes have a specific class or a predictable title.
  });
});
