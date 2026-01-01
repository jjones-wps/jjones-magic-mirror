// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

// GET /api/admin/widgets - Get all widgets
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const widgets = await prisma.widget.findMany({
      orderBy: { order: 'asc' },
    });

    // Parse JSON settings
    const parsed = widgets.map((w) => ({
      ...w,
      settings: w.settings ? JSON.parse(w.settings) : {},
    }));

    return NextResponse.json({ widgets: parsed });
  } catch (error) {
    console.error('[Widgets API] Error fetching widgets:', error);
    return NextResponse.json({ error: 'Failed to fetch widgets' }, { status: 500 });
  }
}

// PUT /api/admin/widgets - Update widget(s)
export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { widgets } = body as {
      widgets: Array<{
        id: string;
        enabled?: boolean;
        order?: number;
        settings?: Record<string, unknown>;
      }>;
    };

    if (!Array.isArray(widgets)) {
      return NextResponse.json({ error: 'Invalid widgets format' }, { status: 400 });
    }

    // Update each widget
    const updates = await Promise.all(
      widgets.map(async ({ id, enabled, order, settings }) => {
        const data: {
          enabled?: boolean;
          order?: number;
          settings?: string;
        } = {};

        if (enabled !== undefined) data.enabled = enabled;
        if (order !== undefined) data.order = order;
        if (settings !== undefined) data.settings = JSON.stringify(settings);

        return prisma.widget.update({
          where: { id },
          data,
        });
      })
    );

    // Increment config version to notify mirror of changes
    await prisma.configVersion.upsert({
      where: { id: 'current' },
      update: { version: { increment: 1 } },
      create: { id: 'current', version: 1 },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'widgets.update',
        category: 'widgets',
        userId: session.user.id,
        details: JSON.stringify({
          widgetIds: widgets.map((w) => w.id),
          changes: widgets.map((w) => ({
            id: w.id,
            enabled: w.enabled,
          })),
        }),
      },
    });

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error('[Widgets API] Error updating widgets:', error);
    return NextResponse.json({ error: 'Failed to update widgets' }, { status: 500 });
  }
}
