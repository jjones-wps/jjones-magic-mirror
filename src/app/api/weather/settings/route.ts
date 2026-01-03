import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/weather/settings
 * Public endpoint to fetch weather settings for mirror display
 * No authentication required (display-only data)
 */
export async function GET() {
  try {
    // Fetch all weather-related settings
    const settings = await prisma.setting.findMany({
      where: { category: 'weather' },
    });

    // Transform into key-value object
    const weatherSettings: Record<string, string> = {};
    settings.forEach((setting) => {
      // Extract the key from the id (e.g., "weather.latitude" -> "latitude")
      const key = setting.id.replace('weather.', '');
      weatherSettings[key] = setting.value;
    });

    // Provide defaults if settings don't exist (Fort Wayne, IN)
    const response = {
      latitude: weatherSettings.latitude || '41.0793',
      longitude: weatherSettings.longitude || '-85.1394',
      location: weatherSettings.location || 'Fort Wayne, IN',
      units: (weatherSettings.units || 'fahrenheit') as 'fahrenheit' | 'celsius',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Weather Settings API] Error fetching settings:', error);

    // Return defaults on error (graceful degradation)
    return NextResponse.json({
      latitude: '41.0793',
      longitude: '-85.1394',
      location: 'Fort Wayne, IN',
      units: 'fahrenheit' as const,
    });
  }
}
