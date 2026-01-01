/**
 * Tests for Spotify Now Playing API route
 * @jest-environment node
 */

import { GET } from '@/app/api/spotify/now-playing/route';

// Mock fetch globally
global.fetch = jest.fn();

const mockSpotifyTrackResponse = {
  is_playing: true,
  currently_playing_type: 'track',
  progress_ms: 45000,
  item: {
    name: 'Bohemian Rhapsody',
    duration_ms: 354000,
    artists: [{ name: 'Queen' }],
    album: {
      name: 'A Night at the Opera',
      images: [{ url: 'https://i.scdn.co/image/album.jpg' }],
    },
  },
};

const mockSpotifyPodcastResponse = {
  is_playing: true,
  currently_playing_type: 'episode',
  progress_ms: 120000,
  item: {
    name: 'Episode 42: The Answer',
    duration_ms: 3600000,
    show: {
      name: 'Tech Podcast',
      images: [{ url: 'https://i.scdn.co/image/show.jpg' }],
    },
    images: [{ url: 'https://i.scdn.co/image/episode.jpg' }],
  },
};

const mockTokenResponse = {
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

describe('GET /api/spotify/now-playing', () => {
  const originalEnv = {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REFRESH_TOKEN: process.env.SPOTIFY_REFRESH_TOKEN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment variables
    Object.keys(originalEnv).forEach((key) => {
      const value = originalEnv[key as keyof typeof originalEnv];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('should return not configured when credentials are missing', async () => {
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
    delete process.env.SPOTIFY_REFRESH_TOKEN;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      isPlaying: false,
      configured: false,
      message: 'Spotify not configured',
    });
  });

  it('should fetch and return currently playing track', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSpotifyTrackResponse,
      });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      isPlaying: true,
      configured: true,
      type: 'track',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      imageUrl: 'https://i.scdn.co/image/album.jpg',
      progress: 45000,
      duration: 354000,
    });
  });

  it('should fetch and return currently playing podcast episode', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSpotifyPodcastResponse,
      });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      isPlaying: true,
      configured: true,
      type: 'podcast',
      title: 'Episode 42: The Answer',
      show: 'Tech Podcast',
      imageUrl: 'https://i.scdn.co/image/episode.jpg',
      progress: 120000,
      duration: 3600000,
    });
  });

  it('should return not playing when Spotify returns 204', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        status: 204,
      });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      isPlaying: false,
      configured: true,
    });
  });

  it('should use Basic auth for token refresh', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        status: 204,
      });

    await GET();

    const tokenCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(tokenCall[0]).toContain('accounts.spotify.com/api/token');
    expect(tokenCall[1].headers.Authorization).toMatch(/^Basic /);
  });

  it('should handle token refresh failure', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({
      isPlaying: false,
      configured: false,
      message: 'Spotify not configured',
    });

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('should handle now playing API errors', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({
      isPlaying: false,
      configured: true,
      error: 'Failed to fetch',
    });
  });

  it('should handle network errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({
      isPlaying: false,
      configured: true,
      error: 'Request failed',
    });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should join multiple artists with comma', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    const multiArtistResponse = {
      ...mockSpotifyTrackResponse,
      item: {
        ...mockSpotifyTrackResponse.item,
        artists: [{ name: 'Artist One' }, { name: 'Artist Two' }, { name: 'Artist Three' }],
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => multiArtistResponse,
      });

    const response = await GET();
    const data = await response.json();

    expect(data.artist).toBe('Artist One, Artist Two, Artist Three');
  });

  it('should handle missing track metadata gracefully', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    const minimalResponse = {
      is_playing: true,
      currently_playing_type: 'track',
      item: {}, // Empty metadata
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => minimalResponse,
      });

    const response = await GET();
    const data = await response.json();

    expect(data.title).toBe('Unknown Track');
    expect(data.artist).toBe('Unknown Artist');
    expect(data.album).toBe('Unknown Album');
  });

  it('should handle missing podcast metadata gracefully', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    const minimalPodcastResponse = {
      is_playing: true,
      currently_playing_type: 'episode',
      item: {}, // Empty metadata
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => minimalPodcastResponse,
      });

    const response = await GET();
    const data = await response.json();

    expect(data.title).toBe('Unknown Episode');
    expect(data.show).toBe('Unknown Show');
  });

  it('should use Bearer token for now playing request', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        status: 204,
      });

    await GET();

    const nowPlayingCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(nowPlayingCall[0]).toContain('api.spotify.com/v1/me/player/currently-playing');
    expect(nowPlayingCall[1].headers.Authorization).toBe('Bearer mock-access-token');
  });

  it('should prefer episode image over show image for podcasts', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    const podcastWithBothImages = {
      ...mockSpotifyPodcastResponse,
      item: {
        ...mockSpotifyPodcastResponse.item,
        images: [{ url: 'https://i.scdn.co/image/episode.jpg' }],
        show: {
          name: 'Tech Podcast',
          images: [{ url: 'https://i.scdn.co/image/show.jpg' }],
        },
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => podcastWithBothImages,
      });

    const response = await GET();
    const data = await response.json();

    expect(data.imageUrl).toBe('https://i.scdn.co/image/episode.jpg');
  });

  it('should encode credentials with Base64 for token request', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        status: 204,
      });

    await GET();

    const tokenCall = (global.fetch as jest.Mock).mock.calls[0];
    const authHeader = tokenCall[1].headers.Authorization;

    // Verify it's Base64 encoded
    expect(authHeader).toMatch(/^Basic [A-Za-z0-9+/=]+$/);

    // Decode and verify content
    const base64Credentials = authHeader.replace('Basic ', '');
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    expect(credentials).toBe('test-client-id:test-client-secret');
  });

  it('should send correct Content-Type for token request', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        status: 204,
      });

    await GET();

    const tokenCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(tokenCall[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('should send refresh_token in body for token request', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'test-refresh-token';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        status: 204,
      });

    await GET();

    const tokenCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = tokenCall[1].body;

    expect(body.toString()).toContain('grant_type=refresh_token');
    expect(body.toString()).toContain('refresh_token=test-refresh-token');
  });
});
