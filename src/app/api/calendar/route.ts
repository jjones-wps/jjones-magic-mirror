/**
 * Calendar API Route
 * Fetches and parses iCal feeds server-side
 */

import { NextResponse } from "next/server";
import ical, { VEvent, CalendarComponent } from "node-ical";
import {
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
  isBefore,
  isAfter,
  format,
} from "date-fns";

// ============================================
// TYPES
// ============================================

interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string for JSON serialization
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  calendar: "primary" | "secondary";
}

interface CalendarResponse {
  todayEvents: CalendarEvent[];
  tomorrowEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  lastUpdated: string;
}

// ============================================
// HELPERS
// ============================================

function isVEvent(component: CalendarComponent): component is VEvent {
  return component.type === "VEVENT";
}

function parseICalEvent(
  event: VEvent,
  calendar: "primary" | "secondary"
): CalendarEvent | null {
  try {
    const start = event.start instanceof Date ? event.start : new Date(String(event.start));
    const end = event.end instanceof Date ? event.end : new Date(String(event.end));

    if (isNaN(start.getTime())) {
      return null;
    }

    // Determine if all-day event
    const allDay =
      event.datetype === "date" ||
      (start.getHours() === 0 &&
        start.getMinutes() === 0 &&
        end.getHours() === 0 &&
        end.getMinutes() === 0);

    return {
      id: String(event.uid || `${start.getTime()}-${event.summary}`),
      title: String(event.summary || "Untitled Event"),
      start: start.toISOString(),
      end: isNaN(end.getTime()) ? start.toISOString() : end.toISOString(),
      allDay,
      location: event.location ? String(event.location) : undefined,
      description: event.description ? String(event.description) : undefined,
      calendar,
    };
  } catch {
    return null;
  }
}

async function fetchICalFeed(
  url: string,
  calendar: "primary" | "secondary"
): Promise<CalendarEvent[]> {
  try {
    console.log(`Fetching calendar: ${calendar} from ${url.substring(0, 50)}...`);
    const data = await ical.async.fromURL(url);
    const events: CalendarEvent[] = [];

    for (const key in data) {
      const component = data[key];
      if (isVEvent(component)) {
        const event = parseICalEvent(component, calendar);
        if (event) {
          events.push(event);
        }
      }
    }

    console.log(`Found ${events.length} events from ${calendar} calendar`);
    return events;
  } catch (error) {
    console.error(`Failed to fetch calendar ${calendar}:`, error);
    return [];
  }
}

// ============================================
// API HANDLER
// ============================================

export async function GET() {
  const primaryUrl = process.env.CALENDAR_URL_PRIMARY;
  const secondaryUrl = process.env.CALENDAR_URL_SECONDARY;

  if (!primaryUrl && !secondaryUrl) {
    return NextResponse.json(
      { error: "No calendar URLs configured" },
      { status: 500 }
    );
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));
  const weekEnd = endOfDay(addDays(now, 7));

  // Fetch calendars in parallel
  const [primaryEvents, secondaryEvents] = await Promise.all([
    primaryUrl ? fetchICalFeed(primaryUrl, "primary") : Promise.resolve([]),
    secondaryUrl ? fetchICalFeed(secondaryUrl, "secondary") : Promise.resolve([]),
  ]);

  // Merge and sort all events
  const allEvents = [...primaryEvents, ...secondaryEvents]
    .filter((event) => isAfter(new Date(event.end), now))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Categorize events
  const todayEvents = allEvents.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return (
      isWithinInterval(eventStart, { start: todayStart, end: todayEnd }) ||
      (isBefore(eventStart, todayStart) && isAfter(eventEnd, todayStart))
    );
  });

  const tomorrowEvents = allEvents.filter((event) => {
    const eventStart = new Date(event.start);
    return isWithinInterval(eventStart, { start: tomorrowStart, end: tomorrowEnd });
  });

  const upcomingEvents = allEvents
    .filter((event) => {
      const eventStart = new Date(event.start);
      return isAfter(eventStart, tomorrowEnd) && isBefore(eventStart, weekEnd);
    })
    .slice(0, 5);

  const response: CalendarResponse = {
    todayEvents,
    tomorrowEvents,
    upcomingEvents,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
