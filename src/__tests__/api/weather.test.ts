/**
 * Tests for Weather API route
 * @jest-environment @edge-runtime/jest-environment
 */

import { GET } from '@/app/api/weather/route';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    setting: {
      findMany: jest.fn(),
    },
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockOpenMeteoResponse = {
  current: {
    temperature_2m: 72.5,
    apparent_temperature: 70.2,
    relative_humidity_2m: 65,
    wind_speed_10m: 8.3,
    weather_code: 2,
    is_day: 1,
  },
  daily: {
    time: ['2024-01-15', '2024-01-16', '2024-01-17'],
    temperature_2m_max: [75.2, 73.8, 68.5],
    temperature_2m_min: [55.1, 54.3, 50.2],
    weather_code: [2, 3, 61],
    precipitation_probability_max: [10, 20, 80],
  },
};

describe('GET /api/weather', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default settings: Fort Wayne, IN
    (prisma.setting.findMany as jest.Mock).mockResolvedValue([
      { id: 'weather.latitude', category: 'weather', value: '41.0793' },
      { id: 'weather.longitude', category: 'weather', value: '-85.1394' },
      { id: 'weather.location', category: 'weather', value: 'Fort Wayne, IN' },
      { id: 'weather.units', category: 'weather', value: 'fahrenheit' },
    ]);
  });

  it('should fetch and transform weather data successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.open-meteo.com/v1/forecast'),
      expect.any(Object)
    );

    // Check current weather transformation
    expect(data.current).toEqual({
      temperature: 73, // Rounded from 72.5
      feelsLike: 70, // Rounded from 70.2
      humidity: 65,
      windSpeed: 8, // Rounded from 8.3
      weatherCode: 2,
      isDay: true,
    });

    // Check daily forecast
    expect(data.daily).toHaveLength(3);
    expect(data.daily[0]).toEqual({
      date: '2024-01-15',
      tempHigh: 75,
      tempLow: 55,
      weatherCode: 2,
      precipitationProbability: 10,
    });

    expect(data.location).toBe('Fort Wayne, IN');
    expect(data.lastUpdated).toBeDefined();
  });

  it('should use dynamic location from database settings', async () => {
    (prisma.setting.findMany as jest.Mock).mockResolvedValue([
      { id: 'weather.latitude', category: 'weather', value: '41.8832' },
      { id: 'weather.longitude', category: 'weather', value: '-87.6324' },
      { id: 'weather.location', category: 'weather', value: 'Chicago, IL' },
      { id: 'weather.units', category: 'weather', value: 'fahrenheit' },
    ]);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.location).toBe('Chicago, IL');

    // Verify correct coordinates were used
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('latitude=41.8832');
    expect(callUrl).toContain('longitude=-87.6324');
  });

  it('should support celsius temperature units', async () => {
    (prisma.setting.findMany as jest.Mock).mockResolvedValue([
      { id: 'weather.latitude', category: 'weather', value: '48.8566' },
      { id: 'weather.longitude', category: 'weather', value: '2.3522' },
      { id: 'weather.location', category: 'weather', value: 'Paris, France' },
      { id: 'weather.units', category: 'weather', value: 'celsius' },
    ]);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    await GET();

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('temperature_unit=celsius');
  });

  it('should use default location when no settings exist', async () => {
    (prisma.setting.findMany as jest.Mock).mockResolvedValue([]);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.location).toBe('Fort Wayne, IN');

    // Verify default coordinates were used
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('latitude=41.0793');
    expect(callUrl).toContain('longitude=-85.1394');
    expect(callUrl).toContain('temperature_unit=fahrenheit');
  });

  it('should use defaults for missing individual settings', async () => {
    (prisma.setting.findMany as jest.Mock).mockResolvedValue([
      { id: 'weather.latitude', category: 'weather', value: '39.7684' },
      // Missing longitude, location, and units
    ]);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.location).toBe('Fort Wayne, IN'); // Default

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('latitude=39.7684'); // From settings
    expect(callUrl).toContain('longitude=-85.1394'); // Default
    expect(callUrl).toContain('temperature_unit=fahrenheit'); // Default
  });

  it('should include required weather parameters', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    await GET();

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('temperature_2m');
    expect(callUrl).toContain('apparent_temperature');
    expect(callUrl).toContain('weather_code');
    expect(callUrl).toContain('temperature_unit=fahrenheit');
    expect(callUrl).toContain('wind_speed_unit=mph');
    // Timezone is URL-encoded (/ becomes %2F)
    expect(callUrl).toContain('timezone=America%2FIndiana%2FIndianapolis');
    expect(callUrl).toContain('forecast_days=7');
  });

  it('should handle database errors gracefully', async () => {
    (prisma.setting.findMany as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    const response = await GET();
    const data = await response.json();

    // Should still return weather data with defaults
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch weather' });
  });

  it('should handle Open-Meteo API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch weather' });
  });

  it('should handle network errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch weather' });
    expect(consoleError).toHaveBeenCalledWith(
      '[Weather API] Error fetching weather:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it('should round temperature values correctly', async () => {
    const responseWithDecimals = {
      ...mockOpenMeteoResponse,
      current: {
        ...mockOpenMeteoResponse.current,
        temperature_2m: 72.4, // Should round to 72
        apparent_temperature: 70.6, // Should round to 71
        wind_speed_10m: 8.7, // Should round to 9
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => responseWithDecimals,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.current.temperature).toBe(72);
    expect(data.current.feelsLike).toBe(71);
    expect(data.current.windSpeed).toBe(9);
  });

  it('should convert is_day boolean correctly', async () => {
    const nightResponse = {
      ...mockOpenMeteoResponse,
      current: {
        ...mockOpenMeteoResponse.current,
        is_day: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => nightResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.current.isDay).toBe(false);
  });

  it('should include lastUpdated timestamp', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    const before = new Date();
    const response = await GET();
    const data = await response.json();
    const after = new Date();

    const lastUpdated = new Date(data.lastUpdated);
    expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should query settings from database', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    await GET();

    expect(prisma.setting.findMany).toHaveBeenCalledWith({
      where: { category: 'weather' },
    });
  });
});
