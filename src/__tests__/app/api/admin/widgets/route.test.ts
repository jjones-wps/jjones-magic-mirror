/**
 * Unit Tests for Widgets Admin API Routes
 *
 * Tests GET and PUT endpoints for widget management
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    widget: {
      findMany: jest.fn(),
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

import { GET, PUT } from '@/app/api/admin/widgets/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('GET /api/admin/widgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(prisma.widget.findMany).not.toHaveBeenCalled();
  });

  test('returns all widgets ordered by order field', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockWidgets = [
      { id: 'clock', name: 'Clock', enabled: true, order: 1, settings: null },
      { id: 'weather', name: 'Weather', enabled: true, order: 2, settings: '{"units":"fahrenheit"}' },
      { id: 'calendar', name: 'Calendar', enabled: false, order: 3, settings: null },
    ];
    (prisma.widget.findMany as jest.Mock).mockResolvedValue(mockWidgets);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      widgets: [
        { id: 'clock', name: 'Clock', enabled: true, order: 1, settings: {} },
        { id: 'weather', name: 'Weather', enabled: true, order: 2, settings: { units: 'fahrenheit' } },
        { id: 'calendar', name: 'Calendar', enabled: false, order: 3, settings: {} },
      ],
    });

    expect(prisma.widget.findMany).toHaveBeenCalledWith({
      orderBy: { order: 'asc' },
    });
  });

  test('returns 500 when database query fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.widget.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch widgets' });
  });
});

describe('PUT /api/admin/widgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/widgets', {
      method: 'PUT',
      body: JSON.stringify({
        widgets: [{ id: 'clock', enabled: false }],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 when widgets is not an array', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/widgets', {
      method: 'PUT',
      body: JSON.stringify({ widgets: 'not-an-array' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid widgets format' });
  });

  test('successfully updates widget enabled status', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.widget.update as jest.Mock).mockResolvedValue({ id: 'clock', enabled: false });

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/widgets', {
      method: 'PUT',
      body: JSON.stringify({
        widgets: [{ id: 'clock', enabled: false }],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, updated: 1 });

    expect(prisma.widget.update).toHaveBeenCalledWith({
      where: { id: 'clock' },
      data: { enabled: false },
    });
  });

  test('successfully updates widget order', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.widget.update as jest.Mock).mockResolvedValue({ id: 'weather', order: 5 });

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/widgets', {
      method: 'PUT',
      body: JSON.stringify({
        widgets: [{ id: 'weather', order: 5 }],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, updated: 1 });

    expect(prisma.widget.update).toHaveBeenCalledWith({
      where: { id: 'weather' },
      data: { order: 5 },
    });
  });

  test('successfully updates widget settings', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.widget.update as jest.Mock).mockResolvedValue({ id: 'weather', settings: '{"units":"celsius"}' });

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/widgets', {
      method: 'PUT',
      body: JSON.stringify({
        widgets: [{ id: 'weather', settings: { units: 'celsius' } }],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, updated: 1 });

    expect(prisma.widget.update).toHaveBeenCalledWith({
      where: { id: 'weather' },
      data: { settings: '{"units":"celsius"}' },
    });
  });

  test('successfully updates multiple widgets', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.widget.update as jest.Mock).mockResolvedValue({});

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/widgets', {
      method: 'PUT',
      body: JSON.stringify({
        widgets: [
          { id: 'clock', enabled: false },
          { id: 'weather', order: 2 },
          { id: 'calendar', enabled: true, order: 3 },
        ],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, updated: 3 });

    expect(prisma.widget.update).toHaveBeenCalledTimes(3);
    expect(prisma.widget.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'clock' },
      data: { enabled: false },
    });
    expect(prisma.widget.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'weather' },
      data: { order: 2 },
    });
    expect(prisma.widget.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'calendar' },
      data: { enabled: true, order: 3 },
    });
  });

  test('logs activity and increments config version after update', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.widget.update as jest.Mock).mockResolvedValue({});

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/widgets', {
      method: 'PUT',
      body: JSON.stringify({
        widgets: [
          { id: 'clock', enabled: false },
          { id: 'weather', enabled: true },
        ],
      }),
    });

    await PUT(request);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'widgets.update',
        category: 'widgets',
        userId: 'user123',
        details: JSON.stringify({
          widgetIds: ['clock', 'weather'],
          changes: [
            { id: 'clock', enabled: false },
            { id: 'weather', enabled: true },
          ],
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

    (prisma.widget.update as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/widgets', {
      method: 'PUT',
      body: JSON.stringify({
        widgets: [{ id: 'clock', enabled: false }],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to update widgets' });
  });
});
