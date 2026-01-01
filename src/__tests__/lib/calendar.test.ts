/**
 * Tests for calendar utility functions
 */

import type { CalendarEvent } from '@/lib/calendar';

describe('Calendar Utilities', () => {
  describe('CalendarEvent type', () => {
    it('should allow valid event structure', () => {
      const event: CalendarEvent = {
        id: '1',
        title: 'Test Event',
        start: new Date('2024-01-15T10:00:00'),
        end: new Date('2024-01-15T11:00:00'),
        allDay: false,
      };

      expect(event.id).toBe('1');
      expect(event.title).toBe('Test Event');
      expect(event.allDay).toBe(false);
    });

    it('should allow optional location field', () => {
      const event: CalendarEvent = {
        id: '1',
        title: 'Test Event',
        start: new Date('2024-01-15T10:00:00'),
        end: new Date('2024-01-15T11:00:00'),
        allDay: false,
        location: 'Conference Room',
      };

      expect(event.location).toBe('Conference Room');
    });

    it('should allow all-day events', () => {
      const event: CalendarEvent = {
        id: '1',
        title: 'All Day Event',
        start: new Date('2024-01-15T00:00:00'),
        end: new Date('2024-01-15T23:59:59'),
        allDay: true,
      };

      expect(event.allDay).toBe(true);
    });
  });

  describe('Event time calculations', () => {
    it('should correctly identify upcoming events', () => {
      const now = new Date('2024-01-15T09:00:00');
      const futureEvent = new Date('2024-01-15T10:00:00');
      const pastEvent = new Date('2024-01-15T08:00:00');

      expect(futureEvent > now).toBe(true);
      expect(pastEvent < now).toBe(true);
    });

    it('should calculate event duration', () => {
      const start = new Date('2024-01-15T10:00:00');
      const end = new Date('2024-01-15T11:30:00');
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = durationMs / (1000 * 60);

      expect(durationMinutes).toBe(90);
    });
  });
});
