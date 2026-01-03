/**
 * Tests for AI Behavior Settings API route
 * @jest-environment node
 */

import { GET, PUT } from '@/app/api/admin/ai-behavior/route';
import { prisma } from '@/lib/db';
import { DEFAULT_AI_BEHAVIOR } from '@/lib/ai-behavior';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    setting: {
      findMany: jest.fn(),
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

// Mock auth
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth/server';

describe('GET /api/admin/ai-behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return defaults when no settings exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });
    (prisma.setting.findMany as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(DEFAULT_AI_BEHAVIOR);
  });

  it('should return stored settings', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });
    (prisma.setting.findMany as jest.Mock).mockResolvedValue([
      { id: 'ai-behavior.model', value: 'anthropic/claude-3-5-sonnet' },
      { id: 'ai-behavior.temperature', value: '0.8' },
      { id: 'ai-behavior.maxTokens', value: '200' },
      { id: 'ai-behavior.topP', value: '0.9' },
      { id: 'ai-behavior.presencePenalty', value: '0.5' },
      { id: 'ai-behavior.verbosity', value: 'high' },
      { id: 'ai-behavior.tone', value: 'formal' },
      { id: 'ai-behavior.userNames', value: '["Jack","Lauren"]' },
      { id: 'ai-behavior.humorLevel', value: 'playful' },
      { id: 'ai-behavior.customInstructions', value: 'Always mention the weather' },
      { id: 'ai-behavior.morningTone', value: 'energizing' },
      { id: 'ai-behavior.eveningTone', value: 'calming' },
      { id: 'ai-behavior.stressAwareEnabled', value: 'true' },
      { id: 'ai-behavior.celebrationModeEnabled', value: 'false' },
      { id: 'ai-behavior.stopSequences', value: '["urgent","breaking"]' },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.model).toBe('anthropic/claude-3-5-sonnet');
    expect(data.temperature).toBe(0.8);
    expect(data.maxTokens).toBe(200);
    expect(data.topP).toBe(0.9);
    expect(data.presencePenalty).toBe(0.5);
    expect(data.verbosity).toBe('high');
    expect(data.tone).toBe('formal');
    expect(data.userNames).toEqual(['Jack', 'Lauren']);
    expect(data.humorLevel).toBe('playful');
    expect(data.customInstructions).toBe('Always mention the weather');
    expect(data.morningTone).toBe('energizing');
    expect(data.eveningTone).toBe('calming');
    expect(data.stressAwareEnabled).toBe(true);
    expect(data.celebrationModeEnabled).toBe(false);
    expect(data.stopSequences).toEqual(['urgent', 'breaking']);
  });

  it('should handle partial settings with defaults', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });
    (prisma.setting.findMany as jest.Mock).mockResolvedValue([
      { id: 'ai-behavior.temperature', value: '0.5' },
      { id: 'ai-behavior.tone', value: 'casual' },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.temperature).toBe(0.5);
    expect(data.tone).toBe('casual');
    expect(data.model).toBe(DEFAULT_AI_BEHAVIOR.model);
    expect(data.maxTokens).toBe(DEFAULT_AI_BEHAVIOR.maxTokens);
  });
});

describe('PUT /api/admin/ai-behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(DEFAULT_AI_BEHAVIOR),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should update settings successfully', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });
    (prisma.setting.upsert as jest.Mock).mockResolvedValue({});
    (prisma.activityLog.create as jest.Mock).mockResolvedValue({});
    (prisma.configVersion.upsert as jest.Mock).mockResolvedValue({});

    const updatedSettings = {
      ...DEFAULT_AI_BEHAVIOR,
      temperature: 0.9,
      tone: 'formal' as const,
      userNames: ['Jack', 'Lauren'],
    };

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(updatedSettings),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify upsert was called for each setting
    expect(prisma.setting.upsert).toHaveBeenCalledTimes(15);

    // Verify activity log was created
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: 'ai-behavior.update',
        category: 'ai-behavior',
        userId: 'test-user',
        details: JSON.stringify(updatedSettings),
      },
    });

    // Verify config version was incremented
    expect(prisma.configVersion.upsert).toHaveBeenCalled();
  });

  it('should reject invalid temperature', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });

    const invalidSettings = {
      ...DEFAULT_AI_BEHAVIOR,
      temperature: 3, // Invalid: > 2
    };

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(invalidSettings),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Temperature must be between 0 and 2');
  });

  it('should reject invalid max tokens', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });

    const invalidSettings = {
      ...DEFAULT_AI_BEHAVIOR,
      maxTokens: 500, // Invalid: > 300
    };

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(invalidSettings),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Max tokens must be between 50 and 300');
  });

  it('should reject invalid top-p', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });

    const invalidSettings = {
      ...DEFAULT_AI_BEHAVIOR,
      topP: 1.5, // Invalid: > 1
    };

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(invalidSettings),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Top-P must be between 0 and 1');
  });

  it('should reject invalid presence penalty', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });

    const invalidSettings = {
      ...DEFAULT_AI_BEHAVIOR,
      presencePenalty: 3, // Invalid: > 2
    };

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(invalidSettings),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Presence penalty must be between -2 and 2');
  });

  it('should reject invalid verbosity', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });

    const invalidSettings = {
      ...DEFAULT_AI_BEHAVIOR,
      verbosity: 'ultra' as unknown, // Invalid enum value
    };

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(invalidSettings),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Verbosity must be low, medium, or high');
  });

  it('should reject too many stop sequences', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });

    const invalidSettings = {
      ...DEFAULT_AI_BEHAVIOR,
      stopSequences: new Array(15).fill('stop'), // Invalid: > 10
    };

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(invalidSettings),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Maximum 10 stop sequences allowed');
  });

  it('should reject too many user names', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });

    const invalidSettings = {
      ...DEFAULT_AI_BEHAVIOR,
      userNames: new Array(15).fill('User'), // Invalid: > 10
    };

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(invalidSettings),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Maximum 10 user names allowed');
  });

  it('should reject custom instructions that are too long', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });

    const invalidSettings = {
      ...DEFAULT_AI_BEHAVIOR,
      customInstructions: 'a'.repeat(501), // Invalid: > 500
    };

    const mockRequest = new Request('http://localhost:3000/api/admin/ai-behavior', {
      method: 'PUT',
      body: JSON.stringify(invalidSettings),
    });

    const response = await PUT(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Custom instructions must be 500 characters or less');
  });
});
