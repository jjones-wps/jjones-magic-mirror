/**
 * Catholic Feast Day API Route
 * Uses romcal to calculate liturgical calendar data
 */

import { NextResponse } from 'next/server';
import { Calendar } from 'romcal';

interface FeastDayResponse {
  feastDay: string | null;
  season: string | null;
  color: string | null;
  rank: string | null;
  lastUpdated: string;
}

// Romcal calendar entry type (subset of fields we use)
interface RomcalEntry {
  moment?: string;
  name?: string;
  type?: string;
  data?: {
    season?: { value?: string };
    meta?: { liturgicalColor?: { key?: string } };
  };
}

export async function GET() {
  try {
    const today = new Date();
    const year = today.getFullYear();

    // Generate calendar for this year with US national calendar
    const calendar = Calendar.calendarFor({
      year,
      country: 'unitedStates',
      locale: 'en',
    });

    // Find today's entry - romcal uses 'moment' field for date
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const todayEntry = calendar.find((entry: RomcalEntry) => {
      const entryDate = entry.moment?.split('T')[0];
      return entryDate === todayStr;
    });

    if (!todayEntry) {
      return NextResponse.json({
        feastDay: null,
        season: null,
        color: null,
        rank: null,
        lastUpdated: new Date().toISOString(),
      });
    }

    const result: FeastDayResponse = {
      feastDay: todayEntry.name || null,
      season: todayEntry.data?.season?.value || null,
      color: todayEntry.data?.meta?.liturgicalColor?.key?.toLowerCase() || null,
      rank: formatRank(todayEntry.type) || null,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Feast day calculation error:', error);

    return NextResponse.json({
      feastDay: null,
      season: null,
      color: null,
      rank: null,
      lastUpdated: new Date().toISOString(),
    });
  }
}

function formatRank(type: string | null | undefined): string | null {
  if (!type) return null;

  const rankMap: Record<string, string> = {
    SOLEMNITY: 'Solemnity',
    FEAST: 'Feast',
    MEMORIAL: 'Memorial',
    OPT_MEMORIAL: 'Optional Memorial',
    COMMEMORATION: 'Commemoration',
    FERIA: 'Weekday',
  };

  return rankMap[type] || type;
}
