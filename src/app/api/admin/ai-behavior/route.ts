import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import type { AIBehaviorSettings } from '@/lib/ai-behavior';
import {
  fetchAIBehaviorSettings,
  invalidateAIBehaviorCache,
} from '@/lib/ai-behavior.server';

/**
 * AI Behavior Settings API
 *
 * Manage AI model parameters, tone, personalization, and context-aware features
 * for the daily summary generation.
 */

/**
 * GET /api/admin/ai-behavior
 * Fetch AI behavior settings
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await fetchAIBehaviorSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching AI behavior settings:', error);
    return NextResponse.json({ error: 'Failed to fetch AI behavior settings' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/ai-behavior
 * Update AI behavior settings
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AIBehaviorSettings = await request.json();

    // Validation
    const validationErrors: string[] = [];

    // Temperature: 0-2
    if (body.temperature < 0 || body.temperature > 2) {
      validationErrors.push('Temperature must be between 0 and 2');
    }

    // Max tokens: 50-300
    if (body.maxTokens < 50 || body.maxTokens > 300) {
      validationErrors.push('Max tokens must be between 50 and 300');
    }

    // Top-P: 0-1
    if (body.topP < 0 || body.topP > 1) {
      validationErrors.push('Top-P must be between 0 and 1');
    }

    // Presence penalty: -2 to 2
    if (body.presencePenalty < -2 || body.presencePenalty > 2) {
      validationErrors.push('Presence penalty must be between -2 and 2');
    }

    // Verbosity enum
    if (!['low', 'medium', 'high'].includes(body.verbosity)) {
      validationErrors.push('Verbosity must be low, medium, or high');
    }

    // Tone enum
    if (!['formal', 'casual'].includes(body.tone)) {
      validationErrors.push('Tone must be formal or casual');
    }

    // Humor level enum
    if (!['none', 'subtle', 'playful'].includes(body.humorLevel)) {
      validationErrors.push('Humor level must be none, subtle, or playful');
    }

    // Custom instructions max length
    if (body.customInstructions.length > 500) {
      validationErrors.push('Custom instructions must be 500 characters or less');
    }

    // Stop sequences max count
    if (body.stopSequences.length > 10) {
      validationErrors.push('Maximum 10 stop sequences allowed');
    }

    // User names validation
    if (body.userNames.length > 10) {
      validationErrors.push('Maximum 10 user names allowed');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join('; ') }, { status: 400 });
    }

    // Convert settings to database format
    const settingsToUpdate = [
      { id: 'ai-behavior.model', value: body.model },
      { id: 'ai-behavior.temperature', value: body.temperature.toString() },
      { id: 'ai-behavior.maxTokens', value: body.maxTokens.toString() },
      { id: 'ai-behavior.topP', value: body.topP.toString() },
      { id: 'ai-behavior.presencePenalty', value: body.presencePenalty.toString() },
      { id: 'ai-behavior.verbosity', value: body.verbosity },
      { id: 'ai-behavior.tone', value: body.tone },
      { id: 'ai-behavior.userNames', value: JSON.stringify(body.userNames) },
      { id: 'ai-behavior.humorLevel', value: body.humorLevel },
      { id: 'ai-behavior.customInstructions', value: body.customInstructions },
      { id: 'ai-behavior.morningTone', value: body.morningTone },
      { id: 'ai-behavior.eveningTone', value: body.eveningTone },
      { id: 'ai-behavior.stressAwareEnabled', value: body.stressAwareEnabled.toString() },
      {
        id: 'ai-behavior.celebrationModeEnabled',
        value: body.celebrationModeEnabled.toString(),
      },
      { id: 'ai-behavior.stopSequences', value: JSON.stringify(body.stopSequences) },
    ];

    // Wrap all database operations in a transaction for atomicity
    await prisma.$transaction([
      // Upsert all settings
      ...settingsToUpdate.map((setting) =>
        prisma.setting.upsert({
          where: { id: setting.id },
          update: { value: setting.value },
          create: {
            id: setting.id,
            category: 'ai-behavior',
            value: setting.value,
          },
        })
      ),
      // Log activity
      prisma.activityLog.create({
        data: {
          action: 'ai-behavior.update',
          category: 'ai-behavior',
          userId: session.user.id,
          details: JSON.stringify(body),
        },
      }),
      // Increment config version to trigger mirror refresh
      prisma.configVersion.upsert({
        where: { id: 'current' },
        update: { version: { increment: 1 } },
        create: { id: 'current', version: 1 },
      }),
    ]);

    // Invalidate cache to ensure next fetch gets fresh data
    invalidateAIBehaviorCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating AI behavior settings:', error);
    return NextResponse.json({ error: 'Failed to update AI behavior settings' }, { status: 500 });
  }
}
