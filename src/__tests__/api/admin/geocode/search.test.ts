/**
 * Tests for Geocode Search API route
 * @jest-environment @edge-runtime/jest-environment
 */

import { GET } from '@/app/api/admin/geocode/search/route';

// Mock dependencies
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(() => ({ user: { id: 'test-user', email: 'admin@mirror.local' } })),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('GET /api/admin/geocode/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TOMTOM_API_KEY = 'test-api-key';
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { auth } = require('@/lib/auth/server');
      auth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/admin/geocode/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should proceed when user is authenticated', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Query Validation', () => {
    it('should return 400 when query parameter is missing', async () => {
      const request = new Request('http://localhost/api/admin/geocode/search');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should return 400 when query is less than 2 characters', async () => {
      const request = new Request('http://localhost/api/admin/geocode/search?q=a');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('at least 2 characters');
    });

    it('should return 400 when query exceeds 100 characters', async () => {
      const longQuery = 'a'.repeat(101);
      const request = new Request(`http://localhost/api/admin/geocode/search?q=${longQuery}`);
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('must not exceed 100 characters');
    });

    it('should accept query with exactly 2 characters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=ab');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept query with exactly 100 characters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const maxQuery = 'a'.repeat(100);
      const request = new Request(`http://localhost/api/admin/geocode/search?q=${maxQuery}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should handle special characters in query', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=São Paulo, Brazil');
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Verify URL encoding
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(
        encodeURIComponent('São Paulo, Brazil')
      );
    });
  });

  describe('TomTom API Integration', () => {
    it('should return formatted results from TomTom API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              address: { freeformAddress: 'Fort Wayne, IN 46802' },
              position: { lat: 41.0793, lon: -85.1394 },
            },
            {
              address: { freeformAddress: 'Fort Wayne, IN 46803' },
              position: { lat: 41.0845, lon: -85.1402 },
            },
          ],
        }),
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=fort wayne');
      const response = await GET(request);
      const data = await response.json();

      expect(data.results).toHaveLength(2);
      expect(data.results[0]).toEqual({
        address: 'Fort Wayne, IN 46802',
        lat: 41.0793,
        lon: -85.1394,
      });
      expect(data.results[1]).toEqual({
        address: 'Fort Wayne, IN 46803',
        lat: 41.0845,
        lon: -85.1402,
      });
    });

    it('should call TomTom API with correct parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=indianapolis');
      await GET(request);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('https://api.tomtom.com/search/2/search/');
      expect(fetchUrl).toContain('indianapolis');
      expect(fetchUrl).toContain('typeahead=true');
      expect(fetchUrl).toContain('limit=5');
      expect(fetchUrl).toContain('language=en-US');
      expect(fetchUrl).toContain('key=test-api-key');
    });

    it('should return empty results when TomTom API fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Graceful degradation
      expect(data.results).toEqual([]);
    });

    it('should handle malformed TomTom API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: undefined }),
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
    });

    it('should validate TomTom API response structure', async () => {
      // Test with actual API structure to ensure type safety
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              address: {
                freeformAddress: 'Test Address',
                streetNumber: '123',
                streetName: 'Main St',
              },
              position: { lat: 40.0, lon: -80.0 },
              // Additional fields that TomTom returns (we ignore these)
              type: 'Point Address',
              score: 1.0,
            },
          ],
        }),
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      // Should extract only the fields we need
      expect(data.results[0]).toEqual({
        address: 'Test Address',
        lat: 40.0,
        lon: -80.0,
      });
      expect(data.results[0]).not.toHaveProperty('type');
      expect(data.results[0]).not.toHaveProperty('score');
    });
  });

  describe('Error Handling', () => {
    it('should return empty results when API key is missing', async () => {
      delete process.env.TOMTOM_API_KEY;

      const request = new Request('http://localhost/api/admin/geocode/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Graceful degradation
      expect(data.results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled(); // Should not call API
    });

    it('should return empty results on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request = new Request('http://localhost/api/admin/geocode/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Graceful degradation
      expect(data.results).toEqual([]);
    });

    it('should return empty results on JSON parse error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Graceful degradation
      expect(data.results).toEqual([]);
    });
  });

  describe('Caching', () => {
    it('should cache results for 24 hours', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const request = new Request('http://localhost/api/admin/geocode/search?q=test');
      await GET(request);

      // Verify caching configuration
      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchOptions).toEqual({
        next: { revalidate: 86400 }, // 24 hours in seconds
      });
    });
  });
});
