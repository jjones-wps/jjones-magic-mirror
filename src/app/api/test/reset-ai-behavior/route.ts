import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { invalidateAIBehaviorCache } from '@/lib/ai-behavior.server';

/**
 * DELETE /api/test/reset-ai-behavior
 * Reset AI behavior settings for E2E test isolation
 *
 * **FOR TESTING ONLY** - Deletes all AI behavior settings from database
 */
export async function DELETE() {
  // Only allow in test/development environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Delete all AI behavior settings
    await prisma.setting.deleteMany({
      where: { category: 'ai-behavior' },
    });

    // Invalidate server-side cache
    invalidateAIBehaviorCache();

    return NextResponse.json({ success: true, message: 'AI behavior settings reset' });
  } catch (error) {
    console.error('Error resetting AI behavior settings:', error);
    return NextResponse.json(
      { error: 'Failed to reset AI behavior settings' },
      { status: 500 }
    );
  }
}
