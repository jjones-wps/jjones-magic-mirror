/**
 * Unit Tests for Settings Admin API Routes
 *
 * Tests GET, PUT, and POST endpoints for settings management
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
      update: jest.fn(),
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    configVersion: {
      upsert: jest.fn(),
    },
  },
}));

import { GET, PUT, POST } from '@/app/api/admin/settings/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('GET /api/admin/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(prisma.setting.findMany).not.toHaveBeenCalled();
  });

  test('returns all settings when no category filter provided', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockSettings = [
      { id: 'weather.lat', category: 'weather', value: '"41.0793"', encrypted: false },
      { id: 'api.key', category: 'api', value: '"secret"', encrypted: true },
    ];
    (prisma.setting.findMany as jest.Mock).mockResolvedValue(mockSettings);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      settings: [
        { id: 'weather.lat', category: 'weather', value: '41.0793', encrypted: false },
        { id: 'api.key', category: 'api', value: '********', encrypted: true },
      ],
    });

    expect(prisma.setting.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { id: 'asc' },
    });
  });

  test('returns filtered settings when category provided', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockSettings = [
      { id: 'weather.lat', category: 'weather', value: '"41.0793"', encrypted: false },
      { id: 'weather.lon', category: 'weather', value: '"-85.1394"', encrypted: false },
    ];
    (prisma.setting.findMany as jest.Mock).mockResolvedValue(mockSettings);

    const request = new (global.NextRequest as any)(
      'http://localhost:3000/api/admin/settings?category=weather'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      settings: [
        { id: 'weather.lat', category: 'weather', value: '41.0793', encrypted: false },
        { id: 'weather.lon', category: 'weather', value: '-85.1394', encrypted: false },
      ],
    });

    expect(prisma.setting.findMany).toHaveBeenCalledWith({
      where: { category: 'weather' },
      orderBy: { id: 'asc' },
    });
  });

  test('masks encrypted field values', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockSettings = [
      { id: 'api.key', category: 'api', value: '"super-secret-key"', encrypted: true },
    ];
    (prisma.setting.findMany as jest.Mock).mockResolvedValue(mockSettings);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      settings: [{ id: 'api.key', category: 'api', value: '********', encrypted: true }],
    });
  });

  test('returns 500 when database query fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.setting.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch settings' });
  });
});

describe('PUT /api/admin/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: [{ id: 'test', value: 'value' }] }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 when settings is not an array', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: 'not-an-array' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid settings format' });
  });

  test('successfully updates single setting', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.setting.update as jest.Mock).mockResolvedValue({
      id: 'weather.lat',
      value: '"42.0"',
    });

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        settings: [{ id: 'weather.lat', value: '42.0' }],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, updated: 1 });

    expect(prisma.setting.update).toHaveBeenCalledWith({
      where: { id: 'weather.lat' },
      data: {
        value: '"42.0"',
        updatedBy: 'user123',
      },
    });
  });

  test('successfully updates multiple settings', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.setting.update as jest.Mock).mockResolvedValue({});

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        settings: [
          { id: 'weather.lat', value: '42.0' },
          { id: 'weather.lon', value: '-73.0' },
          { id: 'weather.units', value: 'celsius' },
        ],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, updated: 3 });

    expect(prisma.setting.update).toHaveBeenCalledTimes(3);
  });

  test('logs activity and increments config version after update', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.setting.update as jest.Mock).mockResolvedValue({});

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        settings: [{ id: 'test1', value: 'val1' }, { id: 'test2', value: 'val2' }],
      }),
    });

    await PUT(request);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'settings.update',
        category: 'settings',
        userId: 'user123',
        details: JSON.stringify({ settingIds: ['test1', 'test2'] }),
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

    (prisma.setting.update as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        settings: [{ id: 'test', value: 'value' }],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to update settings' });
  });
});

describe('POST /api/admin/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ id: 'test', value: 'value', category: 'test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 when id is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ value: 'value', category: 'test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing required fields: id, value, category' });
  });

  test('returns 400 when value is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ id: 'test', category: 'test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing required fields: id, value, category' });
  });

  test('returns 400 when category is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ id: 'test', value: 'value' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing required fields: id, value, category' });
  });

  test('successfully creates setting with minimal fields', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const mockSetting = {
      id: 'test.setting',
      value: '"test-value"',
      category: 'test',
      label: null,
      encrypted: false,
      updatedBy: 'user123',
    };
    (prisma.setting.create as jest.Mock).mockResolvedValue(mockSetting);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test.setting',
        value: 'test-value',
        category: 'test',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, setting: mockSetting });

    expect(prisma.setting.create).toHaveBeenCalledWith({
      data: {
        id: 'test.setting',
        value: '"test-value"',
        category: 'test',
        label: null,
        encrypted: false,
        updatedBy: 'user123',
      },
    });
  });

  test('successfully creates setting with all fields', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const mockSetting = {
      id: 'api.key',
      value: '"secret-key"',
      category: 'api',
      label: 'API Key',
      encrypted: true,
      updatedBy: 'user123',
    };
    (prisma.setting.create as jest.Mock).mockResolvedValue(mockSetting);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({
        id: 'api.key',
        value: 'secret-key',
        category: 'api',
        label: 'API Key',
        encrypted: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, setting: mockSetting });

    expect(prisma.setting.create).toHaveBeenCalledWith({
      data: {
        id: 'api.key',
        value: '"secret-key"',
        category: 'api',
        label: 'API Key',
        encrypted: true,
        updatedBy: 'user123',
      },
    });
  });

  test('logs activity after creation', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.setting.create as jest.Mock).mockResolvedValue({});

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test.setting',
        value: 'value',
        category: 'test',
      }),
    });

    await POST(request);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'settings.create',
        category: 'settings',
        userId: 'user123',
        details: JSON.stringify({ settingId: 'test.setting' }),
      },
    });
  });

  test('returns 500 when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.setting.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test',
        value: 'value',
        category: 'test',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to create setting' });
  });
});
