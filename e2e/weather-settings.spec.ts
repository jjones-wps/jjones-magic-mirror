import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Weather Settings Page
 *
 * Tests weather location configuration including:
 * - Temperature unit selection (Fahrenheit/Celsius)
 * - Location coordinates (latitude/longitude)
 * - Settings persistence after save and reload
 */

test.describe('Weather Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/weather');
    await expect(page.getByRole('heading', { name: 'Weather Settings' })).toBeVisible();
  });

  test('should display current weather settings', async ({ page }) => {
    // Verify latitude and longitude fields are visible and readonly
    const latitudeField = page.getByRole('textbox', { name: 'Latitude' });
    const longitudeField = page.getByRole('textbox', { name: 'Longitude' });

    await expect(latitudeField).toBeVisible();
    await expect(longitudeField).toBeVisible();

    // Verify readonly attribute (prevents direct editing)
    await expect(latitudeField).toHaveAttribute('readonly');
    await expect(longitudeField).toHaveAttribute('readonly');

    // Verify temperature unit radios are visible
    await expect(page.getByRole('radio', { name: /Fahrenheit/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Celsius/ })).toBeVisible();
  });

  test('should toggle temperature units and persist', async ({ page }) => {
    const fahrenheitRadio = page.getByRole('radio', { name: /Fahrenheit/ });
    const celsiusRadio = page.getByRole('radio', { name: /Celsius/ });

    // Close any open autocomplete dropdowns by clicking on the page heading
    await page.getByRole('heading', { name: 'Weather Settings' }).click();

    // Wait for any autocomplete listbox to be hidden
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeHidden({ timeout: 2000 }).catch(() => {
      // Listbox might not exist or already hidden, continue anyway
    });

    // Get initial state
    const initialFahrenheit = await fahrenheitRadio.isChecked();

    // Toggle to opposite unit
    if (initialFahrenheit) {
      await celsiusRadio.check();
      await expect(celsiusRadio).toBeChecked();
    } else {
      await fahrenheitRadio.check();
      await expect(fahrenheitRadio).toBeChecked();
    }

    // Verify Save button is enabled
    const saveButton = page.getByRole('button', { name: 'Save Changes' });
    await expect(saveButton).toBeEnabled();

    // Save settings
    await saveButton.click();
    await expect(saveButton).toBeDisabled({ timeout: 5000 });

    // Reload page
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Weather Settings' })).toBeVisible();

    // Verify unit persisted
    if (initialFahrenheit) {
      await expect(celsiusRadio).toBeChecked();
    } else {
      await expect(fahrenheitRadio).toBeChecked();
    }
  });

  test('should reset changes when clicking Reset button', async ({ page }) => {
    // Get original unit
    const fahrenheitRadio = page.getByRole('radio', { name: /Fahrenheit/ });
    const celsiusRadio = page.getByRole('radio', { name: /Celsius/ });
    const originalFahrenheit = await fahrenheitRadio.isChecked();

    // Close any open autocomplete dropdown by clicking on the page heading
    // This prevents dropdown from blocking radio button clicks
    await page.getByRole('heading', { name: 'Weather Settings' }).click();

    // Toggle unit
    if (originalFahrenheit) {
      await celsiusRadio.check();
    } else {
      await fahrenheitRadio.check();
    }

    // Verify Save and Reset buttons are enabled
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeEnabled();

    // Click Reset
    await page.getByRole('button', { name: 'Reset' }).click();

    // Verify unit reverted
    if (originalFahrenheit) {
      await expect(fahrenheitRadio).toBeChecked();
    } else {
      await expect(celsiusRadio).toBeChecked();
    }

    // Verify buttons are disabled again
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  test('should display location search autocomplete', async ({ page }) => {
    // Verify location search combobox is present
    const locationSearch = page.getByRole('combobox', { name: /Search for a city/ });
    await expect(locationSearch).toBeVisible();

    // Note: Autocomplete requires geocoding API mock for full E2E testing
    // This test verifies the field exists and is interactive
    await expect(locationSearch).toBeEnabled();
  });

  test('should show coordinate constraints in help text', async ({ page }) => {
    // Verify latitude constraint text is visible
    await expect(page.getByText('-90 to 90')).toBeVisible();

    // Verify longitude constraint text is visible
    await expect(page.getByText('-180 to 180')).toBeVisible();
  });

  test('should have proper form structure', async ({ page }) => {
    // Verify all major form elements are present
    await expect(page.getByRole('combobox', { name: /Search for a city/ })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Latitude' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Longitude' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Fahrenheit/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Celsius/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  });
});
