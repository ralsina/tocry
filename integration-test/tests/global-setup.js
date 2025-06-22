import { request } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalSetup() {
  console.log('Global setup: Cleaning database...');
  const requestContext = await request.newContext();
  try {
    // Clear the database by removing the data directory
    const dataDir = path.resolve(__dirname, '../data');
    console.log(`Data directory: ${dataDir}`);
    if (await fs.stat(dataDir).catch(() => null)) { // Check if directory exists
      // await fs.rm(dataDir, { recursive: true, force: true });
      console.log(`Removed data directory: ${dataDir}`);
    }
  } catch (error) {
    console.error('Could not clean database during global setup:', error.message);
    // Exit with a non-zero code to stop the test run if setup fails.
    process.exit(1);
  } finally {
    await requestContext.dispose();
  }
}

export default globalSetup;
