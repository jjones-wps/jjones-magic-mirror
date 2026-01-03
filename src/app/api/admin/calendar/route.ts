import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/calendar
 * Fetch all calendar feeds
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feeds = await prisma.calendarFeed.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ feeds });
  } catch (error) {
    console.error('Error fetching calendar feeds:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar feeds' }, { status: 500 });
  }
}

/**
 * POST /api/admin/calendar
 * Create a new calendar feed
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, enabled = true, color } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    // Create the feed
    const feed = await prisma.calendarFeed.create({
      data: {
        name,
        url,
        enabled,
        color,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'calendar.create',
        category: 'calendar',
        userId: session.user.id,
        details: JSON.stringify({ feedId: feed.id, name }),
      },
    });

    // Increment config version to trigger mirror refresh
    await prisma.configVersion.upsert({
      where: { id: 'current' },
      update: { version: { increment: 1 } },
      create: { id: 'current', version: 1 },
    });

    return NextResponse.json({ feed }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar feed:', error);
    return NextResponse.json({ error: 'Failed to create calendar feed' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/calendar
 * Update multiple calendar feeds (for bulk enable/disable)
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { feeds } = body;

    if (!Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json({ error: 'Feeds array is required' }, { status: 400 });
    }

    // Update each feed
    const updates = feeds.map((feed: { id: string; enabled: boolean }) =>
      prisma.calendarFeed.update({
        where: { id: feed.id },
        data: { enabled: feed.enabled },
      })
    );

    await Promise.all(updates);

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'calendar.update',
        category: 'calendar',
        userId: session.user.id,
        details: JSON.stringify({
          count: feeds.length,
          feedIds: feeds.map((f) => f.id),
        }),
      },
    });

    // Increment config version to trigger mirror refresh
    await prisma.configVersion.upsert({
      where: { id: 'current' },
      update: { version: { increment: 1 } },
      create: { id: 'current', version: 1 },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating calendar feeds:', error);
    return NextResponse.json({ error: 'Failed to update calendar feeds' }, { status: 500 });
  }
}
