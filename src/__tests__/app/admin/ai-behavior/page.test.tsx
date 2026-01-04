/**
 * Unit Tests for AI Behavior Settings Page
 *
 * TDD: Testing that the Save button properly enables/disables based on form changes
 */

import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIBehaviorSettingsPage from '@/app/admin/ai-behavior/page';

// Mock the fetch API
global.fetch = jest.fn();

// Mock next-auth
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: '1', email: 'test@example.com' } })),
}));

describe('AI Behavior Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock: Return default settings (no saved settings in DB)
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'anthropic/claude-3-haiku',
        temperature: 0.7,
        maxTokens: 150,
        topP: 1,
        presencePenalty: 0,
        verbosity: 'medium',
        tone: 'casual',
        userNames: [],
        humorLevel: 'subtle',
        customInstructions: '',
        morningTone: 'energizing',
        eveningTone: 'calming',
        stressAwareEnabled: true,
        celebrationModeEnabled: true,
        stopSequences: [],
      }),
    });
  });

  describe('Save button state management', () => {
    test('Save button should be disabled initially (no changes)', async () => {
      render(<AIBehaviorSettingsPage />);

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Settings/i });

      // Button should be disabled when no changes made
      expect(saveButton).toBeDisabled();
    });

    test('Save button should enable when temperature changes', async () => {
      const user = userEvent.setup();
      render(<AIBehaviorSettingsPage />);

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Settings/i });
      expect(saveButton).toBeDisabled();

      // Change temperature slider using fireEvent (simpler for range inputs)
      const temperatureSlider = screen.getByRole('slider', { name: /Temperature/i }) as HTMLInputElement;
      fireEvent.change(temperatureSlider, { target: { value: '0.8' } });

      // Save button should now be enabled
      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });
    });

    test('Save button should enable when verbosity radio changes', async () => {
      const user = userEvent.setup();
      render(<AIBehaviorSettingsPage />);

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Settings/i });
      expect(saveButton).toBeDisabled();

      // Change verbosity from medium to low
      const lowVerbosityRadio = screen.getByRole('radio', { name: /Low - Essential facts only/i });
      await user.click(lowVerbosityRadio);

      // Save button should now be enabled
      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });
    });

    test('Save button should enable when checkbox changes', async () => {
      const user = userEvent.setup();
      render(<AIBehaviorSettingsPage />);

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Settings/i });
      expect(saveButton).toBeDisabled();

      // Find and toggle Stress-Aware Mode checkbox (it's checked by default)
      const stressAwareCheckbox = screen.getByLabelText(/Stress-Aware Mode/i);
      expect(stressAwareCheckbox).toBeChecked();

      await user.click(stressAwareCheckbox);

      // Checkbox should now be unchecked
      expect(stressAwareCheckbox).not.toBeChecked();

      // Save button should now be enabled
      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      }, { timeout: 3000 });
    });

    test('Save button should disable after clicking Reset', async () => {
      const user = userEvent.setup();
      render(<AIBehaviorSettingsPage />);

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Settings/i });
      const resetButton = screen.getByRole('button', { name: /Reset Changes/i });

      // Make a change using fireEvent (simpler for range inputs)
      const temperatureSlider = screen.getByRole('slider', { name: /Temperature/i }) as HTMLInputElement;
      fireEvent.change(temperatureSlider, { target: { value: '0.9' } });

      // Save button should be enabled
      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });

      // Click Reset
      await user.click(resetButton);

      // Save button should be disabled again
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });
  });
});
