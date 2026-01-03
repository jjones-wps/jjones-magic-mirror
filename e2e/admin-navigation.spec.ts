import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Admin Portal Navigation
 *
 * Tests navigation between admin pages and overall portal functionality:
 * - Dashboard loads correctly
 * - Navigation links work
 * - Page transitions are smooth
 * - No console errors during navigation
 */

test.describe('Admin Portal Navigation', () => {
  test('should load admin dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Verify dashboard heading
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Verify key dashboard elements
    await expect(page.getByText('MIRROR ONLINE')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Active Widgets' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
  });

  test('should navigate to all admin pages via sidebar', async ({ page }) => {
    await page.goto('/admin');

    // Test navigation to each admin page
    const pages = [
      { link: 'Dashboard', heading: 'Dashboard', url: '/admin' },
      { link: 'Calendar', heading: 'Calendar Settings', url: '/admin/calendar' },
      { link: 'Weather', heading: 'Weather Settings', url: '/admin/weather' },
      { link: 'Commute', heading: 'Commute Routes', url: '/admin/commute' },
      { link: 'AI Summary', heading: 'AI Summary Settings', url: '/admin/ai-summary' },
      { link: 'AI Behavior', heading: 'AI Behavior Settings', url: '/admin/ai-behavior' },
    ];

    for (const { link, heading, url } of pages) {
      // Click navigation link
      await page.getByRole('link', { name: new RegExp(link, 'i') }).click();

      // Verify URL changed
      await expect(page).toHaveURL(url);

      // Verify page loaded with correct heading
      await expect(page.getByRole('heading', { name: new RegExp(heading, 'i') })).toBeVisible();
    }
  });

  test('should display "View Mirror" link on dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Verify "View Mirror →" link exists
    const viewMirrorLink = page.getByRole('link', { name: /View Mirror/ });
    await expect(viewMirrorLink).toBeVisible();

    // Verify it points to the mirror display
    await expect(viewMirrorLink).toHaveAttribute('href', '/');
  });

  test('should show active widgets count on dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Verify widget count is displayed (e.g., "7 of 7 enabled")
    await expect(page.getByText(/\d+ of \d+ enabled/)).toBeVisible();

    // Verify "Manage →" link to widgets page
    await expect(page.getByRole('link', { name: /Manage/ })).toBeVisible();
  });

  test('should display system metrics on dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Verify system metrics are visible
    await expect(page.getByText('UPTIME')).toBeVisible();
    await expect(page.getByText('CONFIG VERSION')).toBeVisible();
    await expect(page.getByText('MEMORY')).toBeVisible();
    await expect(page.getByText('CPU LOAD')).toBeVisible();
  });

  test('should show recent activity log on dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Verify activity log section
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
    await expect(page.getByText('LAST 10 ACTIONS')).toBeVisible();
  });

  test('should maintain navigation state across page transitions', async ({ page }) => {
    await page.goto('/admin');

    // Navigate to AI Behavior page
    await page.getByRole('link', { name: /AI Behavior/ }).click();
    await expect(page).toHaveURL('/admin/ai-behavior');

    // Verify sidebar is still visible
    await expect(page.getByRole('navigation')).toBeVisible();

    // Verify "CONTROL PANEL" header is present
    await expect(page.getByText('CONTROL PANEL')).toBeVisible();

    // Verify "ONLINE" status indicator is present
    await expect(page.getByText('ONLINE')).toBeVisible();
  });

  test('should handle direct URL navigation to admin pages', async ({ page }) => {
    // Navigate directly to AI Behavior page
    await page.goto('/admin/ai-behavior');

    // Verify page loaded correctly
    await expect(page.getByRole('heading', { name: 'AI Behavior Settings' })).toBeVisible();

    // Verify sidebar is present
    await expect(page.getByRole('navigation')).toBeVisible();

    // Navigate directly to Weather page
    await page.goto('/admin/weather');

    // Verify page loaded correctly
    await expect(page.getByRole('heading', { name: 'Weather Settings' })).toBeVisible();
  });

  test('should not have console errors during navigation', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate through several pages
    await page.goto('/admin');
    await page.getByRole('link', { name: /AI Behavior/ }).click();
    await page.getByRole('link', { name: /Weather/ }).click();
    await page.getByRole('link', { name: /Calendar/ }).click();
    await page.getByRole('link', { name: /Dashboard/ }).click();

    // Verify no console errors occurred
    expect(consoleErrors).toHaveLength(0);
  });
});
