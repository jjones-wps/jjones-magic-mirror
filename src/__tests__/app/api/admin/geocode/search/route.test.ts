/**
 * Unit Tests for Geocode Search API Route
 *
 * Tests GET endpoint for TomTom location search with typeahead
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

import { GET } from '@/app/api/admin/geocode/search/route';
import { auth } from '@/lib/auth/server';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Save original fetch
const originalFetch = global.fetch;

describe('GET /api/admin/geocode/search', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/geocode/search?q=test');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('returns 400 when query parameter is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/geocode/search');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Query parameter "q" is required' });
  });

  test('returns 400 when query is too short', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/geocode/search?q=a');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Query must be at least 2 characters' });
  });

  test('returns 400 when query is too long', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const longQuery = 'a'.repeat(101);
    const request = new (global.NextRequest as any)(
      `http://localhost:3000/api/admin/geocode/search?q=${longQuery}`
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Query must not exceed 100 characters' });
  });

  test('returns empty results when API key is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    // Temporarily remove API key
    const originalKey = process.env.TOMTOM_API_KEY;
    delete process.env.TOMTOM_API_KEY;

    const request = new (global.NextRequest as any)(
      'http://localhost:3000/api/admin/geocode/search?q=Fort Wayne'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ results: [] });
    expect(mockFetch).not.toHaveBeenCalled();

    // Restore API key
    if (originalKey) {
      process.env.TOMTOM_API_KEY = originalKey;
    }
  });

  test('successfully fetches and transforms results', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    process.env.TOMTOM_API_KEY = 'test-api-key';

    const mockTomTomResponse = {
      results: [
        {
          address: {
            freeformAddress: 'Fort Wayne, IN, USA',
          },
          position: {
            lat: 41.0793,
            lon: -85.1394,
          },
        },
        {
          address: {
            freeformAddress: 'Fort Wayne International Airport, Fort Wayne, IN',
          },
          position: {
            lat: 40.9785,
            lon: -85.1951,
          },
        },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockTomTomResponse,
    } as any);

    const request = new (global.NextRequest as any)(
      'http://localhost:3000/api/admin/geocode/search?q=Fort Wayne'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      results: [
        {
          address: 'Fort Wayne, IN, USA',
          lat: 41.0793,
          lon: -85.1394,
        },
        {
          address: 'Fort Wayne International Airport, Fort Wayne, IN',
          lat: 40.9785,
          lon: -85.1951,
        },
      ],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.tomtom.com/search/2/search/Fort%20Wayne.json'),
      expect.objectContaining({
        next: { revalidate: 86400 },
      })
    );
  });

  test('returns empty results when TomTom API fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    process.env.TOMTOM_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as any);

    const request = new (global.NextRequest as any)(
      'http://localhost:3000/api/admin/geocode/search?q=Fort Wayne'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ results: [] });
  });

  test('returns empty results when error occurs', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    process.env.TOMTOM_API_KEY = 'test-api-key';

    mockFetch.mockRejectedValue(new Error('Network error'));

    const request = new (global.NextRequest as any)(
      'http://localhost:3000/api/admin/geocode/search?q=Fort Wayne'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ results: [] });
  });
});
