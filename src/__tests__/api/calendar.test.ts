/**
 * Tests for Calendar API route
 * @jest-environment node
 */

import { GET } from '@/app/api/calendar/route';
import { VEvent } from 'node-ical';

// Mock node-ical
jest.mock('node-ical', () => ({
  async: {
    fromURL: jest.fn(),
  },
}));

import ical from 'node-ical';
const mockFromURL = ical.async.fromURL as jest.MockedFunction<typeof ical.async.fromURL>;

describe('GET /api/calendar', () => {
  const originalEnv = {
    CALENDAR_URL_PRIMARY: process.env.CALENDAR_URL_PRIMARY,
    CALENDAR_URL_SECONDARY: process.env.CALENDAR_URL_SECONDARY,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Set current time to Jan 15, 2024 12:00 PM
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore environment variables
    Object.keys(originalEnv).forEach((key) => {
      const value = originalEnv[key as keyof typeof originalEnv];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('should return error when no calendar URLs configured', async () => {
    delete process.env.CALENDAR_URL_PRIMARY;
    delete process.env.CALENDAR_URL_SECONDARY;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'No calendar URLs configured' });
  });

  it('should fetch and parse calendar events', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    const mockIcalData = {
      event1: {
        type: 'VEVENT',
        uid: 'event-1',
        summary: 'Team Meeting',
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T15:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
    };

    mockFromURL.mockResolvedValue(mockIcalData);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.todayEvents).toHaveLength(1);
    expect(data.todayEvents[0]).toMatchObject({
      id: 'event-1',
      title: 'Team Meeting',
      allDay: false,
      calendar: 'primary',
    });
  });

  it('should categorize events into today, tomorrow, and upcoming', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    const mockIcalData = {
      todayEvent: {
        type: 'VEVENT',
        uid: 'today-1',
        summary: 'Today Event',
        start: new Date('2024-01-15T14:00:00Z'), // Today
        end: new Date('2024-01-15T15:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
      tomorrowEvent: {
        type: 'VEVENT',
        uid: 'tomorrow-1',
        summary: 'Tomorrow Event',
        start: new Date('2024-01-16T10:00:00Z'), // Tomorrow
        end: new Date('2024-01-16T11:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
      upcomingEvent: {
        type: 'VEVENT',
        uid: 'upcoming-1',
        summary: 'Upcoming Event',
        start: new Date('2024-01-18T14:00:00Z'), // Day after tomorrow
        end: new Date('2024-01-18T15:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
    };

    mockFromURL.mockResolvedValue(mockIcalData);

    const response = await GET();
    const data = await response.json();

    expect(data.todayEvents).toHaveLength(1);
    expect(data.todayEvents[0].title).toBe('Today Event');
    expect(data.tomorrowEvents).toHaveLength(1);
    expect(data.tomorrowEvents[0].title).toBe('Tomorrow Event');
    expect(data.upcomingEvents).toHaveLength(1);
    expect(data.upcomingEvents[0].title).toBe('Upcoming Event');
  });

  it('should detect all-day events correctly', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    const mockIcalData = {
      allDayEvent: {
        type: 'VEVENT',
        uid: 'allday-1',
        summary: 'All Day Event',
        start: new Date('2024-01-15T00:00:00Z'),
        end: new Date('2024-01-16T00:00:00Z'),
        datetype: 'date', // This indicates all-day event
      } as VEvent,
    };

    mockFromURL.mockResolvedValue(mockIcalData);

    const response = await GET();
    const data = await response.json();

    expect(data.todayEvents[0].allDay).toBe(true);
  });

  it('should fetch from multiple calendars in parallel', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';
    process.env.CALENDAR_URL_SECONDARY = 'https://calendar.example.com/secondary.ics';

    const mockPrimaryData = {
      event1: {
        type: 'VEVENT',
        uid: 'primary-1',
        summary: 'Primary Event',
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T15:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
    };

    const mockSecondaryData = {
      event2: {
        type: 'VEVENT',
        uid: 'secondary-1',
        summary: 'Secondary Event',
        start: new Date('2024-01-15T16:00:00Z'),
        end: new Date('2024-01-15T17:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
    };

    mockFromURL
      .mockResolvedValueOnce(mockPrimaryData)
      .mockResolvedValueOnce(mockSecondaryData);

    const response = await GET();
    const data = await response.json();

    expect(mockFromURL).toHaveBeenCalledTimes(2);
    expect(data.todayEvents).toHaveLength(2);
    expect(data.todayEvents.map((e: { calendar: string }) => e.calendar)).toContain('primary');
    expect(data.todayEvents.map((e: { calendar: string }) => e.calendar)).toContain('secondary');
  });

  it('should handle calendar fetch errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    mockFromURL.mockRejectedValue(new Error('Failed to fetch'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.todayEvents).toEqual([]);
    expect(data.tomorrowEvents).toEqual([]);
    expect(data.upcomingEvents).toEqual([]);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should filter out past events', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    const mockIcalData = {
      pastEvent: {
        type: 'VEVENT',
        uid: 'past-1',
        summary: 'Past Event',
        start: new Date('2024-01-10T14:00:00Z'),
        end: new Date('2024-01-10T15:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
      futureEvent: {
        type: 'VEVENT',
        uid: 'future-1',
        summary: 'Future Event',
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T15:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
    };

    mockFromURL.mockResolvedValue(mockIcalData);

    const response = await GET();
    const data = await response.json();

    const allEventTitles = [
      ...data.todayEvents,
      ...data.tomorrowEvents,
      ...data.upcomingEvents,
    ].map((e: { title: string }) => e.title);

    expect(allEventTitles).not.toContain('Past Event');
    expect(allEventTitles).toContain('Future Event');
  });

  it('should sort events by start time', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    const mockIcalData = {
      event1: {
        type: 'VEVENT',
        uid: 'event-1',
        summary: 'Later Event',
        start: new Date('2024-01-15T16:00:00Z'),
        end: new Date('2024-01-15T17:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
      event2: {
        type: 'VEVENT',
        uid: 'event-2',
        summary: 'Earlier Event',
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T15:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
    };

    mockFromURL.mockResolvedValue(mockIcalData);

    const response = await GET();
    const data = await response.json();

    expect(data.todayEvents[0].title).toBe('Earlier Event');
    expect(data.todayEvents[1].title).toBe('Later Event');
  });

  it('should include location and description when available', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    const mockIcalData = {
      event: {
        type: 'VEVENT',
        uid: 'event-1',
        summary: 'Team Meeting',
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T15:00:00Z'),
        location: 'Conference Room A',
        description: 'Weekly team sync',
        datetype: 'date-time',
      } as VEvent,
    };

    mockFromURL.mockResolvedValue(mockIcalData);

    const response = await GET();
    const data = await response.json();

    expect(data.todayEvents[0].location).toBe('Conference Room A');
    expect(data.todayEvents[0].description).toBe('Weekly team sync');
  });

  it('should handle events without uid', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    const mockIcalData = {
      event: {
        type: 'VEVENT',
        summary: 'Event without UID',
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T15:00:00Z'),
        datetype: 'date-time',
      } as VEvent,
    };

    mockFromURL.mockResolvedValue(mockIcalData);

    const response = await GET();
    const data = await response.json();

    expect(data.todayEvents).toHaveLength(1);
    expect(data.todayEvents[0].id).toBeDefined();
  });

  it('should limit upcoming events to 5', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    const mockIcalData: Record<string, VEvent> = {};
    for (let i = 0; i < 10; i++) {
      mockIcalData[`event${i}`] = {
        type: 'VEVENT',
        uid: `event-${i}`,
        summary: `Event ${i}`,
        start: new Date(`2024-01-${17 + i}T14:00:00Z`), // All after tomorrow
        end: new Date(`2024-01-${17 + i}T15:00:00Z`),
        datetype: 'date-time',
      } as VEvent;
    }

    mockFromURL.mockResolvedValue(mockIcalData);

    const response = await GET();
    const data = await response.json();

    expect(data.upcomingEvents.length).toBeLessThanOrEqual(5);
  });

  it('should include lastUpdated timestamp', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    mockFromURL.mockResolvedValue({});

    const before = new Date();
    const response = await GET();
    const data = await response.json();
    const after = new Date();

    const lastUpdated = new Date(data.lastUpdated);
    expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should handle events spanning multiple days', async () => {
    process.env.CALENDAR_URL_PRIMARY = 'https://calendar.example.com/primary.ics';

    const mockIcalData = {
      spanningEvent: {
        type: 'VEVENT',
        uid: 'spanning-1',
        summary: 'Multi-day Event',
        start: new Date('2024-01-14T20:00:00Z'), // Started yesterday
        end: new Date('2024-01-15T14:00:00Z'), // Ends today
        datetype: 'date-time',
      } as VEvent,
    };

    mockFromURL.mockResolvedValue(mockIcalData);

    const response = await GET();
    const data = await response.json();

    // Should appear in today's events even though it started yesterday
    expect(data.todayEvents).toHaveLength(1);
    expect(data.todayEvents[0].title).toBe('Multi-day Event');
  });
});
