import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

// GET /api/admin/settings - Get all settings or by category
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  try {
    const settings = await prisma.setting.findMany({
      where: category ? { category } : undefined,
      orderBy: { id: 'asc' },
    });

    // Parse JSON values and mask encrypted fields
    const parsed = settings.map((s) => ({
      ...s,
      value: s.encrypted ? '********' : JSON.parse(s.value),
    }));

    return NextResponse.json({ settings: parsed });
  } catch (error) {
    console.error('[Settings API] Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/admin/settings - Update settings
export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { settings } = body as { settings: Array<{ id: string; value: unknown }> };

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 });
    }

    // Update each setting
    const updates = await Promise.all(
      settings.map(async ({ id, value }) => {
        return prisma.setting.update({
          where: { id },
          data: {
            value: JSON.stringify(value),
            updatedBy: session.user.id,
          },
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
        action: 'settings.update',
        category: 'settings',
        userId: session.user.id,
        details: JSON.stringify({ settingIds: settings.map((s) => s.id) }),
      },
    });

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error('[Settings API] Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

// POST /api/admin/settings - Create a new setting
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, value, category, label, encrypted } = body;

    if (!id || value === undefined || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: id, value, category' },
        { status: 400 }
      );
    }

    const setting = await prisma.setting.create({
      data: {
        id,
        value: JSON.stringify(value),
        category,
        label: label || null,
        encrypted: encrypted || false,
        updatedBy: session.user.id,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'settings.create',
        category: 'settings',
        userId: session.user.id,
        details: JSON.stringify({ settingId: id }),
      },
    });

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    console.error('[Settings API] Error creating setting:', error);
    return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 });
  }
}
