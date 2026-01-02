'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { opacity } from '@/lib/tokens';

// ============================================
// TYPES
// ============================================
interface SpotifyData {
  isPlaying: boolean;
  configured: boolean;
  type?: 'track' | 'podcast';
  title?: string;
  artist?: string;
  album?: string;
  show?: string;
  imageUrl?: string;
  progress?: number;
  duration?: number;
}

// ============================================
// CONFIGURATION
// ============================================
const REFRESH_INTERVAL = 15 * 1000; // 15 seconds - balanced for Pi performance

// ============================================
// ANIMATED BARS COMPONENT
// Visualizer-style bars
// ============================================
function PlayingBars() {
  return (
    <div className="flex items-end gap-[3px] h-4">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-white rounded-full"
          animate={{
            height: ['40%', '100%', '60%', '80%', '40%'],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// PROGRESS BAR COMPONENT
// ============================================
interface ProgressBarProps {
  progress: number;
  duration: number;
}

function ProgressBar({ progress, duration }: ProgressBarProps) {
  const percentage = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-white/40 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

// ============================================
// FORMAT TIME HELPER
// ============================================
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// MAIN SPOTIFY COMPONENT
// ============================================
export default function Spotify() {
  const [data, setData] = useState<SpotifyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNowPlaying() {
      try {
        const response = await fetch('/api/spotify/now-playing');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Spotify fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchNowPlaying();

    // Refresh more frequently when playing
    const interval = setInterval(fetchNowPlaying, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="widget">
        <div className="label">Now Playing</div>
        <div className="mt-4 text-mirror-base font-extralight opacity-disabled">Loading...</div>
      </div>
    );
  }

  // Not configured
  if (!data?.configured) {
    return null; // Don't show widget if Spotify isn't set up
  }

  // Nothing playing
  if (!data.isPlaying) {
    return (
      <motion.div
        className="widget"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="label">Now Playing</div>
        <motion.div
          className="mt-4 flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: opacity.tertiary, y: 0 }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="10" y1="15" x2="10" y2="9" />
            <line x1="14" y1="15" x2="14" y2="9" />
          </svg>
          <span className="text-mirror-base font-extralight font-body">Nothing playing</span>
        </motion.div>
      </motion.div>
    );
  }

  // Playing state
  return (
    <motion.div
      className="widget"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header with playing indicator */}
      <div className="flex items-center gap-3">
        <span className="label">Now Playing</span>
        <PlayingBars />
      </div>

      {/* Track info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={data.title}
          className="mt-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Title */}
          <div
            className="text-mirror-xl font-light font-body truncate"
            style={{ opacity: opacity.primary }}
          >
            {data.title}
          </div>

          {/* Artist or Show */}
          <div
            className="text-mirror-base font-extralight font-body mt-1 truncate"
            style={{ opacity: opacity.secondary }}
          >
            {data.type === 'podcast' ? data.show : data.artist}
          </div>

          {/* Album (for tracks only) */}
          {data.type === 'track' && data.album && (
            <div
              className="text-mirror-sm font-extralight font-body mt-1 truncate"
              style={{ opacity: opacity.tertiary }}
            >
              {data.album}
            </div>
          )}

          {/* Progress bar */}
          {data.progress !== undefined && data.duration !== undefined && (
            <div className="mt-4">
              <ProgressBar progress={data.progress} duration={data.duration} />
              <div className="flex justify-between mt-1">
                <span
                  className="text-mirror-xs font-extralight font-body"
                  style={{ opacity: opacity.disabled }}
                >
                  {formatTime(data.progress)}
                </span>
                <span
                  className="text-mirror-xs font-extralight font-body"
                  style={{ opacity: opacity.disabled }}
                >
                  {formatTime(data.duration)}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
