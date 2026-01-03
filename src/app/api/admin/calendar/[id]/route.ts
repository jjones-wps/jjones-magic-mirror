import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import prisma from '@/lib/db';

/**
 * DELETE /api/admin/calendar/[id]
 * Delete a calendar feed
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if feed exists
    const feed = await prisma.calendarFeed.findUnique({
      where: { id },
    });

    if (!feed) {
      return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
    }

    // Delete the feed
    await prisma.calendarFeed.delete({
      where: { id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'calendar.delete',
        category: 'calendar',
        userId: session.user.id,
        details: JSON.stringify({ feedId: id, name: feed.name }),
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
    console.error('Error deleting calendar feed:', error);
    return NextResponse.json({ error: 'Failed to delete calendar feed' }, { status: 500 });
  }
}
