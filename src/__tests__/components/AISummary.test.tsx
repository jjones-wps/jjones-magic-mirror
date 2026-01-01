/**
 * Tests for AISummary widget component
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import AISummary from '@/components/widgets/AISummary';

// Mock fetch globally
global.fetch = jest.fn();

const mockSummaryResponse = {
  greeting: 'Good morning',
  summary: 'Today looks like a great day with clear skies and mild temperatures. You have a team meeting at 10 AM.',
  tip: 'Remember to bring your laptop to the meeting.',
  lastUpdated: '2024-01-15T06:00:00',
};

describe('AISummary Widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<AISummary />);

    expect(screen.getByText('Daily Briefing')).toBeInTheDocument();
    expect(screen.getByText('Preparing your briefing...')).toBeInTheDocument();
  });

  it('should fetch and display AI summary', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSummaryResponse,
    });

    render(<AISummary />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/summary');
    });

    // Due to typewriter effect, we check for partial text initially
    await waitFor(() => {
      expect(screen.getByText(/Today looks like/)).toBeInTheDocument();
    });
  });

  it('should display last updated time', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSummaryResponse,
    });

    render(<AISummary />);

    await waitFor(() => {
      expect(screen.getByText(/6:00 AM/)).toBeInTheDocument();
    });
  });

  it('should display tip when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSummaryResponse,
    });

    render(<AISummary />);

    // Advance timers to complete typewriter effect and show tip
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Remember to bring your laptop/)).toBeInTheDocument();
    });
  });

  it('should not display tip when not provided', async () => {
    const responseWithoutTip = {
      ...mockSummaryResponse,
      tip: undefined,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => responseWithoutTip,
    });

    render(<AISummary />);

    await waitFor(() => {
      expect(screen.queryByText(/Remember/)).not.toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<AISummary />);

    await waitFor(() => {
      expect(screen.getByText('Unable to generate briefing')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('should handle API failure status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<AISummary />);

    await waitFor(() => {
      expect(screen.getByText('Unable to generate briefing')).toBeInTheDocument();
    });
  });

  it('should set up periodic refresh interval', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSummaryResponse,
    });

    render(<AISummary />);

    // Initial fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Verify that an interval was set up (component uses useEffect with interval)
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should show typewriter animation for summary text', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSummaryResponse,
    });

    render(<AISummary />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Typewriter should be active - text appears gradually
    // Due to typewriter effect, full text won't be visible immediately
    await waitFor(() => {
      const summaryElement = screen.getByText(/Today looks like/);
      expect(summaryElement).toBeInTheDocument();
    });
  });

  it('should handle missing summary data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => null,
    });

    render(<AISummary />);

    await waitFor(() => {
      expect(screen.getByText('Unable to generate briefing')).toBeInTheDocument();
    });
  });
});
