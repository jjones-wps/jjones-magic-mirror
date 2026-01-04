/**
 * Unit Tests for Mirror Refresh Admin API Route
 *
 * Tests POST endpoint for forcing mirror refresh
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    configVersion: {
      upsert: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

import { POST } from '@/app/api/admin/mirror/refresh/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('POST /api/admin/mirror/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(prisma.configVersion.upsert).not.toHaveBeenCalled();
  });

  test('successfully triggers mirror refresh and returns new version', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.configVersion.upsert as jest.Mock).mockResolvedValue({ version: 42 });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Refresh signal sent to mirror',
      configVersion: 42,
    });

    expect(prisma.configVersion.upsert).toHaveBeenCalledWith({
      where: { id: 'current' },
      update: { version: { increment: 1 } },
      create: { id: 'current', version: 1 },
    });
  });

  test('logs activity with correct details', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.configVersion.upsert as jest.Mock).mockResolvedValue({ version: 42 });

    await POST();

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'mirror.refresh',
        category: 'system',
        userId: 'user123',
        details: JSON.stringify({ newVersion: 42 }),
      },
    });
  });

  test('returns 500 when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    (prisma.configVersion.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to trigger refresh' });
  });
});
