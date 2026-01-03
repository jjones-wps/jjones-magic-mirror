import { test, expect } from '@playwright/test';

/**
 * E2E Tests for AI Behavior Settings Page
 *
 * Tests comprehensive form interactions including:
 * - Settings persistence after save and reload
 * - Form validation
 * - Boolean field persistence (stressAwareEnabled, celebrationModeEnabled)
 * - Slider interactions (temperature, maxTokens, etc.)
 * - Radio button selections (verbosity, tone, humorLevel)
 */

test.describe('AI Behavior Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/ai-behavior');
    await expect(page.getByRole('heading', { name: 'AI Behavior Settings' })).toBeVisible();

    // Wait for loading state to complete (page shows "Loading settings..." while fetching)
    await page.waitForSelector('text=Loading settings...', { state: 'hidden', timeout: 10000 }).catch(() => {
      // If loading message doesn't appear, it loaded instantly - that's fine
    });

    // Wait for Save button to appear (indicates form is ready)
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeVisible({ timeout: 10000 });
  });

  test('should persist settings after save and page reload', async ({ page }) => {
    // Modify temperature slider
    const temperatureSlider = page.locator('input[type="range"][min="0"][max="2"]').first();
    await temperatureSlider.fill('0.7');

    // Verify temperature display updates
    await expect(page.locator('text=/Temperature:\\s*0\\.7/')).toBeVisible({ timeout: 2000 });

    // Select "Low" verbosity
    await page.getByRole('radio', { name: /Low - Essential facts only/ }).check();
    await expect(page.getByRole('radio', { name: /Low - Essential facts only/ })).toBeChecked();

    // Uncheck "Stress-Aware Mode" (click the visible toggle switch instead of hidden checkbox)
    const stressAwareCheckbox = page.locator('input[type="checkbox"][aria-label="Stress-Aware Mode"]');
    const stressAwareLabel = stressAwareCheckbox.locator('..');  // Get parent label element

    if (await stressAwareCheckbox.isChecked()) {
      await stressAwareLabel.scrollIntoViewIfNeeded();
      await stressAwareLabel.click(); // Click the visible label, not the hidden checkbox
    }
    await expect(stressAwareCheckbox).not.toBeChecked();

    // Verify Save button becomes enabled
    const saveButton = page.getByRole('button', { name: 'Save Settings' });
    await expect(saveButton).toBeEnabled();

    // Click Save
    await saveButton.click();

    // Wait for success toast (the button should become disabled after save)
    await expect(saveButton).toBeDisabled({ timeout: 5000 });

    // Reload page
    await page.reload();
    await expect(page.getByRole('heading', { name: 'AI Behavior Settings' })).toBeVisible();

    // Verify temperature persisted
    const reloadedTemperature = page.locator('input[type="range"][max="2"]');
    await expect(reloadedTemperature).toHaveValue('0.7');

    // Verify verbosity persisted
    await expect(page.getByRole('radio', { name: /Low - Essential facts only/ })).toBeChecked();

    // Verify stress-aware mode persisted as unchecked
    const reloadedStressAware = page.locator('input[type="checkbox"][aria-label="Stress-Aware Mode"]');
    await expect(reloadedStressAware).not.toBeChecked();
  });

  test('should reset changes when clicking Reset button', async ({ page }) => {
    // Store original values
    const temperatureSlider = page.locator('input[type="range"][min="0"][max="2"]').first();
    const originalTemperature = await temperatureSlider.inputValue();

    // Make changes
    await temperatureSlider.fill('1.5');
    await page.getByRole('radio', { name: /High - Detailed, descriptive/ }).check();

    // Verify Save and Reset buttons are enabled
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Reset Changes' })).toBeEnabled();

    // Click Reset
    await page.getByRole('button', { name: 'Reset Changes' }).click();

    // Verify values reverted
    await expect(temperatureSlider).toHaveValue(originalTemperature);

    // Verify buttons are disabled again
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reset Changes' })).toBeDisabled();
  });

  test('should validate temperature range (0-2)', async ({ page }) => {
    // Use more specific selector to avoid "Presence Penalty" slider (also has max="2")
    const temperatureSlider = page.locator('input[type="range"][min="0"][max="2"]').first();

    // Set to minimum
    await temperatureSlider.fill('0');
    await expect(temperatureSlider).toHaveValue('0');

    // Set to maximum
    await temperatureSlider.fill('2');
    await expect(temperatureSlider).toHaveValue('2');

    // HTML5 range input automatically constrains values
    // Verify slider is constrained to 0-2 range
    await expect(temperatureSlider).toHaveAttribute('min', '0');
    await expect(temperatureSlider).toHaveAttribute('max', '2');
  });

  test('should validate max tokens range (50-300)', async ({ page }) => {
    const maxTokensSlider = page.locator('input[type="range"][max="300"]');

    // Set to minimum
    await maxTokensSlider.fill('50');
    await expect(maxTokensSlider).toHaveValue('50');

    // Set to maximum
    await maxTokensSlider.fill('300');
    await expect(maxTokensSlider).toHaveValue('300');

    // Verify slider is constrained to 50-300 range
    await expect(maxTokensSlider).toHaveAttribute('min', '50');
    await expect(maxTokensSlider).toHaveAttribute('max', '300');
  });

  test('should toggle celebration mode checkbox', async ({ page }) => {
    const celebrationCheckbox = page.locator('input[type="checkbox"][aria-label="Celebration Mode"]');
    const celebrationLabel = celebrationCheckbox.locator('..');  // Get parent label element

    // Scroll into view and get initial state
    await celebrationLabel.scrollIntoViewIfNeeded();
    const initialState = await celebrationCheckbox.isChecked();

    // Toggle checkbox by clicking the visible label
    await celebrationLabel.click();

    // Verify state changed
    const newState = await celebrationCheckbox.isChecked();
    expect(newState).toBe(!initialState);

    // Verify Save button is enabled
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeEnabled();
  });

  test('should update user names field', async ({ page }) => {
    const userNamesField = page.getByRole('textbox', { name: /User Names/ });

    // Clear and enter new names (use pressSequentially to trigger React onChange properly)
    await userNamesField.click();
    await userNamesField.clear();
    await userNamesField.pressSequentially('Alice, Bob, Charlie', { delay: 50 });
    await userNamesField.blur(); // Trigger change detection

    // Verify Save button is enabled
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeEnabled();

    // Save changes
    await page.getByRole('button', { name: 'Save Settings' }).click();
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeDisabled({ timeout: 5000 });

    // Reload and verify
    await page.reload();
    await expect(page.getByRole('heading', { name: 'AI Behavior Settings' })).toBeVisible();
    await expect(userNamesField).toHaveValue('Alice, Bob, Charlie');
  });

  test('should persist all boolean fields correctly', async ({ page }) => {
    // This test specifically validates the boolean persistence issue
    // that was fixed in the integration tests

    const stressAware = page.locator('input[type="checkbox"][aria-label="Stress-Aware Mode"]');
    const celebration = page.locator('input[type="checkbox"][aria-label="Celebration Mode"]');
    const stressAwareLabel = stressAware.locator('..');
    const celebrationLabel = celebration.locator('..');

    // Scroll labels into view
    await stressAwareLabel.scrollIntoViewIfNeeded();
    await celebrationLabel.scrollIntoViewIfNeeded();

    // Set stress-aware to false, celebration to true (click visible labels)
    if (await stressAware.isChecked()) {
      await stressAwareLabel.click();
    }
    if (!(await celebration.isChecked())) {
      await celebrationLabel.click();
    }

    // Save
    await page.getByRole('button', { name: 'Save Settings' }).click();
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeDisabled({ timeout: 5000 });

    // Reload
    await page.reload();
    await expect(page.getByRole('heading', { name: 'AI Behavior Settings' })).toBeVisible();

    // Wait for form to load after reload
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeVisible({ timeout: 10000 });

    // Verify both persisted correctly
    const reloadedStressAware = page.locator('input[type="checkbox"][aria-label="Stress-Aware Mode"]');
    const reloadedCelebration = page.locator('input[type="checkbox"][aria-label="Celebration Mode"]');

    await expect(reloadedStressAware).not.toBeChecked();
    await expect(reloadedCelebration).toBeChecked();
  });

  test('should change AI model selection', async ({ page }) => {
    const modelSelect = page.getByRole('combobox', { name: /AI Model/ });

    // Get current value
    const currentValue = await modelSelect.inputValue();

    // Select a different model (select by text content, not regex)
    const targetModel = currentValue.includes('claude') ? 'openai/gpt-4o-mini' : 'anthropic/claude-3-haiku';
    await modelSelect.selectOption(targetModel);

    // Verify selection changed
    await expect(modelSelect).toHaveValue(targetModel);

    // Verify Save button is enabled
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeEnabled();

    // Save and reload
    await page.getByRole('button', { name: 'Save Settings' }).click();
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeDisabled({ timeout: 5000 });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'AI Behavior Settings' })).toBeVisible();

    // Verify model persisted
    await expect(modelSelect).toHaveValue(targetModel);
  });
});
