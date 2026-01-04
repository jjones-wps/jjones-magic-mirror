/**
 * Tests for Config Version API route
 * @jest-environment node
 */

import { GET } from '@/app/api/config-version/route';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    configVersion: {
      findUnique: jest.fn(),
    },
    systemState: {
      upsert: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
const mockFindUnique = prisma.configVersion.findUnique as jest.MockedFunction<
  typeof prisma.configVersion.findUnique
>;
const mockUpsert = prisma.systemState.upsert as jest.MockedFunction<typeof prisma.systemState.upsert>;

describe('GET /api/config-version', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return config version and updatedAt', async () => {
    const mockDate = new Date('2024-01-15T12:00:00Z');
    mockFindUnique.mockResolvedValue({
      id: 'current',
      version: 5,
      updatedAt: mockDate,
    });
    mockUpsert.mockResolvedValue({});

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      version: 5,
      updatedAt: mockDate, // NextResponse.json serializes Date objects
    });
  });

  it('should return default version 0 when no config exists', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({});

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      version: 0,
      updatedAt: null,
    });
  });

  it('should update mirror heartbeat on each request', async () => {
    mockFindUnique.mockResolvedValue({
      version: 3,
      updatedAt: new Date(),
    });
    mockUpsert.mockResolvedValue({});

    await GET();

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { id: 'mirror' },
      update: {
        online: true,
        lastPing: expect.any(Date),
      },
      create: {
        id: 'mirror',
        online: true,
        lastPing: expect.any(Date),
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    mockFindUnique.mockRejectedValue(new Error('Database error'));
    mockUpsert.mockResolvedValue({});

    const response = await GET();
    const data = await response.json();

    // Should return safe default even on error
    expect(response.status).toBe(200);
    expect(data).toEqual({
      version: 0,
      updatedAt: null,
    });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should handle upsert errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    mockFindUnique.mockResolvedValue({ version: 2, updatedAt: new Date() });
    mockUpsert.mockRejectedValue(new Error('Upsert failed'));

    const response = await GET();
    const data = await response.json();

    // Should still return safe default
    expect(response.status).toBe(200);
    expect(data).toEqual({
      version: 0,
      updatedAt: null,
    });

    consoleError.mockRestore();
  });

  it('should query for config version with correct ID', async () => {
    mockFindUnique.mockResolvedValue({ version: 1, updatedAt: new Date() });
    mockUpsert.mockResolvedValue({});

    await GET();

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'current' },
    });
  });

  it('should return version as number', async () => {
    mockFindUnique.mockResolvedValue({
      version: 42,
      updatedAt: new Date(),
    });
    mockUpsert.mockResolvedValue({});

    const response = await GET();
    const data = await response.json();

    expect(typeof data.version).toBe('number');
    expect(data.version).toBe(42);
  });
});
