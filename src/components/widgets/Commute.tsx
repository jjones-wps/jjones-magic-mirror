'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  formatDuration,
  formatDistance,
  getTrafficLabel,
  isWorkdayMorning,
  type CommuteAPIResponse,
  type TrafficStatus,
} from '@/lib/commute';
import { opacity, staggerContainer, staggerItem } from '@/lib/tokens';

// ============================================
// CONFIGURATION
// ============================================
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ROTATION_INTERVAL = 8000; // 8 seconds between commutes
const VISIBILITY_CHECK_INTERVAL = 60 * 1000; // Check visibility every minute
const IS_DEV = process.env.NODE_ENV === 'development'; // Always show in dev mode

// ============================================
// PARSED COMMUTE DATA TYPE
// ============================================
interface ParsedCommuteData {
  name: string;
  durationMinutes: number;
  distanceMiles: number;
  trafficDelayMinutes: number;
  trafficStatus: TrafficStatus;
  suggestedDepartureTime: Date;
  targetArrivalTime: string;
}

// ============================================
// TRAFFIC BADGE COMPONENT
// ============================================
interface TrafficBadgeProps {
  status: TrafficStatus;
  delayMinutes: number;
}

function TrafficBadge({ status, delayMinutes }: TrafficBadgeProps) {
  const statusColors: Record<TrafficStatus, string> = {
    light: 'bg-white/10',
    moderate: 'bg-white/15',
    heavy: 'bg-white/20',
  };

  return (
    <div className="flex items-center gap-3">
      <span
        className={`px-3 py-1 rounded-full text-mirror-xs font-extralight ${statusColors[status]}`}
        style={{ opacity: opacity.secondary }}
      >
        {getTrafficLabel(status)}
      </span>
      {delayMinutes > 0 && (
        <span className="text-mirror-xs font-extralight" style={{ opacity: opacity.tertiary }}>
          +{Math.round(delayMinutes)} min delay
        </span>
      )}
    </div>
  );
}

// ============================================
// COMMUTE CARD COMPONENT
// ============================================
interface CommuteCardProps {
  commute: ParsedCommuteData;
}

function CommuteCard({ commute }: CommuteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Duration - Hero display */}
      <div className="flex items-baseline gap-4">
        <span className="text-mirror-3xl font-extralight font-display">
          {formatDuration(commute.durationMinutes)}
        </span>
        <span
          className="text-mirror-base font-extralight font-body"
          style={{ opacity: opacity.secondary }}
        >
          {formatDistance(commute.distanceMiles)}
        </span>
      </div>

      {/* Traffic status */}
      <TrafficBadge status={commute.trafficStatus} delayMinutes={commute.trafficDelayMinutes} />

      {/* Suggested departure */}
      <div className="text-mirror-xl font-light font-body" style={{ opacity: opacity.primary }}>
        Leave by {format(commute.suggestedDepartureTime, 'h:mm a')}
      </div>

      {/* Target arrival */}
      <div
        className="text-mirror-sm font-extralight font-body"
        style={{ opacity: opacity.tertiary }}
      >
        to arrive by {commute.targetArrivalTime.replace(/^0/, '')}
      </div>
    </motion.div>
  );
}

// ============================================
// ROTATION INDICATOR DOTS
// ============================================
interface RotationDotsProps {
  count: number;
  activeIndex: number;
}

function RotationDots({ count, activeIndex }: RotationDotsProps) {
  if (count <= 1) return null;

  return (
    <div className="flex gap-2 justify-center mt-6">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          animate={{
            backgroundColor:
              i === activeIndex ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)',
          }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// ============================================
// MAIN COMMUTE COMPONENT
// ============================================
export default function Commute() {
  const [commutes, setCommutes] = useState<ParsedCommuteData[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Check if we should be visible (workday mornings only, or always in dev mode)
  useEffect(() => {
    const checkVisibility = () => {
      setIsVisible(isWorkdayMorning(IS_DEV));
    };

    // Initial check
    checkVisibility();

    // Check periodically (skip in dev mode since it's always visible)
    if (!IS_DEV) {
      const interval = setInterval(checkVisibility, VISIBILITY_CHECK_INTERVAL);
      return () => clearInterval(interval);
    }
  }, []);

  // Fetch commute data
  useEffect(() => {
    // Don't fetch if not visible
    if (!isVisible) {
      setLoading(false);
      return;
    }

    async function loadCommute() {
      try {
        const response = await fetch('/api/commute');

        if (response.ok) {
          const data: CommuteAPIResponse = await response.json();

          // Parse dates from ISO strings
          const parsed: ParsedCommuteData[] = data.commutes.map((c) => ({
            ...c,
            suggestedDepartureTime: new Date(c.suggestedDepartureTime),
          }));

          setCommutes(parsed);
          setIsDemo(data.isDemo);
          setLastUpdated(new Date(data.lastUpdated));
        }
      } catch (error) {
        console.error('Commute fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCommute();

    // Refresh periodically
    const interval = setInterval(loadCommute, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Rotation logic
  useEffect(() => {
    if (!commutes || commutes.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % commutes.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [commutes]);

  // Don't render outside of visibility hours
  if (!isVisible) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="widget">
        <div className="label">Commute</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">
          Checking traffic...
        </div>
      </div>
    );
  }

  // No data state
  if (!commutes || commutes.length === 0) {
    return null;
  }

  const activeCommute = commutes[activeIndex];

  return (
    <motion.div className="widget" initial="initial" animate="animate" variants={staggerContainer}>
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-baseline justify-between">
        <span className="label">Commute</span>
        <span
          className="text-mirror-sm font-extralight font-body"
          style={{ opacity: opacity.tertiary }}
        >
          {activeCommute.name}&apos;s Commute
          {isDemo && ' (Demo)'}
        </span>
      </motion.div>

      {/* Rotating commute cards */}
      <motion.div variants={staggerItem} className="mt-6">
        <AnimatePresence mode="wait">
          <CommuteCard key={activeCommute.name} commute={activeCommute} />
        </AnimatePresence>
      </motion.div>

      {/* Rotation indicator */}
      <RotationDots count={commutes.length} activeIndex={activeIndex} />

      {/* Last updated */}
      {lastUpdated && (
        <motion.div variants={staggerItem} className="mt-6">
          <span
            className="text-mirror-xs font-extralight font-body"
            style={{ opacity: opacity.disabled }}
          >
            Updated {format(lastUpdated, 'h:mm a')}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
