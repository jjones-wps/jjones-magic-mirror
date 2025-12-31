import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import os from 'os';

// GET /api/admin/mirror/status - Get mirror system status
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get or create system state
    let systemState = await prisma.systemState.findUnique({
      where: { id: 'mirror' },
    });

    if (!systemState) {
      systemState = await prisma.systemState.create({
        data: {
          id: 'mirror',
          online: true,
          lastPing: new Date(),
          uptime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
        },
      });
    }

    // Get config version
    const configVersion = await prisma.configVersion.findUnique({
      where: { id: 'current' },
    });

    // Get widget stats
    const widgets = await prisma.widget.findMany();
    const enabledWidgets = widgets.filter((w) => w.enabled).length;
    const totalWidgets = widgets.length;

    // Get recent activity
    const recentActivity = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // Calculate server-side metrics
    const serverUptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = os.loadavg()[0]; // 1-minute load average

    return NextResponse.json({
      status: {
        online: systemState.online,
        lastPing: systemState.lastPing,
        uptime: Math.floor(serverUptime),
        memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        cpuUsage: Math.round(cpuUsage * 100) / 100,
      },
      config: {
        version: configVersion?.version || 0,
        lastUpdated: configVersion?.updatedAt || null,
      },
      widgets: {
        enabled: enabledWidgets,
        total: totalWidgets,
      },
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        category: a.category,
        details: a.details ? JSON.parse(a.details) : null,
        createdAt: a.createdAt,
        user: a.user?.name || a.user?.email || 'System',
      })),
    });
  } catch (error) {
    console.error('[Mirror Status API] Error:', error);
    return NextResponse.json({ error: 'Failed to get mirror status' }, { status: 500 });
  }
}

// POST /api/admin/mirror/status - Update mirror heartbeat (called by mirror)
export async function POST() {
  // This endpoint can be called by the mirror itself to update its status
  // No auth required for mirror heartbeat

  try {
    await prisma.systemState.upsert({
      where: { id: 'mirror' },
      update: {
        online: true,
        lastPing: new Date(),
        uptime: Math.floor(process.uptime()),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpuUsage: Math.round(os.loadavg()[0] * 100) / 100,
      },
      create: {
        id: 'mirror',
        online: true,
        lastPing: new Date(),
        uptime: Math.floor(process.uptime()),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpuUsage: Math.round(os.loadavg()[0] * 100) / 100,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Mirror Heartbeat] Error:', error);
    return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
  }
}
