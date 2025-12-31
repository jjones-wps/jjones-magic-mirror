"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { opacity, staggerContainer, staggerItem } from "@/lib/tokens";

// ============================================
// CONFIGURATION
// ============================================
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

// ============================================
// API RESPONSE TYPE
// ============================================
interface SummaryAPIResponse {
  greeting: string;
  summary: string;
  tip?: string;
  lastUpdated: string;
}

// ============================================
// TYPEWRITER EFFECT COMPONENT
// ============================================
interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

function Typewriter({ text, speed = 30, onComplete }: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText("");
    setIsComplete(false);

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        onComplete?.();
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-[2px] h-[1em] bg-white/60 ml-1 align-middle"
        />
      )}
    </span>
  );
}

// ============================================
// MAIN AI SUMMARY COMPONENT
// ============================================
export default function AISummary() {
  const [summary, setSummary] = useState<SummaryAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTypewriter, setShowTypewriter] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch("/api/summary");

        if (response.ok) {
          const data: SummaryAPIResponse = await response.json();
          setSummary(data);
          setShowTypewriter(true); // Reset typewriter on new data
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Summary fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadSummary();

    // Refresh summary periodically
    const interval = setInterval(loadSummary, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="widget">
        <div className="label">Daily Briefing</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">
          Preparing your briefing...
        </div>
      </div>
    );
  }

  // Error state
  if (error || !summary) {
    return (
      <div className="widget">
        <div className="label">Daily Briefing</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">
          Unable to generate briefing
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="widget"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <span className="label">Daily Briefing</span>
        <motion.span
          variants={staggerItem}
          className="text-mirror-sm font-extralight font-body"
          style={{ opacity: opacity.tertiary }}
        >
          {format(new Date(summary.lastUpdated), "h:mm a")}
        </motion.span>
      </div>

      {/* Summary with typewriter effect */}
      <motion.div variants={staggerItem} className="mt-6">
        <p
          className="text-mirror-lg font-light font-body leading-relaxed"
          style={{ opacity: opacity.primary }}
        >
          {showTypewriter ? (
            <Typewriter
              text={summary.summary}
              speed={25}
              onComplete={() => setShowTypewriter(false)}
            />
          ) : (
            summary.summary
          )}
        </p>
      </motion.div>

      {/* Optional tip */}
      {summary.tip && (
        <motion.div
          variants={staggerItem}
          className="mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <p
            className="text-mirror-base font-extralight font-body italic"
            style={{ opacity: opacity.secondary }}
          >
            {summary.tip}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
