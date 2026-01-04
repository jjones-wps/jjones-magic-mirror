/**
 * Unit Tests for Calendar Feed Delete API Route
 *
 * Tests DELETE endpoint for individual calendar feed deletion
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    calendarFeed: {
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

import { DELETE } from '@/app/api/admin/calendar/[id]/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('DELETE /api/admin/calendar/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/feed123');
    const params = Promise.resolve({ id: 'feed123' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(prisma.calendarFeed.findUnique).not.toHaveBeenCalled();
  });

  test('returns 404 when feed does not exist', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/feed123');
    const params = Promise.resolve({ id: 'feed123' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Feed not found' });
    expect(prisma.calendarFeed.findUnique).toHaveBeenCalledWith({
      where: { id: 'feed123' },
    });
    expect(prisma.calendarFeed.delete).not.toHaveBeenCalled();
  });

  test('successfully deletes calendar feed', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const mockFeed = {
      id: 'feed123',
      name: 'Work Calendar',
      url: 'https://example.com/cal.ics',
      enabled: true,
      color: null,
    };
    (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue(mockFeed);
    (prisma.calendarFeed.delete as jest.Mock).mockResolvedValue(mockFeed);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/feed123');
    const params = Promise.resolve({ id: 'feed123' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });

    expect(prisma.calendarFeed.delete).toHaveBeenCalledWith({
      where: { id: 'feed123' },
    });
  });

  test('logs activity and increments config version after deletion', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const mockFeed = {
      id: 'feed123',
      name: 'Work Calendar',
      url: 'https://example.com/cal.ics',
      enabled: true,
      color: null,
    };
    (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue(mockFeed);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/feed123');
    const params = Promise.resolve({ id: 'feed123' });

    await DELETE(request, { params });

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'calendar.delete',
        category: 'calendar',
        userId: 'user123',
        details: JSON.stringify({ feedId: 'feed123', name: 'Work Calendar' }),
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

    (prisma.calendarFeed.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/feed123');
    const params = Promise.resolve({ id: 'feed123' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to delete calendar feed' });
  });
});
