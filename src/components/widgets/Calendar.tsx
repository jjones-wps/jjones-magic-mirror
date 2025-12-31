"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isAfter } from "date-fns";
import {
  getDemoCalendarData,
  formatEventTime,
  type CalendarData,
  type CalendarEvent,
} from "@/lib/calendar";
import { opacity, staggerContainer, staggerItem } from "@/lib/tokens";

// ============================================
// CONFIGURATION
// ============================================
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ============================================
// API RESPONSE TYPE
// ============================================
interface CalendarAPIResponse {
  todayEvents: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    location?: string;
    calendar: "primary" | "secondary";
  }>;
  tomorrowEvents: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    location?: string;
    calendar: "primary" | "secondary";
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    location?: string;
    calendar: "primary" | "secondary";
  }>;
  lastUpdated: string;
}

function parseAPIResponse(data: CalendarAPIResponse): CalendarData {
  const parseEvents = (events: CalendarAPIResponse["todayEvents"]): CalendarEvent[] =>
    events.map((e) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
    }));

  return {
    todayEvents: parseEvents(data.todayEvents),
    tomorrowEvents: parseEvents(data.tomorrowEvents),
    upcomingEvents: parseEvents(data.upcomingEvents),
    lastUpdated: new Date(data.lastUpdated),
  };
}

// ============================================
// EVENT ITEM COMPONENT
// ============================================
interface EventItemProps {
  event: CalendarEvent;
  showTime?: boolean;
  isPast?: boolean;
}

function EventItem({ event, showTime = true, isPast = false }: EventItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isPast ? opacity.disabled : 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-4 py-3"
    >
      {/* Calendar indicator dot */}
      <div
        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
          event.calendar === "primary" ? "bg-white" : "bg-white/50"
        }`}
        style={{ opacity: opacity.secondary }}
      />

      {/* Event details */}
      <div className="flex-1 min-w-0">
        <div className="text-mirror-base font-light font-body truncate">
          {event.title}
        </div>

        {event.location && (
          <div
            className="text-mirror-sm font-extralight font-body mt-1 truncate"
            style={{ opacity: opacity.tertiary }}
          >
            {event.location}
          </div>
        )}
      </div>

      {/* Time */}
      {showTime && (
        <div
          className="text-mirror-sm font-extralight font-body text-right flex-shrink-0"
          style={{ opacity: opacity.secondary }}
        >
          {formatEventTime(event)}
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// EVENT SECTION COMPONENT
// ============================================
interface EventSectionProps {
  title: string;
  events: CalendarEvent[];
  showDate?: boolean;
}

function EventSection({ title, events, showDate = false }: EventSectionProps) {
  const now = new Date();

  if (events.length === 0) {
    return null;
  }

  return (
    <motion.div variants={staggerItem} className="mt-6 first:mt-0">
      <div
        className="text-mirror-xs font-normal tracking-widest uppercase mb-2 font-body"
        style={{ opacity: opacity.tertiary }}
      >
        {title}
      </div>

      <AnimatePresence mode="popLayout">
        {events.map((event) => {
          const isPast = isAfter(now, event.end);
          return (
            <div key={event.id}>
              {showDate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: opacity.disabled }}
                  className="text-mirror-xs font-extralight font-body mt-4 first:mt-0"
                >
                  {format(event.start, "EEE, MMM d")}
                </motion.div>
              )}
              <EventItem event={event} isPast={isPast} />
            </div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================
function EmptyState() {
  return (
    <motion.div
      variants={staggerItem}
      className="mt-6 py-8 text-center"
      style={{ opacity: opacity.tertiary }}
    >
      <div className="text-mirror-base font-extralight font-body">
        No events scheduled
      </div>
      <div className="text-mirror-sm font-extralight font-body mt-2">
        Enjoy your free time
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN CALENDAR COMPONENT
// ============================================
export default function Calendar() {
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    async function loadCalendar() {
      try {
        // Try to fetch from API
        const response = await fetch("/api/calendar");

        if (response.ok) {
          const data: CalendarAPIResponse = await response.json();
          setCalendar(parseAPIResponse(data));
          setIsDemo(false);
        } else {
          // Fall back to demo data
          console.warn("Calendar API failed, using demo data");
          setCalendar(getDemoCalendarData());
          setIsDemo(true);
        }
      } catch (error) {
        console.error("Calendar fetch error:", error);
        setCalendar(getDemoCalendarData());
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    }

    loadCalendar();

    // Refresh calendar data periodically
    const interval = setInterval(loadCalendar, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="widget">
        <div className="label">Calendar</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">
          Loading...
        </div>
      </div>
    );
  }

  // No data state
  if (!calendar) {
    return (
      <div className="widget">
        <div className="label">Calendar</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">
          Calendar unavailable
        </div>
      </div>
    );
  }

  const hasNoEvents =
    calendar.todayEvents.length === 0 &&
    calendar.tomorrowEvents.length === 0 &&
    calendar.upcomingEvents.length === 0;

  return (
    <motion.div
      className="widget"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <span className="label">Calendar</span>
        <motion.span
          variants={staggerItem}
          className="text-mirror-sm font-extralight font-body"
          style={{ opacity: opacity.tertiary }}
        >
          {format(new Date(), "MMMM d")}
        </motion.span>
      </div>

      {hasNoEvents ? (
        <EmptyState />
      ) : (
        <>
          {/* Today's events */}
          <EventSection title="Today" events={calendar.todayEvents} />

          {/* Tomorrow's events */}
          <EventSection title="Tomorrow" events={calendar.tomorrowEvents} />

          {/* Upcoming events */}
          <EventSection
            title="This Week"
            events={calendar.upcomingEvents}
            showDate
          />
        </>
      )}

      {/* Last updated */}
      <motion.div variants={staggerItem} className="mt-6">
        <span
          className="text-mirror-xs font-extralight font-body"
          style={{ opacity: opacity.disabled }}
        >
          {isDemo ? "Demo data" : `Updated ${format(calendar.lastUpdated, "h:mm a")}`}
        </span>
      </motion.div>
    </motion.div>
  );
}
