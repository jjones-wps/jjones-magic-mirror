/**
 * Unit Tests for Calendar Admin API Routes
 *
 * Tests GET, POST, and PUT endpoints for calendar feed management
 */

// Mock dependencies BEFORE imports (Jest hoists these)
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    calendarFeed: {
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

import { GET, POST, PUT } from '@/app/api/admin/calendar/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('GET /api/admin/calendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(prisma.calendarFeed.findMany).not.toHaveBeenCalled();
  });

  test('returns all calendar feeds ordered by creation date', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockFeeds = [
      { id: '1', name: 'Work', url: 'https://cal1.com', enabled: true, color: 'blue', createdAt: new Date('2024-01-01') },
      { id: '2', name: 'Personal', url: 'https://cal2.com', enabled: true, color: 'red', createdAt: new Date('2024-01-02') },
    ];
    (prisma.calendarFeed.findMany as jest.Mock).mockResolvedValue(mockFeeds);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ feeds: mockFeeds });
    expect(prisma.calendarFeed.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'asc' },
    });
  });

  test('returns 500 when database query fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.calendarFeed.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch calendar feeds' });
  });
});

describe('POST /api/admin/calendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', url: 'https://test.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 when name is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://test.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Name and URL are required' });
  });

  test('returns 400 when URL is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Name and URL are required' });
  });

  test('creates calendar feed with default enabled=true', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockFeed = {
      id: '1',
      name: 'Test Feed',
      url: 'https://test.com/calendar.ics',
      enabled: true,
      color: null,
    };
    (prisma.calendarFeed.create as jest.Mock).mockResolvedValue(mockFeed);

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Feed',
        url: 'https://test.com/calendar.ics',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({ feed: mockFeed });
    expect(prisma.calendarFeed.create).toHaveBeenCalledWith({
      data: {
        name: 'Test Feed',
        url: 'https://test.com/calendar.ics',
        enabled: true,
        color: undefined,
      },
    });
  });

  test('creates calendar feed with custom enabled and color', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockFeed = {
      id: '1',
      name: 'Test Feed',
      url: 'https://test.com/calendar.ics',
      enabled: false,
      color: 'blue',
    };
    (prisma.calendarFeed.create as jest.Mock).mockResolvedValue(mockFeed);

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Feed',
        url: 'https://test.com/calendar.ics',
        enabled: false,
        color: 'blue',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({ feed: mockFeed });
    expect(prisma.calendarFeed.create).toHaveBeenCalledWith({
      data: {
        name: 'Test Feed',
        url: 'https://test.com/calendar.ics',
        enabled: false,
        color: 'blue',
      },
    });
  });

  test('logs activity and increments config version after creation', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const mockFeed = {
      id: 'feed456',
      name: 'Test Feed',
      url: 'https://test.com/calendar.ics',
      enabled: true,
      color: null,
    };
    (prisma.calendarFeed.create as jest.Mock).mockResolvedValue(mockFeed);

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Feed',
        url: 'https://test.com/calendar.ics',
      }),
    });

    await POST(request);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'calendar.create',
        category: 'calendar',
        userId: 'user123',
        details: JSON.stringify({ feedId: 'feed456', name: 'Test Feed' }),
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

    (prisma.calendarFeed.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Feed',
        url: 'https://test.com/calendar.ics',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to create calendar feed' });
  });
});

describe('PUT /api/admin/calendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'PUT',
      body: JSON.stringify({ feeds: [] }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 when feeds array is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'PUT',
      body: JSON.stringify({}),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Feeds array is required' });
  });

  test('returns 400 when feeds array is empty', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'PUT',
      body: JSON.stringify({ feeds: [] }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Feeds array is required' });
  });

  test('updates multiple feeds and logs activity', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.calendarFeed.update as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'PUT',
      body: JSON.stringify({
        feeds: [
          { id: 'feed1', enabled: true },
          { id: 'feed2', enabled: false },
        ],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });

    expect(prisma.calendarFeed.update).toHaveBeenCalledTimes(2);
    expect(prisma.calendarFeed.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'feed1' },
      data: { enabled: true },
    });
    expect(prisma.calendarFeed.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'feed2' },
      data: { enabled: false },
    });

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'calendar.update',
        category: 'calendar',
        userId: 'user123',
        details: JSON.stringify({
          count: 2,
          feedIds: ['feed1', 'feed2'],
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

    (prisma.calendarFeed.update as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost:3000/api/admin/calendar', {
      method: 'PUT',
      body: JSON.stringify({
        feeds: [{ id: 'feed1', enabled: true }],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to update calendar feeds' });
  });
});
