"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  clockDigitVariants,
  clockDigitTransition,
  separatorPulse,
  glowBreathing,
  opacity,
} from "@/lib/tokens";

// ============================================
// GEOMETRIC RING COMPONENT
// Decorative SVG rings around the clock
// ============================================
function GeometricRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg
        viewBox="0 0 600 300"
        className="w-full h-full opacity-[0.08]"
        style={{ maxWidth: "800px" }}
      >
        {/* Outer ring */}
        <motion.ellipse
          cx="300"
          cy="150"
          rx="280"
          ry="120"
          fill="none"
          stroke="white"
          strokeWidth="0.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        {/* Middle ring */}
        <motion.ellipse
          cx="300"
          cy="150"
          rx="260"
          ry="100"
          fill="none"
          stroke="white"
          strokeWidth="0.3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
        />
        {/* Inner ring */}
        <motion.ellipse
          cx="300"
          cy="150"
          rx="240"
          ry="80"
          fill="none"
          stroke="white"
          strokeWidth="0.2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 0.6, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}

// ============================================
// TIME DIGIT COMPONENT
// Individual digit with "Waterfall of Time" animation
// ============================================
interface TimeDigitProps {
  digit: string;
  index: number;
}

function TimeDigit({ digit, index }: TimeDigitProps) {
  return (
    <div className="relative overflow-hidden h-[180px] w-[100px]">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={`${index}-${digit}`}
          variants={clockDigitVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={clockDigitTransition}
          className="absolute inset-0 flex items-center justify-center text-mirror-5xl font-extralight tracking-tight font-display"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ============================================
// TIME SEPARATOR COMPONENT
// Pulsing colon between hours and minutes
// ============================================
function TimeSeparator() {
  return (
    <motion.span
      {...separatorPulse}
      className="text-mirror-5xl font-extralight mx-2 font-display"
    >
      :
    </motion.span>
  );
}

// ============================================
// TIME-BASED GREETING
// Changes based on hour of day
// ============================================
function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

// ============================================
// 11:11 EASTER EGG DETECTION
// Special styling when time is 11:11
// ============================================
function is1111(time: Date): boolean {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  return (hours === 11 || hours === 23) && minutes === 11;
}

// ============================================
// MAIN CLOCK COMPONENT
// ============================================
export default function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial time
    setTime(new Date());

    // Update every second
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Memoize derived values
  const { hours, minutes, period, dateStr, greeting, isSpecialTime } =
    useMemo(() => {
      if (!time) {
        return {
          hours: "",
          minutes: "",
          period: "",
          dateStr: "",
          greeting: "",
          isSpecialTime: false,
        };
      }

      return {
        hours: format(time, "h"),
        minutes: format(time, "mm"),
        period: format(time, "a"),
        dateStr: format(time, "EEEE, MMMM d"),
        greeting: getGreeting(time.getHours()),
        isSpecialTime: is1111(time),
      };
    }, [time]);

  // Don't render until we have client-side time (prevents hydration mismatch)
  if (!time) {
    return (
      <div className="widget flex flex-col items-center relative">
        <div className="h-[180px]" />
        <div className="h-[48px] mt-4" />
      </div>
    );
  }

  // Pad hours for consistent width
  const hourDigits = hours.padStart(2, " ").split("");
  const minuteDigits = minutes.split("");

  return (
    <div className="widget flex flex-col items-center relative">
      {/* Geometric rings background */}
      <GeometricRings />

      {/* Time display */}
      <motion.div
        className={`flex items-center justify-center relative z-10 ${
          isSpecialTime ? "text-glow-strong" : ""
        }`}
        {...(isSpecialTime ? glowBreathing : {})}
      >
        {/* Hours */}
        <div className="flex">
          {hourDigits.map((digit, i) => (
            <TimeDigit key={`hour-${i}`} digit={digit} index={i} />
          ))}
        </div>

        {/* Separator */}
        <TimeSeparator />

        {/* Minutes */}
        <div className="flex">
          {minuteDigits.map((digit, i) => (
            <TimeDigit key={`min-${i}`} digit={digit} index={i + 2} />
          ))}
        </div>

        {/* AM/PM */}
        <motion.span
          key={period}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: opacity.secondary, x: 0 }}
          transition={{ duration: 0.3 }}
          className="text-mirror-xl font-extralight ml-4 self-end mb-8 font-body"
        >
          {period}
        </motion.span>
      </motion.div>

      {/* 11:11 Easter Egg */}
      <AnimatePresence>
        {isSpecialTime && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="absolute top-2 right-8 text-mirror-sm font-light opacity-tertiary tracking-widest uppercase"
          >
            make a wish
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date display */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-6"
      >
        <span
          className="text-mirror-xl font-extralight tracking-wide font-body"
          style={{ opacity: opacity.secondary }}
        >
          {dateStr}
        </span>
      </motion.div>

      {/* Time-based greeting */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-4"
      >
        <span
          className="text-mirror-lg font-light tracking-widest uppercase font-body"
          style={{ opacity: opacity.tertiary }}
        >
          {greeting}
        </span>
      </motion.div>
    </div>
  );
}
