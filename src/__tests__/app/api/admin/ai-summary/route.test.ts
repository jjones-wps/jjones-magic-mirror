/**
 * Unit Tests for AI Summary Settings API Route
 *
 * Tests GET and PUT endpoints for AI context configuration
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    setting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    configVersion: {
      upsert: jest.fn(),
    },
  },
}));

import { GET, PUT } from '@/app/api/admin/ai-summary/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

const DEFAULT_SETTINGS = {
  includeWeatherLocation: true,
  includeFeelsLike: true,
  includeWindSpeed: true,
  includePrecipitation: true,
  includeTomorrowWeather: true,
  includeCalendar: true,
  includeEventTimes: true,
  includeTimeUntilNext: true,
  includeAllDayEvents: true,
  includeCommute: true,
  includeCommuteDeviation: true,
  includeDayDate: true,
  includeWeekendDetection: true,
};

describe('GET /api/admin/ai-summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(prisma.setting.findMany).not.toHaveBeenCalled();
  });

  test('returns default settings when no settings exist', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.setting.findMany as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(DEFAULT_SETTINGS);

    expect(prisma.setting.findMany).toHaveBeenCalledWith({
      where: { category: 'ai-summary' },
    });
  });

  test('successfully fetches and transforms settings', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockSettings = [
      { id: 'ai-summary.includeWeatherLocation', value: 'false' },
      { id: 'ai-summary.includeFeelsLike', value: 'true' },
      { id: 'ai-summary.includeWindSpeed', value: 'false' },
      { id: 'ai-summary.includePrecipitation', value: 'true' },
      { id: 'ai-summary.includeTomorrowWeather', value: 'false' },
      { id: 'ai-summary.includeCalendar', value: 'true' },
      { id: 'ai-summary.includeEventTimes', value: 'false' },
      { id: 'ai-summary.includeTimeUntilNext', value: 'true' },
      { id: 'ai-summary.includeAllDayEvents', value: 'false' },
      { id: 'ai-summary.includeCommute', value: 'true' },
      { id: 'ai-summary.includeCommuteDeviation', value: 'false' },
      { id: 'ai-summary.includeDayDate', value: 'true' },
      { id: 'ai-summary.includeWeekendDetection', value: 'false' },
    ];

    (prisma.setting.findMany as jest.Mock).mockResolvedValue(mockSettings);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      includeWeatherLocation: false,
      includeFeelsLike: true,
      includeWindSpeed: false,
      includePrecipitation: true,
      includeTomorrowWeather: false,
      includeCalendar: true,
      includeEventTimes: false,
      includeTimeUntilNext: true,
      includeAllDayEvents: false,
      includeCommute: true,
      includeCommuteDeviation: false,
      includeDayDate: true,
      includeWeekendDetection: false,
    });
  });

  test('returns 500 when database query fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.setting.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch AI summary settings' });
  });
});

describe('PUT /api/admin/ai-summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-summary', {
      method: 'PUT',
      body: JSON.stringify(DEFAULT_SETTINGS),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 for missing field', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const { includeWeatherLocation, ...incomplete } = DEFAULT_SETTINGS;

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-summary', {
      method: 'PUT',
      body: JSON.stringify(incomplete),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('includeWeatherLocation');
    expect(data.error).toContain('All fields must be boolean');
  });

  test('returns 400 for non-boolean field value', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const invalidSettings = {
      ...DEFAULT_SETTINGS,
      includeWeatherLocation: 'not a boolean' as any,
    };

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-summary', {
      method: 'PUT',
      body: JSON.stringify(invalidSettings),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('includeWeatherLocation');
    expect(data.error).toContain('All fields must be boolean');
  });

  test('successfully updates all settings', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

    const customSettings = {
      includeWeatherLocation: false,
      includeFeelsLike: false,
      includeWindSpeed: true,
      includePrecipitation: false,
      includeTomorrowWeather: true,
      includeCalendar: false,
      includeEventTimes: true,
      includeTimeUntilNext: false,
      includeAllDayEvents: true,
      includeCommute: false,
      includeCommuteDeviation: true,
      includeDayDate: false,
      includeWeekendDetection: true,
    };

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-summary', {
      method: 'PUT',
      body: JSON.stringify(customSettings),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });

    // Should upsert 13 settings
    expect(prisma.setting.upsert).toHaveBeenCalledTimes(13);

    // Verify one of the upsert calls
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { id: 'ai-summary.includeWeatherLocation' },
      update: { value: 'false' },
      create: {
        id: 'ai-summary.includeWeatherLocation',
        category: 'ai-summary',
        value: 'false',
      },
    });
  });

  test('logs activity and increments config version after update', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-summary', {
      method: 'PUT',
      body: JSON.stringify(DEFAULT_SETTINGS),
    });

    await PUT(request);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'ai-summary.update',
        category: 'ai-summary',
        userId: 'user123',
        details: JSON.stringify(DEFAULT_SETTINGS),
      },
    });

    expect(prisma.configVersion.upsert).toHaveBeenCalledWith({
      where: { id: 'current' },
      update: { version: { increment: 1 } },
      create: { id: 'current', version: 1 },
    });
  });

  test('returns 500 when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.setting.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-summary', {
      method: 'PUT',
      body: JSON.stringify(DEFAULT_SETTINGS),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to update AI summary settings' });
  });
});
