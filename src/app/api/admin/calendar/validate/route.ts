import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import ical from 'node-ical';

/**
 * POST /api/admin/calendar/validate
 * Validate an iCal URL before saving to database
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Try to fetch and parse the iCal feed
    try {
      const events = await ical.async.fromURL(url);
      const eventCount = Object.keys(events).filter((key) => events[key].type === 'VEVENT').length;

      return NextResponse.json({
        valid: true,
        eventCount,
        message: `Successfully parsed ${eventCount} events`,
      });
    } catch (error) {
      // iCal parsing failed
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse iCal feed';

      return NextResponse.json(
        {
          valid: false,
          error: errorMessage,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error validating calendar URL:', error);
    return NextResponse.json({ error: 'Failed to validate calendar URL' }, { status: 500 });
  }
}
