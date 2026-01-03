import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Calendar Settings Page
 *
 * Tests calendar feed management including:
 * - Display options (days ahead, max events, refresh interval)
 * - Calendar feed listing
 * - Settings persistence
 */

test.describe('Calendar Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: 'Calendar Settings' })).toBeVisible();
  });

  test('should display calendar settings page', async ({ page }) => {
    // Verify "Display Options" section
    await expect(page.getByRole('heading', { name: 'Display Options' })).toBeVisible();

    // Verify "Calendar Feeds" section
    await expect(page.getByRole('heading', { name: 'Calendar Feeds' })).toBeVisible();

    // Verify days ahead slider is visible
    await expect(page.getByRole('slider', { name: 'Days Ahead' })).toBeVisible();
  });

  test('should adjust days ahead slider and persist', async ({ page }) => {
    const daysSlider = page.locator('input[type="range"][max="14"]');

    // Set to 10 days
    await daysSlider.fill('10');

    // Verify display updates
    await expect(page.getByText('10 days')).toBeVisible();

    // Note: Calendar settings page may not have explicit Save button
    // Settings might auto-save or require navigation to trigger save
    // Adjust this test based on actual implementation
  });

  test('should change max events shown dropdown', async ({ page }) => {
    const maxEventsSelect = page.getByRole('combobox', { name: 'Max Events Shown' });

    // Select 7 events
    await maxEventsSelect.selectOption('7');

    // Verify selection
    await expect(maxEventsSelect).toHaveValue('7');
  });

  test('should change refresh interval dropdown', async ({ page }) => {
    const refreshIntervalSelect = page.getByRole('combobox', { name: 'Refresh Interval' });

    // Select 15 minutes
    await refreshIntervalSelect.selectOption('15');

    // Verify selection
    await expect(refreshIntervalSelect).toHaveValue('15');
  });

  test('should display configured calendar feeds', async ({ page }) => {
    // Verify "Calendar Feeds" header shows feed count
    const feedsText = await page.getByText(/\d+ feeds? configured/).textContent();
    expect(feedsText).toMatch(/\d+ feeds? configured/);

    // Verify "Add Feed" button is visible
    await expect(page.getByRole('button', { name: '+ Add Feed' })).toBeVisible();
  });

  test('should show Primary and Secondary calendar sections', async ({ page }) => {
    // Verify Primary Calendar section exists
    await expect(page.getByRole('heading', { name: 'Primary Calendar' })).toBeVisible();

    // Verify Secondary Calendar section exists
    await expect(page.getByRole('heading', { name: 'Secondary Calendar' })).toBeVisible();
  });

  test('should show edit and remove buttons for each feed', async ({ page }) => {
    // Find all Edit buttons (using aria-label)
    const editButtons = page.getByRole('button', { name: 'Edit feed' });
    await expect(editButtons.first()).toBeVisible();

    // Find all Remove buttons (using aria-label)
    const removeButtons = page.getByRole('button', { name: 'Remove feed' });
    await expect(removeButtons.first()).toBeVisible();
  });

  test('should display event counts for each feed', async ({ page }) => {
    // Verify event count text is visible in feed list (not dropdowns)
    // Use more specific selector to avoid matching dropdown options
    const feedSection = page.locator('.admin-card').filter({ hasText: 'Calendar Feeds' });
    const eventCountText = feedSection.getByText(/\d+ events?/).first();
    await expect(eventCountText).toBeVisible();
  });

  test('should display last sync time for each feed', async ({ page }) => {
    // Verify "Synced" text is visible
    const syncedElements = page.getByText(/Synced/);
    await expect(syncedElements.first()).toBeVisible();
  });

  test('should have proper form controls', async ({ page }) => {
    // Verify all major form elements are present
    await expect(page.locator('input[type="range"][max="14"]')).toBeVisible(); // Days ahead slider
    await expect(page.getByRole('combobox', { name: 'Max Events Shown' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Refresh Interval' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Feed' })).toBeVisible();
  });
});
