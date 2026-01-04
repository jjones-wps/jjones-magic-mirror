/**
 * Unit Tests for Mirror Status API Route
 *
 * Tests GET and POST endpoints for mirror system status and heartbeat
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    systemState: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    configVersion: {
      findUnique: jest.fn(),
    },
    widget: {
      findMany: jest.fn(),
    },
    activityLog: {
      findMany: jest.fn(),
    },
  },
}));
jest.mock('os', () => ({
  loadavg: jest.fn(() => [0.5, 0.3, 0.2]),
}));

import { GET, POST } from '@/app/api/admin/mirror/status/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Mock process.uptime and process.memoryUsage
const originalUptime = process.uptime;
const originalMemoryUsage = process.memoryUsage;

describe('GET /api/admin/mirror/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.uptime = jest.fn(() => 3600); // 1 hour
    process.memoryUsage = jest.fn(() => ({
      rss: 100 * 1024 * 1024,
      heapTotal: 80 * 1024 * 1024,
      heapUsed: 50 * 1024 * 1024, // 50 MB
      external: 5 * 1024 * 1024,
      arrayBuffers: 2 * 1024 * 1024,
    }));
  });

  afterEach(() => {
    process.uptime = originalUptime;
    process.memoryUsage = originalMemoryUsage;
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(prisma.systemState.findUnique).not.toHaveBeenCalled();
  });

  test('successfully returns status with existing systemState', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockSystemState = {
      id: 'mirror',
      online: true,
      lastPing: new Date('2024-01-01T12:00:00Z'),
      uptime: 3600,
      memoryUsage: 50,
      cpuUsage: 0.5,
    };

    const mockConfigVersion = {
      id: 'current',
      version: 5,
      updatedAt: new Date('2024-01-01T11:00:00Z'),
    };

    const mockWidgets = [
      { id: 'clock', enabled: true },
      { id: 'weather', enabled: true },
      { id: 'calendar', enabled: false },
    ];

    const mockActivity = [
      {
        id: '1',
        action: 'settings.update',
        category: 'settings',
        details: '{"settingIds":["test"]}',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        user: { name: 'Test User', email: 'test@example.com' },
      },
      {
        id: '2',
        action: 'widgets.update',
        category: 'widgets',
        details: null,
        createdAt: new Date('2024-01-01T11:30:00Z'),
        user: null,
      },
    ];

    (prisma.systemState.findUnique as jest.Mock).mockResolvedValue(mockSystemState);
    (prisma.configVersion.findUnique as jest.Mock).mockResolvedValue(mockConfigVersion);
    (prisma.widget.findMany as jest.Mock).mockResolvedValue(mockWidgets);
    (prisma.activityLog.findMany as jest.Mock).mockResolvedValue(mockActivity);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: {
        online: true,
        lastPing: mockSystemState.lastPing,
        uptime: 3600,
        memoryUsage: 50,
        cpuUsage: 0.5,
      },
      config: {
        version: 5,
        lastUpdated: mockConfigVersion.updatedAt,
      },
      widgets: {
        enabled: 2,
        total: 3,
      },
      recentActivity: [
        {
          id: '1',
          action: 'settings.update',
          category: 'settings',
          details: { settingIds: ['test'] },
          createdAt: mockActivity[0].createdAt,
          user: 'Test User',
        },
        {
          id: '2',
          action: 'widgets.update',
          category: 'widgets',
          details: null,
          createdAt: mockActivity[1].createdAt,
          user: 'System',
        },
      ],
    });

    expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });
  });

  test('creates systemState if it does not exist', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockCreatedState = {
      id: 'mirror',
      online: true,
      lastPing: new Date(),
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };

    (prisma.systemState.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.systemState.create as jest.Mock).mockResolvedValue(mockCreatedState);
    (prisma.configVersion.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.widget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.activityLog.findMany as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.systemState.create).toHaveBeenCalledWith({
      data: {
        id: 'mirror',
        online: true,
        lastPing: expect.any(Date),
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    });
    expect(data.config).toEqual({
      version: 0,
      lastUpdated: null,
    });
  });

  test('returns 500 when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.systemState.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to get mirror status' });
  });
});

describe('POST /api/admin/mirror/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.uptime = jest.fn(() => 3600);
    process.memoryUsage = jest.fn(() => ({
      rss: 100 * 1024 * 1024,
      heapTotal: 80 * 1024 * 1024,
      heapUsed: 50 * 1024 * 1024,
      external: 5 * 1024 * 1024,
      arrayBuffers: 2 * 1024 * 1024,
    }));
  });

  afterEach(() => {
    process.uptime = originalUptime;
    process.memoryUsage = originalMemoryUsage;
  });

  test('successfully updates heartbeat (no auth required)', async () => {
    (prisma.systemState.upsert as jest.Mock).mockResolvedValue({
      id: 'mirror',
      online: true,
      lastPing: new Date(),
      uptime: 3600,
      memoryUsage: 50,
      cpuUsage: 0.5,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });

    expect(prisma.systemState.upsert).toHaveBeenCalledWith({
      where: { id: 'mirror' },
      update: {
        online: true,
        lastPing: expect.any(Date),
        uptime: 3600,
        memoryUsage: 50,
        cpuUsage: 0.5,
      },
      create: {
        id: 'mirror',
        online: true,
        lastPing: expect.any(Date),
        uptime: 3600,
        memoryUsage: 50,
        cpuUsage: 0.5,
      },
    });
  });

  test('returns 500 when database operation fails', async () => {
    (prisma.systemState.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to update heartbeat' });
  });
});
