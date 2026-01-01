// @ts-nocheck
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

// POST /api/admin/mirror/refresh - Force mirror to refresh
export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Increment config version to trigger mirror refresh
    const configVersion = await prisma.configVersion.upsert({
      where: { id: 'current' },
      update: { version: { increment: 1 } },
      create: { id: 'current', version: 1 },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'mirror.refresh',
        category: 'system',
        userId: session.user.id,
        details: JSON.stringify({ newVersion: configVersion.version }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Refresh signal sent to mirror',
      configVersion: configVersion.version,
    });
  } catch (error) {
    console.error('[Mirror Refresh API] Error:', error);
    return NextResponse.json({ error: 'Failed to trigger refresh' }, { status: 500 });
  }
}
