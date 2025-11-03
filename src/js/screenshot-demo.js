import { chromium } from 'playwright';

async function takeScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to demo site...');
    await page.goto('https://tocry-demo.ralsina.me');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for login form or authentication
    console.log('Checking if login is required...');

    // Try to find login form
    const loginSelectors = [
      'input[name="username"]',
      'input[type="text"]',
      'input[placeholder*="username"]',
      'input[placeholder*="user"]'
    ];

    let needsLogin = false;
    for (const selector of loginSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          needsLogin = true;
          console.log('Found login form, attempting to log in...');

          // Fill in credentials
          await element.fill('demo');

          // Find password field
          const passwordSelectors = [
            'input[name="password"]',
            'input[type="password"]',
            'input[placeholder*="password"]'
          ];

          for (const pwdSelector of passwordSelectors) {
            try {
              const pwdElement = await page.locator(pwdSelector).first();
              if (await pwdElement.isVisible({ timeout: 1000 })) {
                await pwdElement.fill('tocry');
                break;
              }
            } catch (e) {
              // Continue to next selector
            }
          }

          // Find and click submit button
          const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Login")',
            'button:has-text("Sign in")',
            'button:has-text("Log in")'
          ];

          for (const submitSelector of submitSelectors) {
            try {
              const submitElement = await page.locator(submitSelector).first();
              if (await submitElement.isVisible({ timeout: 1000 })) {
                await submitElement.click();
                break;
              }
            } catch (e) {
              // Continue to next selector
            }
          }

          // Wait for login to complete
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    console.log('Looking for boards...');

    // Wait for board content to load
    await page.waitForTimeout(3000);

    // Look for "ToCry Features" board or any board with Features
    const boardSelectors = [
      'text="ToCry Features"',
      'text="Features Demo"',
      'a:has-text("Features")',
      '[data-board-name*="Features"]',
      '.board-item:has-text("Features")',
      'a[href*="features"]'
    ];

    let boardFound = false;
    for (const selector of boardSelectors) {
      try {
        const board = await page.locator(selector).first();
        if (await board.isVisible({ timeout: 2000 })) {
          console.log(`Found board with selector: ${selector}`);
          await board.click();
          boardFound = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // If specific board not found, try to find any board
    if (!boardFound) {
      console.log('Looking for any board...');
      const anyBoardSelectors = [
        'a[href*="board"]',
        '.board-item',
        '[data-testid="board"]',
        'a:has-text("Board")',
        'main a',
        'main [role="link"]'
      ];

      for (const selector of anyBoardSelectors) {
        try {
          const anyBoard = await page.locator(selector).first();
          if (await anyBoard.isVisible({ timeout: 2000 })) {
            console.log(`Found board with selector: ${selector}`);
            await anyBoard.click();
            boardFound = true;
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
    }

    // Wait for board to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('Setting up screenshot...');

    // Hide any potential popups or overlays
    await page.evaluate(() => {
      const elementsToHide = [
        '.modal', '.popup', '.tooltip', '.dropdown', '.context-menu',
        '[role="dialog"]', '[role="tooltip"]', '.toast', '.notification',
        '.floating', '.overlay'
      ];

      elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.style.display = 'none');
      });
    });

    // Wait a bit for any hiding animations
    await page.waitForTimeout(1000);

    // Find the main content area
    const contentSelectors = [
      'main',
      '.board',
      '.kanban-board',
      '[data-testid="board"]',
      '.content',
      '#app'
    ];

    let screenshotTaken = false;
    for (const selector of contentSelectors) {
      try {
        const container = await page.locator(selector).first();
        if (await container.isVisible({ timeout: 2000 })) {
          const box = await container.boundingBox();

          if (box) {
            console.log(`Taking screenshot of ${selector}...`);
            await page.screenshot({
              path: '/home/ralsina/code/tocry/docs/src/screenshot.png',
              clip: {
                x: Math.max(0, box.x - 20),
                y: Math.max(0, box.y - 20),
                width: Math.min(1600, box.width + 40),
                height: Math.min(900, box.height + 40)
              }
            });
            screenshotTaken = true;
            break;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Fallback to full page screenshot
    if (!screenshotTaken) {
      console.log('Taking full page screenshot as fallback...');
      await page.screenshot({
        path: '/home/ralsina/code/tocry/docs/src/screenshot.png',
        fullPage: false
      });
    }

    console.log('Screenshot saved successfully!');

  } catch (error) {
    console.error('Error taking screenshot:', error);

    // Try to take a fallback screenshot anyway
    try {
      await page.screenshot({
        path: '/home/ralsina/code/tocry/docs/src/screenshot.png'
      });
      console.log('Fallback screenshot saved.');
    } catch (fallbackError) {
      console.error('Could not take fallback screenshot:', fallbackError);
    }
  } finally {
    await browser.close();
  }
}

// Run the function
takeScreenshot().catch(console.error);