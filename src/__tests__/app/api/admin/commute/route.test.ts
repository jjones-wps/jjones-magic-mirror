/**
 * Unit Tests for Commute Routes Admin API
 *
 * Tests GET, POST, and PUT endpoints for commute route management
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    commuteRoute: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    configVersion: {
      upsert: jest.fn(),
    },
  },
}));

import { GET, POST, PUT } from '@/app/api/admin/commute/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('GET /api/admin/commute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(prisma.commuteRoute.findMany).not.toHaveBeenCalled();
  });

  test('successfully fetches all routes ordered by createdAt', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockRoutes = [
      {
        id: 'route1',
        name: 'Jack to Work',
        originLat: 41.0454,
        originLon: -85.1455,
        destLat: 41.1327,
        destLon: -85.1762,
        arrivalTime: '08:00',
        daysActive: '1,2,3,4,5',
        enabled: true,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'route2',
        name: 'Lauren to Work',
        originLat: 41.0454,
        originLon: -85.1455,
        destLat: 41.0421,
        destLon: -85.2409,
        arrivalTime: '08:00',
        daysActive: '1,2,3,4,5',
        enabled: true,
        createdAt: new Date('2024-01-02'),
      },
    ];

    (prisma.commuteRoute.findMany as jest.Mock).mockResolvedValue(mockRoutes);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ routes: mockRoutes });
    expect(prisma.commuteRoute.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'asc' },
    });
  });

  test('returns 500 when database query fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.commuteRoute.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch commute routes' });
  });
});

describe('POST /api/admin/commute', () => {
  const validRoute = {
    name: 'Jack to Work',
    originLat: 41.0454,
    originLon: -85.1455,
    destLat: 41.1327,
    destLon: -85.1762,
    arrivalTime: '08:00',
    daysActive: '1,2,3,4,5',
    enabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify(validRoute),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 when name is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const { name, ...incomplete } = validRoute;

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify(incomplete),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Name');
    expect(data.error).toContain('required');
  });

  test('returns 400 when origin coordinates are missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const { originLat, originLon, ...incomplete } = validRoute;

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify(incomplete),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('origin coordinates');
    expect(data.error).toContain('required');
  });

  test('returns 400 when destination coordinates are missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const { destLat, destLon, ...incomplete } = validRoute;

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify(incomplete),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('destination coordinates');
    expect(data.error).toContain('required');
  });

  test('returns 400 when arrival time is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const { arrivalTime, ...incomplete } = validRoute;

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify(incomplete),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('arrival time');
    expect(data.error).toContain('required');
  });

  test('returns 400 for invalid origin latitude (< -90)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify({ ...validRoute, originLat: -91 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Origin latitude');
    expect(data.error).toContain('-90 and 90');
  });

  test('returns 400 for invalid origin latitude (> 90)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify({ ...validRoute, originLat: 91 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Origin latitude');
    expect(data.error).toContain('-90 and 90');
  });

  test('returns 400 for invalid origin longitude (< -180)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify({ ...validRoute, originLon: -181 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Origin longitude');
    expect(data.error).toContain('-180 and 180');
  });

  test('returns 400 for invalid origin longitude (> 180)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify({ ...validRoute, originLon: 181 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Origin longitude');
    expect(data.error).toContain('-180 and 180');
  });

  test('returns 400 for invalid destination latitude', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify({ ...validRoute, destLat: 100 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Destination latitude');
    expect(data.error).toContain('-90 and 90');
  });

  test('returns 400 for invalid destination longitude', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify({ ...validRoute, destLon: 200 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Destination longitude');
    expect(data.error).toContain('-180 and 180');
  });

  test('returns 400 for invalid arrival time format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify({ ...validRoute, arrivalTime: '8:00 AM' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('HH:MM');
  });

  test('returns 400 for invalid daysActive format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify({ ...validRoute, daysActive: '1,2,7' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Days active');
    expect(data.error).toContain('0-6');
  });

  test('successfully creates route with all fields', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const mockCreatedRoute = {
      id: 'route123',
      ...validRoute,
      createdAt: new Date(),
    };

    (prisma.commuteRoute.create as jest.Mock).mockResolvedValue(mockCreatedRoute);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify(validRoute),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({ route: mockCreatedRoute });

    expect(prisma.commuteRoute.create).toHaveBeenCalledWith({
      data: {
        name: 'Jack to Work',
        originLat: 41.0454,
        originLon: -85.1455,
        destLat: 41.1327,
        destLon: -85.1762,
        arrivalTime: '08:00',
        daysActive: '1,2,3,4,5',
        enabled: true,
      },
    });
  });

  test('successfully creates route with defaults (daysActive, enabled)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const { daysActive, enabled, ...minimalRoute } = validRoute;

    const mockCreatedRoute = {
      id: 'route123',
      ...minimalRoute,
      daysActive: '1,2,3,4,5',
      enabled: true,
      createdAt: new Date(),
    };

    (prisma.commuteRoute.create as jest.Mock).mockResolvedValue(mockCreatedRoute);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify(minimalRoute),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.route.daysActive).toBe('1,2,3,4,5');
    expect(data.route.enabled).toBe(true);
  });

  test('logs activity and increments config version after creation', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const mockCreatedRoute = {
      id: 'route123',
      ...validRoute,
      createdAt: new Date(),
    };

    (prisma.commuteRoute.create as jest.Mock).mockResolvedValue(mockCreatedRoute);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify(validRoute),
    });

    await POST(request);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'commute.create',
        category: 'commute',
        userId: 'user123',
        details: JSON.stringify({ routeId: 'route123', name: 'Jack to Work' }),
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

    (prisma.commuteRoute.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'POST',
      body: JSON.stringify(validRoute),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to create commute route' });
  });
});

describe('PUT /api/admin/commute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'PUT',
      body: JSON.stringify({ routes: [{ id: 'route1', enabled: false }] }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 when routes array is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'PUT',
      body: JSON.stringify({}),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Routes array is required' });
  });

  test('returns 400 when routes array is empty', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'PUT',
      body: JSON.stringify({ routes: [] }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Routes array is required' });
  });

  test('successfully updates multiple routes', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.commuteRoute.update as jest.Mock).mockResolvedValue({});

    const routesToUpdate = [
      { id: 'route1', enabled: false },
      { id: 'route2', enabled: true },
      { id: 'route3', enabled: false },
    ];

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'PUT',
      body: JSON.stringify({ routes: routesToUpdate }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });

    expect(prisma.commuteRoute.update).toHaveBeenCalledTimes(3);
    expect(prisma.commuteRoute.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'route1' },
      data: { enabled: false },
    });
    expect(prisma.commuteRoute.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'route2' },
      data: { enabled: true },
    });
    expect(prisma.commuteRoute.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'route3' },
      data: { enabled: false },
    });
  });

  test('logs activity and increments config version after update', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.commuteRoute.update as jest.Mock).mockResolvedValue({});

    const routesToUpdate = [
      { id: 'route1', enabled: false },
      { id: 'route2', enabled: true },
    ];

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'PUT',
      body: JSON.stringify({ routes: routesToUpdate }),
    });

    await PUT(request);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'commute.update',
        category: 'commute',
        userId: 'user123',
        details: JSON.stringify({
          count: 2,
          routeIds: ['route1', 'route2'],
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
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.commuteRoute.update as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute', {
      method: 'PUT',
      body: JSON.stringify({ routes: [{ id: 'route1', enabled: false }] }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to update commute routes' });
  });
});
