import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/commute
 * Fetch all commute routes
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const routes = await prisma.commuteRoute.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ routes });
  } catch (error) {
    console.error('Error fetching commute routes:', error);
    return NextResponse.json({ error: 'Failed to fetch commute routes' }, { status: 500 });
  }
}

/**
 * POST /api/admin/commute
 * Create a new commute route
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      originLat,
      originLon,
      destLat,
      destLon,
      arrivalTime,
      daysActive,
      enabled = true,
    } = body;

    // Validate required fields
    if (
      !name ||
      originLat === undefined ||
      originLon === undefined ||
      destLat === undefined ||
      destLon === undefined ||
      !arrivalTime
    ) {
      return NextResponse.json(
        {
          error: 'Name, origin coordinates, destination coordinates, and arrival time are required',
        },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    const oLat = parseFloat(originLat);
    const oLon = parseFloat(originLon);
    const dLat = parseFloat(destLat);
    const dLon = parseFloat(destLon);

    if (isNaN(oLat) || oLat < -90 || oLat > 90) {
      return NextResponse.json(
        { error: 'Origin latitude must be between -90 and 90' },
        { status: 400 }
      );
    }
    if (isNaN(oLon) || oLon < -180 || oLon > 180) {
      return NextResponse.json(
        { error: 'Origin longitude must be between -180 and 180' },
        { status: 400 }
      );
    }
    if (isNaN(dLat) || dLat < -90 || dLat > 90) {
      return NextResponse.json(
        { error: 'Destination latitude must be between -90 and 90' },
        { status: 400 }
      );
    }
    if (isNaN(dLon) || dLon < -180 || dLon > 180) {
      return NextResponse.json(
        { error: 'Destination longitude must be between -180 and 180' },
        { status: 400 }
      );
    }

    // Validate arrival time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(arrivalTime)) {
      return NextResponse.json(
        { error: 'Arrival time must be in HH:MM format (e.g., 08:00)' },
        { status: 400 }
      );
    }

    // Validate daysActive format (comma-separated numbers 0-6)
    if (daysActive) {
      const days = daysActive.split(',');
      const validDays = days.every((day: string) => {
        const dayNum = parseInt(day.trim());
        return !isNaN(dayNum) && dayNum >= 0 && dayNum <= 6;
      });
      if (!validDays) {
        return NextResponse.json(
          { error: 'Days active must be comma-separated numbers 0-6 (0=Sunday, 6=Saturday)' },
          { status: 400 }
        );
      }
    }

    // Create the route
    const route = await prisma.commuteRoute.create({
      data: {
        name,
        originLat: oLat,
        originLon: oLon,
        destLat: dLat,
        destLon: dLon,
        arrivalTime,
        daysActive: daysActive || '1,2,3,4,5', // Default to weekdays
        enabled,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'commute.create',
        category: 'commute',
        userId: session.user.id,
        details: JSON.stringify({ routeId: route.id, name }),
      },
    });

    // Increment config version to trigger mirror refresh
    await prisma.configVersion.upsert({
      where: { id: 'current' },
      update: { version: { increment: 1 } },
      create: { id: 'current', version: 1 },
    });

    return NextResponse.json({ route }, { status: 201 });
  } catch (error) {
    console.error('Error creating commute route:', error);
    return NextResponse.json({ error: 'Failed to create commute route' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/commute
 * Update multiple commute routes (for bulk enable/disable)
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routes } = body;

    if (!Array.isArray(routes) || routes.length === 0) {
      return NextResponse.json({ error: 'Routes array is required' }, { status: 400 });
    }

    // Update each route
    const updates = routes.map((route: { id: string; enabled: boolean }) =>
      prisma.commuteRoute.update({
        where: { id: route.id },
        data: { enabled: route.enabled },
      })
    );

    await Promise.all(updates);

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'commute.update',
        category: 'commute',
        userId: session.user.id,
        details: JSON.stringify({
          count: routes.length,
          routeIds: routes.map((r) => r.id),
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
    console.error('Error updating commute routes:', error);
    return NextResponse.json({ error: 'Failed to update commute routes' }, { status: 500 });
  }
}
