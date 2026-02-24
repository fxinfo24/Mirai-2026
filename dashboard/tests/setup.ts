// Jest setup file
// Add custom matchers or global test configuration here

// Increase timeout for E2E tests
jest.setTimeout(30000);

// Create screenshots directory if it doesn't exist
import { mkdirSync } from 'fs';
import { join } from 'path';

const screenshotsDir = join(__dirname, 'e2e', 'screenshots');
try {
  mkdirSync(screenshotsDir, { recursive: true });
} catch (err) {
  // Directory already exists
}
