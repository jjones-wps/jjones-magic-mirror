'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { opacity } from '@/lib/tokens';

// Poll interval in milliseconds (30 seconds)
const POLL_INTERVAL = 30 * 1000;

// In dev mode, auto-refresh every 60 seconds to pick up changes
const DEV_REFRESH_INTERVAL = 60 * 1000;

// Grace period before refresh to let animations complete (2 seconds)
const REFRESH_DELAY = 2000;

interface VersionResponse {
  buildTime: string;
  timestamp: number;
}

export default function VersionChecker() {
  const [isUpdating, setIsUpdating] = useState(false);
  const initialBuildTime = useRef<string | null>(null);

  useEffect(() => {
    let devRefreshTimeout: NodeJS.Timeout | null = null;

    async function checkVersion() {
      try {
        const response = await fetch('/api/version');
        if (!response.ok) return;

        const data: VersionResponse = await response.json();

        // First check - store the initial build time
        if (initialBuildTime.current === null) {
          initialBuildTime.current = data.buildTime;
          console.log(`[VersionChecker] Initial build: ${data.buildTime}`);

          // In dev mode, set up periodic refresh (page reloads, so this re-triggers)
          if (data.buildTime === 'development') {
            console.log(
              `[VersionChecker] Dev mode - auto-refresh in ${DEV_REFRESH_INTERVAL / 1000}s`
            );
            devRefreshTimeout = setTimeout(() => {
              window.location.reload();
            }, DEV_REFRESH_INTERVAL);
          }
          return;
        }

        // Subsequent checks - compare versions (production mode)
        if (data.buildTime !== initialBuildTime.current) {
          console.log(
            `[VersionChecker] New version detected: ${data.buildTime} (was: ${initialBuildTime.current})`
          );
          setIsUpdating(true);

          // Wait for the update indicator to show, then refresh
          setTimeout(() => {
            window.location.reload();
          }, REFRESH_DELAY);
        }
      } catch (error) {
        console.error('[VersionChecker] Failed to check version:', error);
      }
    }

    // Initial check
    checkVersion();

    // Set up polling interval
    const interval = setInterval(checkVersion, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
      if (devRefreshTimeout) clearTimeout(devRefreshTimeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {isUpdating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-50"
        >
          <div
            className="px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm"
            style={{ opacity: opacity.secondary }}
          >
            <span className="text-mirror-sm font-light tracking-wide font-body">Updating...</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
