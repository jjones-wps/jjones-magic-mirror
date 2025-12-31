"use client";

import { motion } from "framer-motion";

interface WeatherIconProps {
  size?: number;
  className?: string;
}

// ============================================
// SUN ICON - Rotating rays
// ============================================
export function SunIcon({ size = 64, className = "" }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      {/* Center circle */}
      <motion.circle
        cx="32"
        cy="32"
        r="12"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Rotating rays */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "32px 32px" }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <motion.line
            key={angle}
            x1="32"
            y1="8"
            x2="32"
            y2="16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transformOrigin: "32px 32px", rotate: angle }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: angle / 360,
            }}
          />
        ))}
      </motion.g>
    </svg>
  );
}

// ============================================
// CLOUD ICON - Drifting motion
// ============================================
export function CloudIcon({ size = 64, className = "" }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      <motion.path
        d="M48 36c4.4 0 8-3.6 8-8s-3.6-8-8-8c-.4 0-.8 0-1.2.1C45.6 14.4 40.2 10 34 10c-7.2 0-13.1 5.4-13.9 12.4C14.4 23.2 10 28.2 10 34c0 6.6 5.4 12 12 12h26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        initial={{ x: -5, opacity: 0 }}
        animate={{ x: [0, 3, 0], opacity: 1 }}
        transition={{
          x: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 0.5 },
        }}
      />
    </svg>
  );
}

// ============================================
// PARTLY CLOUDY - Sun with drifting cloud
// ============================================
export function PartlyCloudyIcon({ size = 64, className = "" }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      {/* Sun behind */}
      <motion.circle
        cx="24"
        cy="24"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        style={{ opacity: 0.5 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Cloud in front */}
      <motion.path
        d="M52 40c3.3 0 6-2.7 6-6s-2.7-6-6-6c-.3 0-.6 0-.9.1C50.2 23.8 46.2 20 41 20c-5.4 0-9.8 4-10.4 9.3C26.8 30 24 33.6 24 38c0 5 4 9 9 9h19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        initial={{ x: -3 }}
        animate={{ x: [0, 2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

// ============================================
// RAIN ICON - Falling drops
// ============================================
export function RainIcon({ size = 64, className = "" }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      {/* Cloud */}
      <motion.path
        d="M48 28c3.3 0 6-2.7 6-6s-2.7-6-6-6c-.3 0-.6 0-.9.1C46.2 11.8 42.2 8 37 8c-5.4 0-9.8 4-10.4 9.3C22.8 18 20 21.6 20 26c0 5 4 9 9 9h19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Rain drops */}
      {[
        { x: 26, delay: 0 },
        { x: 34, delay: 0.3 },
        { x: 42, delay: 0.6 },
        { x: 30, delay: 0.9 },
        { x: 38, delay: 1.2 },
      ].map((drop, i) => (
        <motion.line
          key={i}
          x1={drop.x}
          y1="40"
          x2={drop.x}
          y2="48"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, 12, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: drop.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </svg>
  );
}

// ============================================
// SNOW ICON - Falling snowflakes
// ============================================
export function SnowIcon({ size = 64, className = "" }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      {/* Cloud */}
      <motion.path
        d="M48 28c3.3 0 6-2.7 6-6s-2.7-6-6-6c-.3 0-.6 0-.9.1C46.2 11.8 42.2 8 37 8c-5.4 0-9.8 4-10.4 9.3C22.8 18 20 21.6 20 26c0 5 4 9 9 9h19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Snowflakes */}
      {[
        { x: 26, delay: 0 },
        { x: 34, delay: 0.5 },
        { x: 42, delay: 1 },
        { x: 30, delay: 0.7 },
        { x: 38, delay: 0.2 },
      ].map((flake, i) => (
        <motion.g
          key={i}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [0, 16],
            opacity: [0, 1, 1, 0],
            rotate: [0, 180],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: flake.delay,
            ease: "linear",
          }}
        >
          <circle
            cx={flake.x}
            cy="42"
            r="2"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </motion.g>
      ))}
    </svg>
  );
}

// ============================================
// THUNDERSTORM ICON - Cloud with lightning
// ============================================
export function ThunderstormIcon({ size = 64, className = "" }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      {/* Cloud */}
      <path
        d="M48 28c3.3 0 6-2.7 6-6s-2.7-6-6-6c-.3 0-.6 0-.9.1C46.2 11.8 42.2 8 37 8c-5.4 0-9.8 4-10.4 9.3C22.8 18 20 21.6 20 26c0 5 4 9 9 9h19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Lightning bolt */}
      <motion.path
        d="M36 36l-4 10h6l-4 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={{ opacity: [1, 0.3, 1, 0.3, 1] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          times: [0, 0.1, 0.2, 0.3, 1],
        }}
      />
    </svg>
  );
}

// ============================================
// FOG ICON - Drifting layers
// ============================================
export function FogIcon({ size = 64, className = "" }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      {[20, 30, 40, 50].map((y, i) => (
        <motion.line
          key={i}
          x1="12"
          y1={y}
          x2="52"
          y2={y}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ x: i % 2 === 0 ? -3 : 3 }}
          animate={{ x: i % 2 === 0 ? [0, 4, 0] : [0, -4, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
          style={{ opacity: 0.3 + i * 0.15 }}
        />
      ))}
    </svg>
  );
}

// ============================================
// DRIZZLE ICON - Light rain
// ============================================
export function DrizzleIcon({ size = 64, className = "" }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      {/* Cloud */}
      <motion.path
        d="M48 28c3.3 0 6-2.7 6-6s-2.7-6-6-6c-.3 0-.6 0-.9.1C46.2 11.8 42.2 8 37 8c-5.4 0-9.8 4-10.4 9.3C22.8 18 20 21.6 20 26c0 5 4 9 9 9h19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Light drizzle drops */}
      {[
        { x: 28, delay: 0 },
        { x: 36, delay: 0.4 },
        { x: 44, delay: 0.8 },
      ].map((drop, i) => (
        <motion.circle
          key={i}
          cx={drop.x}
          cy="44"
          r="1.5"
          fill="currentColor"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, 10, 0], opacity: [0, 0.6, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: drop.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </svg>
  );
}

// ============================================
// ICON SELECTOR - Maps weather code to icon
// ============================================
interface WeatherIconSelectorProps extends WeatherIconProps {
  weatherCode: number;
}

export function WeatherIcon({ weatherCode, size = 64, className = "" }: WeatherIconSelectorProps) {
  // WMO Weather interpretation codes
  // https://open-meteo.com/en/docs

  // Clear
  if (weatherCode === 0) {
    return <SunIcon size={size} className={className} />;
  }

  // Mainly clear, partly cloudy
  if (weatherCode === 1 || weatherCode === 2) {
    return <PartlyCloudyIcon size={size} className={className} />;
  }

  // Overcast
  if (weatherCode === 3) {
    return <CloudIcon size={size} className={className} />;
  }

  // Fog
  if (weatherCode === 45 || weatherCode === 48) {
    return <FogIcon size={size} className={className} />;
  }

  // Drizzle
  if (weatherCode >= 51 && weatherCode <= 57) {
    return <DrizzleIcon size={size} className={className} />;
  }

  // Rain
  if (weatherCode >= 61 && weatherCode <= 67) {
    return <RainIcon size={size} className={className} />;
  }

  // Snow
  if (weatherCode >= 71 && weatherCode <= 77) {
    return <SnowIcon size={size} className={className} />;
  }

  // Rain showers
  if (weatherCode >= 80 && weatherCode <= 82) {
    return <RainIcon size={size} className={className} />;
  }

  // Snow showers
  if (weatherCode >= 85 && weatherCode <= 86) {
    return <SnowIcon size={size} className={className} />;
  }

  // Thunderstorm
  if (weatherCode >= 95 && weatherCode <= 99) {
    return <ThunderstormIcon size={size} className={className} />;
  }

  // Default to cloud
  return <CloudIcon size={size} className={className} />;
}
