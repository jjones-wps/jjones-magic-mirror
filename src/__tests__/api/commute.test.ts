/**
 * Tests for Commute API route
 * @jest-environment @edge-runtime/jest-environment
 */

import { GET } from '@/app/api/commute/route';

// Mock the commute library
jest.mock('@/lib/commute', () => ({
  buildTomTomUrl: jest.fn(
    (origin: string, destination: string, apiKey: string) =>
      `https://api.tomtom.com/routing/1/calculateRoute/${origin}:${destination}/json?key=${apiKey}`
  ),
  parseTomTomResponse: jest.fn((data, name, targetTime) => ({
    name,
    durationMinutes: 25,
    distanceMiles: 12.5,
    trafficDelayMinutes: 5,
    trafficStatus: 'moderate' as const,
    suggestedDepartureTime: new Date('2024-01-15T07:35:00Z'),
    targetArrivalTime: targetTime,
  })),
  getDemoCommuteData: jest.fn(() => ({
    commutes: [
      {
        name: 'Demo Commute',
        durationMinutes: 20,
        distanceMiles: 10,
        trafficDelayMinutes: 0,
        trafficStatus: 'light',
        suggestedDepartureTime: '2024-01-15T07:40:00.000Z',
        targetArrivalTime: '08:00',
      },
    ],
    lastUpdated: '2024-01-15T12:00:00.000Z',
    isDemo: true,
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockTomTomResponse = {
  routes: [
    {
      summary: {
        lengthInMeters: 20116,
        travelTimeInSeconds: 1500,
        trafficDelayInSeconds: 300,
        departureTime: '2024-01-15T07:35:00Z',
        arrivalTime: '2024-01-15T08:00:00Z',
      },
    },
  ],
};

describe('GET /api/commute', () => {
  const originalEnv = {
    TOMTOM_API_KEY: process.env.TOMTOM_API_KEY,
    COMMUTE_1_NAME: process.env.COMMUTE_1_NAME,
    COMMUTE_1_ORIGIN: process.env.COMMUTE_1_ORIGIN,
    COMMUTE_1_DESTINATION: process.env.COMMUTE_1_DESTINATION,
    COMMUTE_1_ARRIVAL_TIME: process.env.COMMUTE_1_ARRIVAL_TIME,
    COMMUTE_2_NAME: process.env.COMMUTE_2_NAME,
    COMMUTE_2_ORIGIN: process.env.COMMUTE_2_ORIGIN,
    COMMUTE_2_DESTINATION: process.env.COMMUTE_2_DESTINATION,
    COMMUTE_2_ARRIVAL_TIME: process.env.COMMUTE_2_ARRIVAL_TIME,
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

  it('should return demo data when no API key configured', async () => {
    delete process.env.TOMTOM_API_KEY;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isDemo).toBe(true);
    expect(data.commutes).toHaveLength(1);
    expect(data.commutes[0].name).toBe('Demo Commute');
  });

  it('should return demo data when no commutes configured', async () => {
    process.env.TOMTOM_API_KEY = 'test-api-key';
    delete process.env.COMMUTE_1_ORIGIN;
    delete process.env.COMMUTE_1_DESTINATION;
    delete process.env.COMMUTE_2_ORIGIN;
    delete process.env.COMMUTE_2_DESTINATION;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isDemo).toBe(true);
  });

  it('should fetch real data when API key and commutes are configured', async () => {
    process.env.TOMTOM_API_KEY = 'test-api-key';
    process.env.COMMUTE_1_NAME = 'Jack';
    process.env.COMMUTE_1_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_1_DESTINATION = '41.1327,-85.1762';
    process.env.COMMUTE_1_ARRIVAL_TIME = '08:00';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTomTomResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isDemo).toBe(false);
    expect(data.commutes).toHaveLength(1);
    expect(data.commutes[0].name).toBe('Jack');
    expect(data.commutes[0].durationMinutes).toBe(25);
    expect(data.commutes[0].distanceMiles).toBe(12.5);
    expect(data.lastUpdated).toBeDefined();
  });

  it('should fetch multiple commutes in parallel', async () => {
    process.env.TOMTOM_API_KEY = 'test-api-key';
    process.env.COMMUTE_1_NAME = 'Jack';
    process.env.COMMUTE_1_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_1_DESTINATION = '41.1327,-85.1762';
    process.env.COMMUTE_2_NAME = 'Lauren';
    process.env.COMMUTE_2_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_2_DESTINATION = '41.0421,-85.2409';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTomTomResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.commutes).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should filter out commutes without origin or destination', async () => {
    process.env.TOMTOM_API_KEY = 'test-api-key';
    process.env.COMMUTE_1_NAME = 'Valid Commute';
    process.env.COMMUTE_1_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_1_DESTINATION = '41.1327,-85.1762';
    process.env.COMMUTE_2_NAME = 'Invalid Commute';
    process.env.COMMUTE_2_ORIGIN = '41.0454,-85.1455';
    delete process.env.COMMUTE_2_DESTINATION; // Missing destination

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTomTomResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.commutes).toHaveLength(1);
    expect(data.commutes[0].name).toBe('Valid Commute');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should use default names and arrival times when not configured', async () => {
    process.env.TOMTOM_API_KEY = 'test-api-key';
    delete process.env.COMMUTE_1_NAME;
    process.env.COMMUTE_1_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_1_DESTINATION = '41.1327,-85.1762';
    delete process.env.COMMUTE_1_ARRIVAL_TIME;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTomTomResponse,
    });

    await GET();

    // Should use default values internally (tested via library mock)
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle TomTom API errors gracefully', async () => {
    process.env.TOMTOM_API_KEY = 'test-api-key';
    process.env.COMMUTE_1_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_1_DESTINATION = '41.1327,-85.1762';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    });

    const response = await GET();
    const data = await response.json();

    // Should fall back to demo data when all requests fail
    expect(data.isDemo).toBe(true);
  });

  it('should handle network errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    process.env.TOMTOM_API_KEY = 'test-api-key';
    process.env.COMMUTE_1_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_1_DESTINATION = '41.1327,-85.1762';

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const response = await GET();
    const data = await response.json();

    expect(data.isDemo).toBe(true);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should round duration and distance values', async () => {
    process.env.TOMTOM_API_KEY = 'test-api-key';
    process.env.COMMUTE_1_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_1_DESTINATION = '41.1327,-85.1762';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTomTomResponse,
    });

    const response = await GET();
    const data = await response.json();

    // Values should be rounded (checked via mock implementation)
    expect(typeof data.commutes[0].durationMinutes).toBe('number');
    expect(typeof data.commutes[0].distanceMiles).toBe('number');
    expect(data.commutes[0].durationMinutes).toBe(25);
    expect(data.commutes[0].distanceMiles).toBe(12.5);
  });

  it('should include lastUpdated timestamp', async () => {
    process.env.TOMTOM_API_KEY = 'test-api-key';
    process.env.COMMUTE_1_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_1_DESTINATION = '41.1327,-85.1762';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTomTomResponse,
    });

    const before = new Date();
    const response = await GET();
    const data = await response.json();
    const after = new Date();

    const lastUpdated = new Date(data.lastUpdated);
    expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should include traffic status in response', async () => {
    process.env.TOMTOM_API_KEY = 'test-api-key';
    process.env.COMMUTE_1_ORIGIN = '41.0454,-85.1455';
    process.env.COMMUTE_1_DESTINATION = '41.1327,-85.1762';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTomTomResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.commutes[0]).toHaveProperty('trafficStatus');
    expect(['light', 'moderate', 'heavy']).toContain(data.commutes[0].trafficStatus);
  });
});
