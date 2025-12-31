import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/config-version - Public endpoint for mirror to poll config changes
// No auth required - mirror needs to check this
export async function GET() {
  try {
    const configVersion = await prisma.configVersion.findUnique({
      where: { id: 'current' },
    });

    // Also update mirror heartbeat
    await prisma.systemState.upsert({
      where: { id: 'mirror' },
      update: {
        online: true,
        lastPing: new Date(),
      },
      create: {
        id: 'mirror',
        online: true,
        lastPing: new Date(),
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    });

    return NextResponse.json({
      version: configVersion?.version || 0,
      updatedAt: configVersion?.updatedAt || null,
    });
  } catch (error) {
    console.error('[Config Version API] Error:', error);
    // Return a safe default even on error
    return NextResponse.json({ version: 0, updatedAt: null });
  }
}
