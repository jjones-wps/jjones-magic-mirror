'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fetchWeather, getWeatherShort, type WeatherData, type DailyForecast } from '@/lib/weather';
import { opacity, staggerContainer, staggerItem, fadeInUp } from '@/lib/tokens';
import { WeatherIcon } from './WeatherIcons';

// ============================================
// CONFIGURATION
// ============================================
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

interface WeatherSettings {
  latitude: string;
  longitude: string;
  location: string;
  units: 'fahrenheit' | 'celsius';
}

// ============================================
// ANIMATED NUMBER COMPONENT
// Smooth transitions when values change
// ============================================
interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  className?: string;
}

function AnimatedNumber({ value, suffix = '', className = '' }: AnimatedNumberProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={className}
      >
        {value}
        {suffix}
      </motion.span>
    </AnimatePresence>
  );
}

// ============================================
// FORECAST DAY COMPONENT
// ============================================
interface ForecastDayProps {
  day: DailyForecast;
  isToday: boolean;
}

function ForecastDay({ day, isToday }: ForecastDayProps) {
  const dayName = isToday ? 'Today' : format(day.date, 'EEE');

  return (
    <motion.div
      variants={staggerItem}
      className={`flex items-center justify-between py-3 px-3 -mx-3 rounded ${
        isToday ? 'bg-white/[0.03]' : ''
      }`}
      style={{
        opacity: isToday ? opacity.hero : opacity.secondary,
      }}
    >
      {/* Day name */}
      <span className={`text-mirror-base w-16 font-body ${isToday ? 'font-normal' : 'font-light'}`}>
        {dayName}
      </span>

      {/* Weather icon */}
      <div className={`w-10 flex justify-center ${isToday ? 'scale-110' : ''}`}>
        <WeatherIcon weatherCode={day.weatherCode} size={28} />
      </div>

      {/* Precipitation probability */}
      <span
        className="text-mirror-sm font-extralight w-12 text-center font-body"
        style={{
          opacity: day.precipitationProbability > 20 ? opacity.secondary : opacity.disabled,
        }}
      >
        {day.precipitationProbability > 0 ? `${day.precipitationProbability}%` : ''}
      </span>

      {/* High / Low temps */}
      <div className="flex items-baseline gap-3 w-24 justify-end">
        <span className={`text-mirror-base font-body ${isToday ? 'font-normal' : 'font-light'}`}>
          {day.tempHigh}°
        </span>
        <span
          className="text-mirror-sm font-extralight font-body"
          style={{ opacity: opacity.tertiary }}
        >
          {day.tempLow}°
        </span>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN WEATHER COMPONENT
// ============================================
export default function Weather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [settings, setSettings] = useState<WeatherSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch weather settings from admin API
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/weather/settings');
        if (!response.ok) {
          throw new Error('Failed to fetch weather settings');
        }
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        console.error('[Weather] Error fetching settings:', err);
        // Use defaults if settings fetch fails
        setSettings({
          latitude: '41.0793',
          longitude: '-85.1394',
          location: 'Fort Wayne, IN',
          units: 'fahrenheit',
        });
      }
    }

    loadSettings();
  }, []);

  // Fetch weather data using settings
  useEffect(() => {
    if (!settings) return; // Wait for settings to load

    async function loadWeather() {
      if (!settings) return; // Guard against null settings

      try {
        const lat = parseFloat(settings.latitude);
        const lon = parseFloat(settings.longitude);
        const data = await fetchWeather(lat, lon, settings.location);
        setWeather(data);
        setError(null);
      } catch (err) {
        setError('Unable to load weather');
        console.error('[Weather] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    // Initial load
    loadWeather();

    // Set up refresh interval
    const interval = setInterval(loadWeather, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [settings]); // Re-fetch when settings change

  // Loading state
  if (loading) {
    return (
      <div className="widget">
        <div className="label">Weather</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error || !weather) {
    return (
      <div className="widget">
        <div className="label">Weather</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">
          {error || 'Weather unavailable'}
        </div>
      </div>
    );
  }

  const condition = getWeatherShort(weather.current.weatherCode);
  const today = new Date();

  return (
    <motion.div className="widget" initial="initial" animate="animate" variants={staggerContainer}>
      {/* Header row: Label + Location */}
      <div className="flex items-baseline justify-between">
        <span className="label">Weather</span>
        <motion.span
          {...fadeInUp}
          className="text-mirror-sm font-extralight font-body"
          style={{ opacity: opacity.tertiary }}
        >
          {weather.location}
        </motion.span>
      </div>

      {/* Current conditions */}
      <motion.div variants={staggerItem} className="mt-6 flex items-start gap-6">
        {/* Animated weather icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-shrink-0"
          style={{ opacity: opacity.primary }}
        >
          <WeatherIcon weatherCode={weather.current.weatherCode} size={80} />
        </motion.div>

        {/* Large temperature */}
        <div className="flex items-start">
          <span className="text-mirror-4xl font-extralight font-display leading-none">
            <AnimatedNumber value={weather.current.temperature} />
          </span>
          <span
            className="text-mirror-2xl font-extralight font-display mt-2"
            style={{ opacity: opacity.secondary }}
          >
            °
          </span>
        </div>

        {/* Condition + details */}
        <div className="flex flex-col justify-center pt-2">
          <motion.span
            variants={staggerItem}
            className="text-mirror-xl font-light font-body"
            style={{ opacity: opacity.primary }}
          >
            {condition}
          </motion.span>

          <motion.div variants={staggerItem} className="mt-2 flex items-center gap-4">
            <span
              className="text-mirror-sm font-extralight font-body"
              style={{ opacity: opacity.tertiary }}
            >
              Feels {weather.current.feelsLike}°
            </span>
            <span
              className="text-mirror-sm font-extralight font-body"
              style={{ opacity: opacity.tertiary }}
            >
              {weather.current.humidity}% humidity
            </span>
          </motion.div>

          {/* Sunrise/Sunset */}
          {weather.daily && weather.daily.length > 0 && weather.daily[0].sunrise && (
            <motion.div variants={staggerItem} className="mt-2 flex items-center gap-4">
              <span
                className="text-mirror-sm font-extralight font-body"
                style={{ opacity: opacity.tertiary }}
              >
                ↑ {format(new Date(weather.daily[0].sunrise), 'h:mm a')}
              </span>
              <span
                className="text-mirror-sm font-extralight font-body"
                style={{ opacity: opacity.tertiary }}
              >
                ↓ {format(new Date(weather.daily[0].sunset), 'h:mm a')}
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* 7-day forecast */}
      <motion.div variants={staggerItem} className="mt-6">
        <div
          className="text-mirror-xs font-normal tracking-widest uppercase mb-4 font-body"
          style={{ opacity: opacity.tertiary }}
        >
          7-Day Forecast
        </div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          {weather.daily.slice(0, 7).map((day) => {
            const isToday = format(day.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            return <ForecastDay key={day.date.toISOString()} day={day} isToday={isToday} />;
          })}
        </motion.div>
      </motion.div>

      {/* Last updated */}
      <motion.div variants={staggerItem} className="mt-6">
        <span
          className="text-mirror-xs font-extralight font-body"
          style={{ opacity: opacity.disabled }}
        >
          Updated {format(weather.lastUpdated, 'h:mm a')}
        </span>
      </motion.div>
    </motion.div>
  );
}
