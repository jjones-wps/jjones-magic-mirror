/**
 * Tests for News widget component
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import News from '@/components/widgets/News';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the news library
jest.mock('@/lib/news', () => ({
  getDemoNewsData: jest.fn(() => ({
    articles: [
      {
        id: 'demo-1',
        title: 'Demo Headline One',
        source: 'Demo Source',
        link: 'https://example.com/1',
        pubDate: new Date('2024-01-15T10:00:00'),
        description: 'Demo description one',
      },
      {
        id: 'demo-2',
        title: 'Demo Headline Two',
        source: 'Demo Source',
        link: 'https://example.com/2',
        pubDate: new Date('2024-01-15T11:00:00'),
        description: 'Demo description two',
      },
    ],
    lastUpdated: new Date('2024-01-15T12:00:00'),
  })),
  formatTimeAgo: jest.fn((date: Date) => {
    const now = new Date('2024-01-15T14:00:00');
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1h ago';
    return `${diffHours}h ago`;
  }),
}));

const mockAPIResponse = {
  articles: [
    {
      id: '1',
      title: 'Breaking: Major Tech Announcement',
      source: 'Tech News',
      link: 'https://example.com/tech',
      pubDate: '2024-01-15T13:00:00',
      description: 'Major tech company announces new product',
    },
    {
      id: '2',
      title: 'Weather Alert Issued',
      source: 'Weather Channel',
      link: 'https://example.com/weather',
      pubDate: '2024-01-15T12:30:00',
      description: 'Severe weather expected in the region',
    },
    {
      id: '3',
      title: 'Sports: Team Wins Championship',
      source: 'ESPN',
      link: 'https://example.com/sports',
      pubDate: '2024-01-15T11:00:00',
      description: 'Local team claims victory',
    },
  ],
  lastUpdated: '2024-01-15T13:30:00',
};

describe('News Widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T14:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<News />);

    expect(screen.getByText('Headlines')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should fetch and display news articles from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAPIResponse,
    });

    render(<News />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/news');
    });

    await waitFor(() => {
      expect(screen.getByText('Breaking: Major Tech Announcement')).toBeInTheDocument();
    });

    expect(screen.getByText('Weather Alert Issued')).toBeInTheDocument();
    expect(screen.getByText('Sports: Team Wins Championship')).toBeInTheDocument();
  });

  it('should display article sources and timestamps', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAPIResponse,
    });

    render(<News />);

    await waitFor(() => {
      expect(screen.getByText('Tech News')).toBeInTheDocument();
    });

    expect(screen.getByText('Weather Channel')).toBeInTheDocument();
    expect(screen.getByText('ESPN')).toBeInTheDocument();
  });

  it('should display last updated time', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAPIResponse,
    });

    render(<News />);

    await waitFor(() => {
      expect(screen.getByText(/1:30 PM/)).toBeInTheDocument();
    });
  });

  it('should fall back to demo data when API fails', async () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<News />);

    await waitFor(() => {
      expect(screen.getByText('Demo Headline One')).toBeInTheDocument();
    });

    expect(screen.getByText('Demo Headline Two')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();

    consoleWarn.mockRestore();
  });

  it('should use demo data on network error', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<News />);

    await waitFor(() => {
      expect(screen.getByText('Demo Headline One')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('should show empty state when no articles', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        articles: [],
        lastUpdated: '2024-01-15T13:30:00',
      }),
    });

    render(<News />);

    await waitFor(() => {
      expect(screen.getByText('No headlines available')).toBeInTheDocument();
    });
  });

  it('should limit display to 5 articles', async () => {
    const manyArticles = {
      articles: Array.from({ length: 10 }, (_, i) => ({
        id: `article-${i}`,
        title: `Article ${i + 1}`,
        source: 'Test Source',
        link: `https://example.com/${i}`,
        pubDate: '2024-01-15T12:00:00',
      })),
      lastUpdated: '2024-01-15T13:30:00',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => manyArticles,
    });

    render(<News />);

    await waitFor(() => {
      expect(screen.getByText('Article 1')).toBeInTheDocument();
    });

    // Should show first 5 articles
    expect(screen.getByText('Article 5')).toBeInTheDocument();
    // Should not show 6th article
    expect(screen.queryByText('Article 6')).not.toBeInTheDocument();
  });

  it('should refresh news periodically', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAPIResponse,
    });

    render(<News />);

    // Initial fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Advance 10 minutes (refresh interval)
    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });

    // Should have fetched again
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should display sources in footer', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAPIResponse,
    });

    render(<News />);

    await waitFor(() => {
      expect(screen.getByText(/Sources:/)).toBeInTheDocument();
    });

    // Should show combined sources text in footer
    expect(screen.getByText('Sources: Tech News, Weather Channel, ESPN')).toBeInTheDocument();
  });
});
