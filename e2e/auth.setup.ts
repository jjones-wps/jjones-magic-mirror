import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

/**
 * Global Authentication Setup for Playwright Tests
 *
 * This setup runs once before all tests to authenticate and save the session state.
 * All test files will then use this authenticated state.
 *
 * SETUP REQUIRED:
 * Set these environment variables in your shell or .env.test.local:
 * - TEST_ADMIN_EMAIL (default: admin@example.com)
 * - TEST_ADMIN_PASSWORD (default: admin123)
 *
 * To create a test admin user, run:
 * npm run db:seed  # Creates default admin user
 */

setup('authenticate', async ({ page }) => {
  const testEmail = process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@example.com';
  const testPassword = process.env.TEST_ADMIN_PASSWORD || 'admin123';

  console.log(`[Auth Setup] Authenticating as: ${testEmail}`);

  // Navigate to login page
  await page.goto('/admin/login');

  // Wait for login form to be visible
  await page.waitForSelector('form', { timeout: 10000 });

  // Fill in credentials
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  await emailInput.fill(testEmail);
  await passwordInput.fill(testPassword);

  // Click login button
  const loginButton = page.locator('button[type="submit"]').first();
  await loginButton.click();

  // Wait for successful login (redirects to dashboard or shows error)
  try {
    await expect(page).toHaveURL('/admin', { timeout: 10000 });
    console.log('[Auth Setup] ✅ Authentication successful');
  } catch (error) {
    console.error('[Auth Setup] ❌ Authentication failed - check credentials');
    console.error(`[Auth Setup] Current URL: ${page.url()}`);
    throw error;
  }

  // Save authenticated state
  await page.context().storageState({ path: authFile });
  console.log(`[Auth Setup] Session saved to: ${authFile}`);
});
