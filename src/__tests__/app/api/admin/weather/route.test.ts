/**
 * Unit Tests for Weather Admin API Routes
 *
 * Tests GET and PUT endpoints for weather settings management
 */

// Mock dependencies BEFORE imports (Jest hoists these)
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

import { GET, PUT } from '@/app/api/admin/weather/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('GET /api/admin/weather', () => {
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

  test('returns default settings when no settings exist in database', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

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
    expect(prisma.setting.findMany).toHaveBeenCalledWith({
      where: { category: 'weather' },
    });
  });

  test('returns custom settings from database', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockSettings = [
      { id: 'weather.latitude', category: 'weather', value: '40.7128' },
      { id: 'weather.longitude', category: 'weather', value: '-74.0060' },
      { id: 'weather.location', category: 'weather', value: 'New York, NY' },
      { id: 'weather.units', category: 'weather', value: 'celsius' },
    ];
    (prisma.setting.findMany as jest.Mock).mockResolvedValue(mockSettings);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      latitude: '40.7128',
      longitude: '-74.0060',
      location: 'New York, NY',
      units: 'celsius',
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
    expect(data).toEqual({ error: 'Failed to fetch weather settings' });
  });
});

describe('PUT /api/admin/weather', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        latitude: '40.7128',
        longitude: '-74.0060',
        location: 'New York, NY',
        units: 'fahrenheit',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 when latitude is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        longitude: '-74.0060',
        location: 'New York, NY',
        units: 'fahrenheit',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'All fields are required: latitude, longitude, location, units',
    });
  });

  test('returns 400 when latitude is out of range (> 90)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        latitude: '95',
        longitude: '-74.0060',
        location: 'New York, NY',
        units: 'fahrenheit',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Latitude must be a number between -90 and 90' });
  });

  test('returns 400 when latitude is out of range (< -90)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        latitude: '-95',
        longitude: '-74.0060',
        location: 'New York, NY',
        units: 'fahrenheit',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Latitude must be a number between -90 and 90' });
  });

  test('returns 400 when longitude is out of range (> 180)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        latitude: '40.7128',
        longitude: '185',
        location: 'New York, NY',
        units: 'fahrenheit',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Longitude must be a number between -180 and 180' });
  });

  test('returns 400 when longitude is out of range (< -180)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        latitude: '40.7128',
        longitude: '-185',
        location: 'New York, NY',
        units: 'fahrenheit',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Longitude must be a number between -180 and 180' });
  });

  test('returns 400 when units are invalid', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        latitude: '40.7128',
        longitude: '-74.0060',
        location: 'New York, NY',
        units: 'kelvin',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Units must be either "fahrenheit" or "celsius"' });
  });

  test('successfully updates weather settings', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        latitude: '40.7128',
        longitude: '-74.0060',
        location: 'New York, NY',
        units: 'celsius',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });

    // Verify all 4 settings were upserted
    expect(prisma.setting.upsert).toHaveBeenCalledTimes(4);
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { id: 'weather.latitude' },
      update: { value: '40.7128' },
      create: { id: 'weather.latitude', category: 'weather', value: '40.7128' },
    });
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { id: 'weather.longitude' },
      update: { value: '-74.0060' },
      create: { id: 'weather.longitude', category: 'weather', value: '-74.0060' },
    });
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { id: 'weather.location' },
      update: { value: 'New York, NY' },
      create: { id: 'weather.location', category: 'weather', value: 'New York, NY' },
    });
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { id: 'weather.units' },
      update: { value: 'celsius' },
      create: { id: 'weather.units', category: 'weather', value: 'celsius' },
    });
  });

  test('logs activity and increments config version after update', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.setting.upsert as jest.Mock).mockResolvedValue({});

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        latitude: '40.7128',
        longitude: '-74.0060',
        location: 'New York, NY',
        units: 'fahrenheit',
      }),
    });

    await PUT(request);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'weather.update',
        category: 'weather',
        userId: 'user123',
        details: JSON.stringify({
          location: 'New York, NY',
          latitude: '40.7128',
          longitude: '-74.0060',
          units: 'fahrenheit',
        }),
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
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.setting.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/weather', {
      method: 'PUT',
      body: JSON.stringify({
        latitude: '40.7128',
        longitude: '-74.0060',
        location: 'New York, NY',
        units: 'fahrenheit',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to update weather settings' });
  });
});
