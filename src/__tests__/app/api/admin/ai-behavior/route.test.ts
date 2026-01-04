/**
 * Unit Tests for AI Behavior Settings API Route
 *
 * Tests GET and PUT endpoints for AI model configuration
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn(),
    setting: {
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
jest.mock('@/lib/ai-behavior.server', () => ({
  fetchAIBehaviorSettings: jest.fn(),
  invalidateAIBehaviorCache: jest.fn(),
}));

import { GET, PUT } from '@/app/api/admin/ai-behavior/route';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import {
  fetchAIBehaviorSettings,
  invalidateAIBehaviorCache,
} from '@/lib/ai-behavior.server';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockFetchSettings = fetchAIBehaviorSettings as jest.MockedFunction<
  typeof fetchAIBehaviorSettings
>;
const mockInvalidateCache = invalidateAIBehaviorCache as jest.MockedFunction<
  typeof invalidateAIBehaviorCache
>;

describe('GET /api/admin/ai-behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(mockFetchSettings).not.toHaveBeenCalled();
  });

  test('successfully fetches and returns AI behavior settings', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockSettings = {
      model: 'anthropic/claude-3-haiku',
      temperature: 0.7,
      maxTokens: 150,
      topP: 1.0,
      presencePenalty: 0.0,
      verbosity: 'medium',
      tone: 'casual',
      userNames: ['Jack', 'Lauren'],
      humorLevel: 'subtle',
      customInstructions: '',
      morningTone: 'energetic',
      eveningTone: 'relaxed',
      stressAwareEnabled: true,
      celebrationModeEnabled: false,
      stopSequences: [],
    };

    mockFetchSettings.mockResolvedValue(mockSettings as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockSettings);
    expect(mockFetchSettings).toHaveBeenCalled();
  });

  test('returns 500 when fetching settings fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    mockFetchSettings.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch AI behavior settings' });
  });
});

describe('PUT /api/admin/ai-behavior', () => {
  const validSettings = {
    model: 'anthropic/claude-3-haiku',
    temperature: 0.7,
    maxTokens: 150,
    topP: 1.0,
    presencePenalty: 0.0,
    verbosity: 'medium',
    tone: 'casual',
    userNames: ['Jack', 'Lauren'],
    humorLevel: 'subtle',
    customInstructions: '',
    morningTone: 'energetic',
    eveningTone: 'relaxed',
    stressAwareEnabled: true,
    celebrationModeEnabled: false,
    stopSequences: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(validSettings),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 for invalid temperature (< 0)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, temperature: -0.1 }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Temperature must be between 0 and 2');
  });

  test('returns 400 for invalid temperature (> 2)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, temperature: 2.1 }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Temperature must be between 0 and 2');
  });

  test('returns 400 for invalid maxTokens (< 50)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, maxTokens: 49 }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Max tokens must be between 50 and 300');
  });

  test('returns 400 for invalid maxTokens (> 300)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, maxTokens: 301 }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Max tokens must be between 50 and 300');
  });

  test('returns 400 for invalid topP', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, topP: 1.5 }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Top-P must be between 0 and 1');
  });

  test('returns 400 for invalid presencePenalty', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, presencePenalty: 3.0 }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Presence penalty must be between -2 and 2');
  });

  test('returns 400 for invalid verbosity', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, verbosity: 'invalid' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Verbosity must be low, medium, or high');
  });

  test('returns 400 for invalid tone', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, tone: 'invalid' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Tone must be formal or casual');
  });

  test('returns 400 for invalid humorLevel', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, humorLevel: 'invalid' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Humor level must be none, subtle, or playful');
  });

  test('returns 400 for custom instructions too long', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, customInstructions: 'a'.repeat(501) }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Custom instructions must be 500 characters or less');
  });

  test('returns 400 for too many stop sequences', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, stopSequences: Array(11).fill('STOP') }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Maximum 10 stop sequences allowed');
  });

  test('returns 400 for too many user names', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify({ ...validSettings, userNames: Array(11).fill('User') }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Maximum 10 user names allowed');
  });

  test('successfully updates all settings using transaction', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.$transaction as jest.Mock).mockResolvedValue([]);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(validSettings),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
    expect(mockInvalidateCache).toHaveBeenCalled();
  });

  test('returns 500 when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);

    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(validSettings),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to update AI behavior settings' });
  });
});
