/**
 * Unit Tests for Commute Route Delete API Route
 *
 * Tests DELETE endpoint for individual commute route deletion
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
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    configVersion: {
      upsert: jest.fn(),
    },
  },
}));

import { DELETE } from '@/app/api/admin/commute/[id]/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('DELETE /api/admin/commute/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute/route123');
    const params = Promise.resolve({ id: 'route123' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(prisma.commuteRoute.findUnique).not.toHaveBeenCalled();
  });

  test('returns 404 when route does not exist', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.commuteRoute.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute/route123');
    const params = Promise.resolve({ id: 'route123' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Route not found' });
    expect(prisma.commuteRoute.findUnique).toHaveBeenCalledWith({
      where: { id: 'route123' },
    });
    expect(prisma.commuteRoute.delete).not.toHaveBeenCalled();
  });

  test('successfully deletes commute route', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const mockRoute = {
      id: 'route123',
      name: 'Jack to Work',
      origin: '41.0454,-85.1455',
      destination: '41.1327,-85.1762',
      arrivalTime: '08:00',
      enabled: true,
    };
    (prisma.commuteRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute);
    (prisma.commuteRoute.delete as jest.Mock).mockResolvedValue(mockRoute);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute/route123');
    const params = Promise.resolve({ id: 'route123' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });

    expect(prisma.commuteRoute.delete).toHaveBeenCalledWith({
      where: { id: 'route123' },
    });
  });

  test('logs activity and increments config version after deletion', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const mockRoute = {
      id: 'route123',
      name: 'Jack to Work',
      origin: '41.0454,-85.1455',
      destination: '41.1327,-85.1762',
      arrivalTime: '08:00',
      enabled: true,
    };
    (prisma.commuteRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute/route123');
    const params = Promise.resolve({ id: 'route123' });

    await DELETE(request, { params });

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'commute.delete',
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
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.commuteRoute.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/commute/route123');
    const params = Promise.resolve({ id: 'route123' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to delete commute route' });
  });
});
