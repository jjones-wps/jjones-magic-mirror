/**
 * Unit Tests for AI Behavior Settings Page
 *
 * TDD: Testing that the Save button properly enables/disables based on form changes
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIBehaviorSettingsPage from '@/app/admin/ai-behavior/page';
import type { AIBehaviorSettings } from '@/lib/ai-behavior';

// Mock the fetch API
global.fetch = jest.fn();

// Mock next-auth
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: '1', email: 'test@example.com' } })),
}));

// Test constants
const BUTTON_NAMES = {
  SAVE: /Save Settings/i,
  RESET: /Reset Changes/i,
} as const;

const SLIDER_NAMES = {
  TEMPERATURE: /Temperature/i,
} as const;

// Default AI behavior settings for testing
const DEFAULT_TEST_SETTINGS: AIBehaviorSettings = {
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
};

// Test helpers
async function setupPage() {
  render(<AIBehaviorSettingsPage />);

  // Wait for page to load
  await waitFor(() => {
    expect(screen.getByRole('button', { name: BUTTON_NAMES.SAVE })).toBeInTheDocument();
  });

  return {
    saveButton: screen.getByRole('button', { name: BUTTON_NAMES.SAVE }),
    resetButton: screen.getByRole('button', { name: BUTTON_NAMES.RESET }),
    user: userEvent.setup(),
  };
}

describe('AI Behavior Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock API response with default settings
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => DEFAULT_TEST_SETTINGS,
    });
  });

  describe('Save button state management', () => {
    test('disables Save button when no changes are made', async () => {
      const { saveButton } = await setupPage();

      expect(saveButton).toBeDisabled();
    });

    test('enables Save button when temperature slider changes', async () => {
      const { saveButton } = await setupPage();
      expect(saveButton).toBeDisabled();

      const temperatureSlider = screen.getByRole('slider', { name: SLIDER_NAMES.TEMPERATURE });
      fireEvent.change(temperatureSlider, { target: { value: '0.8' } });

      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });
    });

    test('enables Save button when verbosity radio button changes', async () => {
      const { saveButton, user } = await setupPage();
      expect(saveButton).toBeDisabled();

      const lowVerbosityRadio = screen.getByRole('radio', { name: /Low - Essential facts only/i });
      await user.click(lowVerbosityRadio);

      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });
    });

    test('enables Save button when checkbox toggles', async () => {
      const { saveButton, user } = await setupPage();
      expect(saveButton).toBeDisabled();

      const stressAwareCheckbox = screen.getByLabelText(/Stress-Aware Mode/i);
      expect(stressAwareCheckbox).toBeChecked();

      await user.click(stressAwareCheckbox);

      expect(stressAwareCheckbox).not.toBeChecked();
      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });
    });

    test('disables Save button after clicking Reset', async () => {
      const { saveButton, resetButton, user } = await setupPage();

      const temperatureSlider = screen.getByRole('slider', { name: SLIDER_NAMES.TEMPERATURE });
      fireEvent.change(temperatureSlider, { target: { value: '0.9' } });

      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });

      await user.click(resetButton);

      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });
  });
});
