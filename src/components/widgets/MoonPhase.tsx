'use client';

/**
 * Moon Phase Widget (STUB)
 *
 * Displays current moon phase with high-resolution imagery.
 *
 * IMPLEMENTATION STATUS: Feature stub - UI skeleton only
 *
 * TODO for full implementation:
 * 1. Create /api/moon-phase route to calculate current moon phase
 * 2. Source ultra high-res moon phase images (see MOON_PHASE_IMAGES.md)
 * 3. Implement moon phase calculation algorithm
 * 4. Add moon illumination percentage
 * 5. Add next full/new moon dates
 * 6. Add moonrise/moonset times
 *
 * RESOURCES:
 * - NASA SVS Moon Phase Visualizations: https://svs.gsfc.nasa.gov/cgi-bin/details.cgi?aid=4874
 * - Moon phase algorithm: https://www.subsystems.us/uploads/9/8/9/4/98948044/moonphase.pdf
 * - USNO Data Services: https://aa.usno.navy.mil/data/api
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { opacity, staggerContainer, staggerItem } from '@/lib/tokens';

// ============================================
// TYPES
// ============================================

interface MoonPhaseData {
  phaseName: string; // "New Moon", "Waxing Crescent", "First Quarter", etc.
  illumination: number; // 0-100 percentage
  age: number; // Days since new moon (0-29.53)
  nextFullMoon: string; // ISO date string
  nextNewMoon: string; // ISO date string
  moonrise?: string; // HH:MM format
  moonset?: string; // HH:MM format
}

// ============================================
// MOON PHASE COMPONENT (STUB)
// ============================================

export default function MoonPhase() {
  const [moonData, setMoonData] = useState<MoonPhaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Replace with actual API call when implemented
    // Mock data for demonstration
    const mockData: MoonPhaseData = {
      phaseName: 'Waxing Gibbous',
      illumination: 73,
      age: 10.5,
      nextFullMoon: '2026-01-15T12:00:00Z',
      nextNewMoon: '2026-01-30T05:30:00Z',
      moonrise: '3:42 PM',
      moonset: '5:18 AM',
    };

    setTimeout(() => {
      setMoonData(mockData);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="widget">
        <div className="label">Moon Phase</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">Loading...</div>
      </div>
    );
  }

  if (error || !moonData) {
    return (
      <div className="widget">
        <div className="label">Moon Phase</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">
          {error || 'Data unavailable'}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="widget" initial="initial" animate="animate" variants={staggerContainer}>
      <span className="label">Moon Phase</span>

      {/* Feature Stub Notice */}
      <motion.div
        variants={staggerItem}
        className="mt-4 px-3 py-2 rounded"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          className="text-mirror-xs font-extralight font-body"
          style={{ opacity: opacity.tertiary }}
        >
          ⚠️ Feature stub - mock data shown
        </div>
      </motion.div>

      {/* Moon Phase Display Area */}
      <motion.div variants={staggerItem} className="mt-6 flex items-start gap-6">
        {/* Moon Image Placeholder */}
        <div
          className="flex-shrink-0 rounded-full"
          style={{
            width: '80px',
            height: '80px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: opacity.secondary,
          }}
        >
          <span className="text-mirror-sm font-extralight">🌖</span>
        </div>

        {/* Moon Phase Info */}
        <div className="flex flex-col gap-2">
          <motion.span
            variants={staggerItem}
            className="text-mirror-xl font-light font-body"
            style={{ opacity: opacity.primary }}
          >
            {moonData.phaseName}
          </motion.span>

          <motion.div variants={staggerItem} className="flex items-center gap-4">
            <span
              className="text-mirror-sm font-extralight font-body"
              style={{ opacity: opacity.tertiary }}
            >
              {moonData.illumination}% illuminated
            </span>
          </motion.div>

          {/* Moonrise/Moonset */}
          {moonData.moonrise && moonData.moonset && (
            <motion.div variants={staggerItem} className="mt-1 flex items-center gap-4">
              <span
                className="text-mirror-sm font-extralight font-body"
                style={{ opacity: opacity.tertiary }}
              >
                ↑ {moonData.moonrise}
              </span>
              <span
                className="text-mirror-sm font-extralight font-body"
                style={{ opacity: opacity.tertiary }}
              >
                ↓ {moonData.moonset}
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Next Phase Dates */}
      <motion.div variants={staggerItem} className="mt-6">
        <div
          className="text-mirror-xs font-normal tracking-widest uppercase mb-3 font-body"
          style={{ opacity: opacity.tertiary }}
        >
          Upcoming
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span
              className="text-mirror-sm font-extralight font-body"
              style={{ opacity: opacity.secondary }}
            >
              Full Moon
            </span>
            <span
              className="text-mirror-sm font-extralight font-body"
              style={{ opacity: opacity.tertiary }}
            >
              {new Date(moonData.nextFullMoon).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-mirror-sm font-extralight font-body"
              style={{ opacity: opacity.secondary }}
            >
              New Moon
            </span>
            <span
              className="text-mirror-sm font-extralight font-body"
              style={{ opacity: opacity.tertiary }}
            >
              {new Date(moonData.nextNewMoon).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
