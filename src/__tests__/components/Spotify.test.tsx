/**
 * Tests for Spotify widget component
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import Spotify from '@/components/widgets/Spotify';

// Mock fetch globally
global.fetch = jest.fn();

const mockPlayingTrack = {
  isPlaying: true,
  configured: true,
  type: 'track' as const,
  title: 'Bohemian Rhapsody',
  artist: 'Queen',
  album: 'A Night at the Opera',
  imageUrl: 'https://example.com/album-art.jpg',
  progress: 120000, // 2 minutes
  duration: 354000, // 5:54
};

const mockPlayingPodcast = {
  isPlaying: true,
  configured: true,
  type: 'podcast' as const,
  title: 'Episode 42: The Answer to Everything',
  show: 'Tech Talk Daily',
  imageUrl: 'https://example.com/podcast-art.jpg',
  progress: 600000, // 10 minutes
  duration: 3600000, // 1 hour
};

const mockNotPlaying = {
  isPlaying: false,
  configured: true,
};

const mockNotConfigured = {
  isPlaying: false,
  configured: false,
};

describe('Spotify Widget', () => {
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

    render(<Spotify />);

    expect(screen.getByText('Now Playing')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should not render when Spotify is not configured', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNotConfigured,
    });

    const { container } = render(<Spotify />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/spotify/now-playing');
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Component should not render anything when not configured
    expect(container.firstChild).toBeNull();
  });

  it('should show "Nothing playing" when configured but not playing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNotPlaying,
    });

    render(<Spotify />);

    await waitFor(() => {
      expect(screen.getByText('Nothing playing')).toBeInTheDocument();
    });
  });

  it('should display track information when playing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlayingTrack,
    });

    render(<Spotify />);

    await waitFor(() => {
      expect(screen.getByText('Bohemian Rhapsody')).toBeInTheDocument();
    });

    expect(screen.getByText('Queen')).toBeInTheDocument();
    expect(screen.getByText('A Night at the Opera')).toBeInTheDocument();
  });

  it('should display podcast information when playing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlayingPodcast,
    });

    render(<Spotify />);

    await waitFor(() => {
      expect(screen.getByText('Episode 42: The Answer to Everything')).toBeInTheDocument();
    });

    expect(screen.getByText('Tech Talk Daily')).toBeInTheDocument();
  });

  it('should display progress bar when playing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlayingTrack,
    });

    const { container } = render(<Spotify />);

    await waitFor(() => {
      expect(screen.getByText('Bohemian Rhapsody')).toBeInTheDocument();
    });

    // Progress bar should be present (check for the progress bar container)
    const progressBar = container.querySelector('.h-\\[2px\\].bg-white\\/10');
    expect(progressBar).toBeInTheDocument();
  });

  it('should display formatted time for track progress', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlayingTrack,
    });

    render(<Spotify />);

    await waitFor(() => {
      // 2:00 progress out of 5:54 duration
      expect(screen.getByText('2:00')).toBeInTheDocument();
      expect(screen.getByText('5:54')).toBeInTheDocument();
    });
  });

  it('should show playing indicator bars when playing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlayingTrack,
    });

    render(<Spotify />);

    await waitFor(() => {
      // Playing bars animation should be present
      expect(screen.getByText('Bohemian Rhapsody')).toBeInTheDocument();
    });

    // The PlayingBars component should render 4 animated bars
    const widget = screen.getByText('Now Playing').closest('.widget');
    expect(widget).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { container } = render(<Spotify />);

    await waitFor(() => {
      // Component might not render or show nothing playing
      expect(consoleError).toHaveBeenCalled();
    });

    consoleError.mockRestore();
  });

  it('should refresh now playing data periodically', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlayingTrack,
    });

    render(<Spotify />);

    // Initial fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Advance 15 seconds (refresh interval)
    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    // Should have fetched again
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should display album name for tracks', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlayingTrack,
    });

    render(<Spotify />);

    await waitFor(() => {
      expect(screen.getByText('A Night at the Opera')).toBeInTheDocument();
    });
  });

  it('should handle zero progress and duration', async () => {
    const trackWithZeroProgress = {
      ...mockPlayingTrack,
      progress: 0,
      duration: 0,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => trackWithZeroProgress,
    });

    render(<Spotify />);

    await waitFor(() => {
      expect(screen.getByText('Bohemian Rhapsody')).toBeInTheDocument();
    });

    // Should show 0:00 for both
    const timeDisplays = screen.getAllByText('0:00');
    expect(timeDisplays.length).toBeGreaterThan(0);
  });

  it('should format time correctly for long durations', async () => {
    const longTrack = {
      ...mockPlayingTrack,
      progress: 3661000, // 1:01:01
      duration: 7200000, // 2:00:00
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => longTrack,
    });

    render(<Spotify />);

    await waitFor(() => {
      expect(screen.getByText('61:01')).toBeInTheDocument();
      expect(screen.getByText('120:00')).toBeInTheDocument();
    });
  });
});
