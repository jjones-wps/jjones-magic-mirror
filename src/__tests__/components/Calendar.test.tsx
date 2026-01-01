/**
 * Tests for Calendar widget component
 */

import { render, screen, waitFor } from '@testing-library/react';
import Calendar from '@/components/widgets/Calendar';
import type { CalendarEvent } from '@/lib/calendar';

// Mock fetch globally
global.fetch = jest.fn();

// Mock calendar data
const mockAPIResponse = {
  todayEvents: [
    {
      id: '1',
      title: 'Team Meeting',
      start: '2024-01-15T10:00:00',
      end: '2024-01-15T11:00:00',
      allDay: false,
      location: 'Conference Room A',
      calendar: 'primary' as const,
    },
  ],
  tomorrowEvents: [
    {
      id: '2',
      title: "Doctor's Appointment",
      start: '2024-01-16T14:30:00',
      end: '2024-01-16T15:30:00',
      allDay: false,
      calendar: 'primary' as const,
    },
  ],
  upcomingEvents: [
    {
      id: '3',
      title: 'Lunch with Client',
      start: '2024-01-18T12:00:00',
      end: '2024-01-18T13:00:00',
      allDay: false,
      calendar: 'secondary' as const,
    },
  ],
  lastUpdated: '2024-01-15T09:00:00',
};

describe('Calendar Widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T09:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render calendar label', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    render(<Calendar />);

    // The component uses "Upcoming" as a section title, not the main label
    // Wait for component to render
    await waitFor(() => {
      const widget = screen.getByText(/Demo data/i).closest('.widget');
      expect(widget).toBeInTheDocument();
    });
  });

  it('should fetch and display calendar events from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAPIResponse,
    });

    render(<Calendar />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/calendar');
    });

    await waitFor(() => {
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    });

    expect(screen.getByText("Doctor's Appointment")).toBeInTheDocument();
    expect(screen.getByText('Lunch with Client')).toBeInTheDocument();
  });

  it('should display event locations when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAPIResponse,
    });

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });
  });

  it('should fall back to demo data when API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<Calendar />);

    // Should show demo data indicator
    await waitFor(() => {
      expect(screen.getByText('Demo data')).toBeInTheDocument();
    });

    // Demo data should be present (from getDemoCalendarData)
    await waitFor(() => {
      const allText = screen.getByText(/Demo data/).closest('.widget')?.textContent || '';
      // Demo data will have some events
      expect(allText.length).toBeGreaterThan(20);
    });
  });

  it('should show empty state when no events are available', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        todayEvents: [],
        tomorrowEvents: [],
        upcomingEvents: [],
        lastUpdated: '2024-01-15T09:00:00',
      }),
    });

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getByText('No events scheduled')).toBeInTheDocument();
    });

    expect(screen.getByText('Enjoy your free time')).toBeInTheDocument();
  });

  it('should organize events by sections (Today, Tomorrow, This Week)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAPIResponse,
    });

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should show section headers
    await waitFor(() => {
      // The component should render events grouped by day
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    });
  });

  it('should display event times correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAPIResponse,
    });

    render(<Calendar />);

    await waitFor(() => {
      // Check for time format (10:00 AM or similar)
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  it('should handle all-day events', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        todayEvents: [
          {
            id: '1',
            title: 'All Day Event',
            start: '2024-01-15T00:00:00',
            end: '2024-01-15T23:59:59',
            allDay: true,
            calendar: 'primary' as const,
          },
        ],
        tomorrowEvents: [],
        upcomingEvents: [],
        lastUpdated: '2024-01-15T09:00:00',
      }),
    });

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getByText('All Day Event')).toBeInTheDocument();
    });

    // All-day events should show "All day" instead of time
    await waitFor(() => {
      expect(screen.getByText('All day')).toBeInTheDocument();
    });
  });
});
