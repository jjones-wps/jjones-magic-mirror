/**
 * Apple Calendar / iCal Integration
 * Calendar types and utilities (client-safe)
 *
 * Note: Actual iCal fetching must be done server-side via API routes
 * since node-ical requires Node.js APIs
 */

import { isToday, isTomorrow, startOfDay, addDays, format } from 'date-fns';

// ============================================
// TYPES
// ============================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  description?: string;
  calendar: 'primary' | 'secondary';
}

export interface CalendarData {
  todayEvents: CalendarEvent[];
  tomorrowEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  lastUpdated: Date;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format event time for display
 */
export function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day';
  }
  return format(event.start, 'h:mm a');
}

/**
 * Format event date for upcoming section
 */
export function formatEventDate(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

/**
 * Get relative day label
 */
export function getDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE');
}

// ============================================
// DEMO DATA (for development without calendars)
// ============================================

export function getDemoCalendarData(): CalendarData {
  const now = new Date();
  const today = startOfDay(now);

  return {
    todayEvents: [
      {
        id: '1',
        title: 'Morning Standup',
        start: new Date(today.getTime() + 9 * 60 * 60 * 1000),
        end: new Date(today.getTime() + 9.5 * 60 * 60 * 1000),
        allDay: false,
        calendar: 'primary',
      },
      {
        id: '2',
        title: 'Lunch with Sarah',
        start: new Date(today.getTime() + 12 * 60 * 60 * 1000),
        end: new Date(today.getTime() + 13 * 60 * 60 * 1000),
        allDay: false,
        location: 'Olive Garden',
        calendar: 'secondary',
      },
      {
        id: '3',
        title: 'Kids Soccer Practice',
        start: new Date(today.getTime() + 17 * 60 * 60 * 1000),
        end: new Date(today.getTime() + 18 * 60 * 60 * 1000),
        allDay: false,
        location: 'Shoaff Park',
        calendar: 'primary',
      },
    ],
    tomorrowEvents: [
      {
        id: '4',
        title: 'Team Meeting',
        start: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
        allDay: false,
        calendar: 'primary',
      },
      {
        id: '5',
        title: 'Date Night',
        start: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 22 * 60 * 60 * 1000),
        allDay: false,
        calendar: 'secondary',
      },
    ],
    upcomingEvents: [
      {
        id: '6',
        title: 'Dentist Appointment',
        start: addDays(today, 3),
        end: addDays(today, 3),
        allDay: false,
        calendar: 'primary',
      },
      {
        id: '7',
        title: 'Family Dinner',
        start: addDays(today, 5),
        end: addDays(today, 5),
        allDay: true,
        calendar: 'secondary',
      },
    ],
    lastUpdated: new Date(),
  };
}
