import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

/**
 * DELETE /api/admin/commute/[id]
 * Delete a commute route
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if route exists
    const route = await prisma.commuteRoute.findUnique({
      where: { id },
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Delete the route
    await prisma.commuteRoute.delete({
      where: { id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'commute.delete',
        category: 'commute',
        userId: session.user.id,
        details: JSON.stringify({ routeId: id, name: route.name }),
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
    console.error('Error deleting commute route:', error);
    return NextResponse.json({ error: 'Failed to delete commute route' }, { status: 500 });
  }
}
