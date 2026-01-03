import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/weather
 * Fetch weather settings
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all weather-related settings
    const settings = await prisma.setting.findMany({
      where: { category: 'weather' },
    });

    // Transform into key-value object (id is the key, e.g., "weather.latitude")
    const weatherSettings: Record<string, string> = {};
    settings.forEach((setting) => {
      // Extract the key from the id (e.g., "weather.latitude" -> "latitude")
      const key = setting.id.replace('weather.', '');
      weatherSettings[key] = setting.value;
    });

    // Provide defaults if settings don't exist
    const response = {
      latitude: weatherSettings.latitude || '41.0793',
      longitude: weatherSettings.longitude || '-85.1394',
      location: weatherSettings.location || 'Fort Wayne, IN',
      units: weatherSettings.units || 'fahrenheit',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching weather settings:', error);
    return NextResponse.json({ error: 'Failed to fetch weather settings' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/weather
 * Update weather settings
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude, location, units } = body;

    // Validate required fields
    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null ||
      !location ||
      !units
    ) {
      return NextResponse.json(
        { error: 'All fields are required: latitude, longitude, location, units' },
        { status: 400 }
      );
    }

    // Validate latitude and longitude format
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: 'Latitude must be a number between -90 and 90' },
        { status: 400 }
      );
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Longitude must be a number between -180 and 180' },
        { status: 400 }
      );
    }

    // Validate units
    if (units !== 'fahrenheit' && units !== 'celsius') {
      return NextResponse.json(
        { error: 'Units must be either "fahrenheit" or "celsius"' },
        { status: 400 }
      );
    }

    // Update all weather settings using upsert
    const settingsToUpdate = [
      { id: 'weather.latitude', value: latitude.toString() },
      { id: 'weather.longitude', value: longitude.toString() },
      { id: 'weather.location', value: location },
      { id: 'weather.units', value: units },
    ];

    await Promise.all(
      settingsToUpdate.map((setting) =>
        prisma.setting.upsert({
          where: { id: setting.id },
          update: { value: setting.value },
          create: {
            id: setting.id,
            category: 'weather',
            value: setting.value,
          },
        })
      )
    );

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'weather.update',
        category: 'weather',
        userId: session.user.id,
        details: JSON.stringify({ location, latitude, longitude, units }),
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
    console.error('Error updating weather settings:', error);
    return NextResponse.json({ error: 'Failed to update weather settings' }, { status: 500 });
  }
}
