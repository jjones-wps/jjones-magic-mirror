/**
 * Tests for Public Weather Settings API route
 * @jest-environment @edge-runtime/jest-environment
 */

import { GET } from '@/app/api/weather/settings/route';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    setting: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/weather/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should return weather settings from database', async () => {
      (prisma.setting.findMany as jest.Mock).mockResolvedValue([
        { id: 'weather.latitude', category: 'weather', value: '41.8832' },
        { id: 'weather.longitude', category: 'weather', value: '-87.6324' },
        { id: 'weather.location', category: 'weather', value: 'Chicago, IL' },
        { id: 'weather.units', category: 'weather', value: 'fahrenheit' },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        latitude: '41.8832',
        longitude: '-87.6324',
        location: 'Chicago, IL',
        units: 'fahrenheit',
      });

      expect(prisma.setting.findMany).toHaveBeenCalledWith({
        where: { category: 'weather' },
      });
    });

    it('should handle celsius units', async () => {
      (prisma.setting.findMany as jest.Mock).mockResolvedValue([
        { id: 'weather.latitude', category: 'weather', value: '48.8566' },
        { id: 'weather.longitude', category: 'weather', value: '2.3522' },
        { id: 'weather.location', category: 'weather', value: 'Paris, France' },
        { id: 'weather.units', category: 'weather', value: 'celsius' },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(data.units).toBe('celsius');
      expect(data.location).toBe('Paris, France');
    });

    it('should return defaults when no settings exist', async () => {
      (prisma.setting.findMany as jest.Mock).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        latitude: '41.0793',
        longitude: '-85.1394',
        location: 'Fort Wayne, IN',
        units: 'fahrenheit',
      });
    });

    it('should return defaults for missing individual settings', async () => {
      (prisma.setting.findMany as jest.Mock).mockResolvedValue([
        { id: 'weather.latitude', category: 'weather', value: '39.7684' },
        // Missing longitude, location, and units
      ]);

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual({
        latitude: '39.7684',
        longitude: '-85.1394', // Default
        location: 'Fort Wayne, IN', // Default
        units: 'fahrenheit', // Default
      });
    });
  });

  describe('Error Handling', () => {
    it('should return defaults when database query fails', async () => {
      (prisma.setting.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await GET();
      const data = await response.json();

      // Should return defaults as graceful degradation
      expect(response.status).toBe(200);
      expect(data).toEqual({
        latitude: '41.0793',
        longitude: '-85.1394',
        location: 'Fort Wayne, IN',
        units: 'fahrenheit',
      });
    });

    it('should log errors but not expose them to client', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (prisma.setting.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await GET();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Weather Settings API] Error fetching settings:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('No Authentication Required', () => {
    it('should allow access without authentication (public endpoint)', async () => {
      (prisma.setting.findMany as jest.Mock).mockResolvedValue([
        { id: 'weather.latitude', category: 'weather', value: '41.0793' },
        { id: 'weather.longitude', category: 'weather', value: '-85.1394' },
        { id: 'weather.location', category: 'weather', value: 'Fort Wayne, IN' },
        { id: 'weather.units', category: 'weather', value: 'fahrenheit' },
      ]);

      // No authentication headers or session required
      const response = await GET();

      expect(response.status).toBe(200);
    });
  });

  describe('Response Format', () => {
    it('should return correct data types', async () => {
      (prisma.setting.findMany as jest.Mock).mockResolvedValue([
        { id: 'weather.latitude', category: 'weather', value: '41.0793' },
        { id: 'weather.longitude', category: 'weather', value: '-85.1394' },
        { id: 'weather.location', category: 'weather', value: 'Fort Wayne, IN' },
        { id: 'weather.units', category: 'weather', value: 'fahrenheit' },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(typeof data.latitude).toBe('string');
      expect(typeof data.longitude).toBe('string');
      expect(typeof data.location).toBe('string');
      expect(typeof data.units).toBe('string');
      expect(['fahrenheit', 'celsius']).toContain(data.units);
    });

    it('should strip "weather." prefix from setting IDs', async () => {
      (prisma.setting.findMany as jest.Mock).mockResolvedValue([
        { id: 'weather.latitude', category: 'weather', value: '40.0' },
        { id: 'weather.longitude', category: 'weather', value: '-80.0' },
        { id: 'weather.location', category: 'weather', value: 'Test City' },
        { id: 'weather.units', category: 'weather', value: 'celsius' },
      ]);

      const response = await GET();
      const data = await response.json();

      // Response should have clean keys without "weather." prefix
      expect(data).toHaveProperty('latitude');
      expect(data).toHaveProperty('longitude');
      expect(data).toHaveProperty('location');
      expect(data).toHaveProperty('units');

      expect(data).not.toHaveProperty('weather.latitude');
    });
  });
});
