import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

/**
 * AI Summary Settings API
 *
 * Manage which context data is passed to the AI summary generator.
 *
 * NOTE: This is a feature stub. Settings are persisted to the database
 * but not yet consumed by /api/summary/route.ts. Full implementation
 * requires updating the summary route to conditionally include context
 * based on these settings.
 */

interface AISummarySettings {
  includeWeatherLocation: boolean;
  includeFeelsLike: boolean;
  includeWindSpeed: boolean;
  includePrecipitation: boolean;
  includeTomorrowWeather: boolean;
  includeCalendar: boolean;
  includeEventTimes: boolean;
  includeTimeUntilNext: boolean;
  includeAllDayEvents: boolean;
  includeCommute: boolean;
  includeCommuteDeviation: boolean;
  includeDayDate: boolean;
  includeWeekendDetection: boolean;
}

const DEFAULT_SETTINGS: AISummarySettings = {
  includeWeatherLocation: true,
  includeFeelsLike: true,
  includeWindSpeed: true,
  includePrecipitation: true,
  includeTomorrowWeather: true,
  includeCalendar: true,
  includeEventTimes: true,
  includeTimeUntilNext: true,
  includeAllDayEvents: true,
  includeCommute: true,
  includeCommuteDeviation: true,
  includeDayDate: true,
  includeWeekendDetection: true,
};

/**
 * GET /api/admin/ai-summary
 * Fetch AI summary settings
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.setting.findMany({
      where: { category: 'ai-summary' },
    });

    // Transform database settings into typed object
    const settingsMap: Record<string, string> = {};
    settings.forEach((setting) => {
      const key = setting.id.replace('ai-summary.', '');
      settingsMap[key] = setting.value;
    });

    // Build response with defaults for missing values
    const response: AISummarySettings = {
      includeWeatherLocation: settingsMap.includeWeatherLocation === 'true',
      includeFeelsLike: settingsMap.includeFeelsLike === 'true',
      includeWindSpeed: settingsMap.includeWindSpeed === 'true',
      includePrecipitation: settingsMap.includePrecipitation === 'true',
      includeTomorrowWeather: settingsMap.includeTomorrowWeather === 'true',
      includeCalendar: settingsMap.includeCalendar === 'true',
      includeEventTimes: settingsMap.includeEventTimes === 'true',
      includeTimeUntilNext: settingsMap.includeTimeUntilNext === 'true',
      includeAllDayEvents: settingsMap.includeAllDayEvents === 'true',
      includeCommute: settingsMap.includeCommute === 'true',
      includeCommuteDeviation: settingsMap.includeCommuteDeviation === 'true',
      includeDayDate: settingsMap.includeDayDate === 'true',
      includeWeekendDetection: settingsMap.includeWeekendDetection === 'true',
    };

    // If no settings exist, return defaults
    if (settings.length === 0) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching AI summary settings:', error);
    return NextResponse.json({ error: 'Failed to fetch AI summary settings' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/ai-summary
 * Update AI summary settings
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AISummarySettings = await request.json();

    // Validate that all required fields are present
    const requiredFields: (keyof AISummarySettings)[] = [
      'includeWeatherLocation',
      'includeFeelsLike',
      'includeWindSpeed',
      'includePrecipitation',
      'includeTomorrowWeather',
      'includeCalendar',
      'includeEventTimes',
      'includeTimeUntilNext',
      'includeAllDayEvents',
      'includeCommute',
      'includeCommuteDeviation',
      'includeDayDate',
      'includeWeekendDetection',
    ];

    for (const field of requiredFields) {
      if (typeof body[field] !== 'boolean') {
        return NextResponse.json(
          { error: `Missing or invalid field: ${field}. All fields must be boolean.` },
          { status: 400 }
        );
      }
    }

    // Convert settings to database format
    const settingsToUpdate = Object.entries(body).map(([key, value]) => ({
      id: `ai-summary.${key}`,
      value: value.toString(),
    }));

    // Upsert all settings
    await Promise.all(
      settingsToUpdate.map((setting) =>
        prisma.setting.upsert({
          where: { id: setting.id },
          update: { value: setting.value },
          create: {
            id: setting.id,
            category: 'ai-summary',
            value: setting.value,
          },
        })
      )
    );

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'ai-summary.update',
        category: 'ai-summary',
        userId: session.user.id,
        details: JSON.stringify(body),
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
    console.error('Error updating AI summary settings:', error);
    return NextResponse.json({ error: 'Failed to update AI summary settings' }, { status: 500 });
  }
}
