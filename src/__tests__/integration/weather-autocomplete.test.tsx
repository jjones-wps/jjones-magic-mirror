/**
 * Integration Tests for Weather Settings Address Autocomplete
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeatherSettingsPage from '@/app/admin/weather/page';

// Mock API routes
global.fetch = jest.fn();

describe('Weather Settings - Address Autocomplete Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock initial weather settings fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        latitude: '41.0793',
        longitude: '-85.1394',
        location: 'Fort Wayne, IN',
        units: 'fahrenheit',
      }),
    });
  });

  describe('Autocomplete Flow', () => {
    it('should populate coordinates when selecting from autocomplete', async () => {
      const user = userEvent.setup();
      render(<WeatherSettingsPage />);

      // Wait for initial settings to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
      });

      // Mock geocode search API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              address: 'Indianapolis, IN 46204',
              lat: 39.7684,
              lon: -86.1581,
            },
          ],
        }),
      });

      // Type in autocomplete
      const locationInput = screen.getByPlaceholderText('Search for a city or address...');
      await user.clear(locationInput);
      await user.type(locationInput, 'indianapolis');

      // Wait for debounce and API call
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/admin/geocode/search?q=indianapolis'),
            expect.any(Object)
          );
        },
        { timeout: 500 }
      );

      // Wait for results to appear
      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Indianapolis, IN 46204');
      });

      // Select first result
      const listbox = screen.getByRole('listbox');
      const firstResult = within(listbox).getByText('Indianapolis, IN 46204');
      await user.click(firstResult);

      // Verify coordinates were updated
      await waitFor(() => {
        expect(screen.getByDisplayValue('Indianapolis, IN 46204')).toBeInTheDocument();
        expect(screen.getByDisplayValue('39.7684')).toBeInTheDocument();
        expect(screen.getByDisplayValue('-86.1581')).toBeInTheDocument();
      });
    });

    it('should mark coordinates as read-only', async () => {
      render(<WeatherSettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
      });

      const latInput = screen.getByDisplayValue('41.0793');
      const lonInput = screen.getByDisplayValue('-85.1394');

      expect(latInput).toHaveAttribute('readOnly');
      expect(lonInput).toHaveAttribute('readOnly');
    });
  });

  describe('Unsaved Changes Detection', () => {
    it('should detect changes when selecting new location', async () => {
      const user = userEvent.setup();
      render(<WeatherSettingsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
      });

      // Mock geocode search
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              address: 'Chicago, IL 60601',
              lat: 41.8781,
              lon: -87.6298,
            },
          ],
        }),
      });

      // Type in autocomplete
      const locationInput = screen.getByPlaceholderText('Search for a city or address...');
      await user.clear(locationInput);
      await user.type(locationInput, 'chicago');

      // Wait for results
      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Chicago, IL 60601');
      });

      // Select result
      const listbox = screen.getByRole('listbox');
      const firstResult = within(listbox).getByText('Chicago, IL 60601');
      await user.click(firstResult);

      // Verify Save button is enabled (unsaved changes)
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should enable Reset button when changes are made', async () => {
      const user = userEvent.setup();
      render(<WeatherSettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
      });

      // Mock geocode search
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              address: 'Detroit, MI 48201',
              lat: 42.3314,
              lon: -83.0458,
            },
          ],
        }),
      });

      // Select new location
      const locationInput = screen.getByPlaceholderText('Search for a city or address...');
      await user.clear(locationInput);
      await user.type(locationInput, 'detroit');

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Detroit, MI 48201');
      });

      const listbox = screen.getByRole('listbox');
      const firstResult = within(listbox).getByText('Detroit, MI 48201');
      await user.click(firstResult);

      // Verify Reset button is enabled
      await waitFor(() => {
        const resetButton = screen.getByRole('button', { name: /reset/i });
        expect(resetButton).not.toBeDisabled();
      });
    });
  });

  describe('Save and Reset Functionality', () => {
    it('should save new coordinates via API', async () => {
      const user = userEvent.setup();
      render(<WeatherSettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
      });

      // Mock geocode search
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              address: 'Columbus, OH 43215',
              lat: 39.9612,
              lon: -82.9988,
            },
          ],
        }),
      });

      // Select location
      const locationInput = screen.getByPlaceholderText('Search for a city or address...');
      await user.clear(locationInput);
      await user.type(locationInput, 'columbus');

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Columbus, OH 43215');
      });

      const listbox = screen.getByRole('listbox');
      const firstResult = within(listbox).getByText('Columbus, OH 43215');
      await user.click(firstResult);

      // Mock save API
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify API was called with new coordinates
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/weather',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              latitude: '39.9612',
              longitude: '-82.9988',
              location: 'Columbus, OH 43215',
              units: 'fahrenheit',
            }),
          })
        );
      });

      // Verify success toast message
      expect(screen.getByText('Weather settings updated successfully')).toBeInTheDocument();
    });

    it('should reset to original values', async () => {
      const user = userEvent.setup();
      render(<WeatherSettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
      });

      // Mock geocode search
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              address: 'Cleveland, OH 44114',
              lat: 41.4993,
              lon: -81.6944,
            },
          ],
        }),
      });

      // Select new location
      const locationInput = screen.getByPlaceholderText('Search for a city or address...');
      await user.clear(locationInput);
      await user.type(locationInput, 'cleveland');

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Cleveland, OH 44114');
      });

      const listbox = screen.getByRole('listbox');
      const firstResult = within(listbox).getByText('Cleveland, OH 44114');
      await user.click(firstResult);

      // Verify new values
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cleveland, OH 44114')).toBeInTheDocument();
      });

      // Click Reset
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Verify original values restored
      await waitFor(() => {
        expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
        expect(screen.getByDisplayValue('41.0793')).toBeInTheDocument();
        expect(screen.getByDisplayValue('-85.1394')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when geocode search fails', async () => {
      const user = userEvent.setup();
      render(<WeatherSettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
      });

      // Mock geocode API failure
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      // Type in autocomplete
      const locationInput = screen.getByPlaceholderText('Search for a city or address...');
      await user.type(locationInput, 'test');

      // Wait for error message (component shows "Search failed, please try again")
      await waitFor(
        () => {
          expect(screen.getByText('Search failed, please try again')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should show error when save fails', async () => {
      const user = userEvent.setup();
      render(<WeatherSettingsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
      });

      // Mock successful geocode search
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              address: 'Test City',
              lat: 40.0,
              lon: -80.0,
            },
          ],
        }),
      });

      // Select location
      const locationInput = screen.getByPlaceholderText('Search for a city or address...');
      await user.type(locationInput, 'test');

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Test City');
      });

      const listbox = screen.getByRole('listbox');
      const firstResult = within(listbox).getByText('Test City');
      await user.click(firstResult);

      // Mock save failure
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Database error' }),
      });

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText('Database error')).toBeInTheDocument();
      });
    });
  });
});
