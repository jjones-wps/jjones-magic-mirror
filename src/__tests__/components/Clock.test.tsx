/**
 * Tests for Clock widget component
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import Clock from '@/components/widgets/Clock';
import { mockFeastDay } from '../helpers/mockData.helper';

// Mock fetch globally
global.fetch = jest.fn();

describe('Clock Widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T14:30:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render time after hydration', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFeastDay,
    });

    render(<Clock />);

    // Component starts with null time, then updates
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Should show time digits (2:30 PM)
    await waitFor(() => {
      const element = screen.getByText('2', { selector: 'span.text-mirror-5xl' });
      expect(element).toBeInTheDocument();
    });
  });

  it('should fetch feast day on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFeastDay,
    });

    render(<Clock />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/feast-day');
    });

    await waitFor(() => {
      expect(screen.getByText('The Epiphany of the Lord')).toBeInTheDocument();
    });
  });

  it('should display date information', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFeastDay,
    });

    render(<Clock />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      // Should show Monday, January 15
      expect(screen.getByText(/Monday/)).toBeInTheDocument();
      expect(screen.getByText(/January 15/)).toBeInTheDocument();
    });
  });

  it('should display greeting based on time of day', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFeastDay,
    });

    render(<Clock />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // 14:30 = 2:30 PM = afternoon
    await waitFor(() => {
      expect(screen.getByText(/Good afternoon/)).toBeInTheDocument();
    });
  });

  it('should update time every second', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFeastDay,
    });

    render(<Clock />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Initial time (2:30) - digits are displayed separately
    await waitFor(() => {
      expect(screen.getByText('3', { selector: 'span.text-mirror-5xl' })).toBeInTheDocument();
      expect(screen.getByText('0', { selector: 'span.text-mirror-5xl' })).toBeInTheDocument();
    });

    // Advance 1 minute (to 2:31)
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });

    // Should now show 2:31 (1 and 1 for minutes)
    await waitFor(() => {
      expect(screen.getByText('3', { selector: 'span.text-mirror-5xl' })).toBeInTheDocument();
      expect(screen.getByText('1', { selector: 'span.text-mirror-5xl' })).toBeInTheDocument();
    });
  });

  it('should handle feast day API errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Clock />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Should still render time even if feast day fails
    await waitFor(() => {
      expect(screen.getByText('2', { selector: 'span.text-mirror-5xl' })).toBeInTheDocument();
    });

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
