/**
 * Weather API Route
 * Proxies Open-Meteo API for server-side caching
 * Fetches location from admin settings
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Default to Fort Wayne, IN
const DEFAULT_LAT = '41.0793';
const DEFAULT_LON = '-85.1394';
const DEFAULT_LOCATION = 'Fort Wayne, IN';
const DEFAULT_UNITS = 'fahrenheit';

export async function GET() {
  try {
    // Fetch weather settings from database
    const settings = await prisma.setting.findMany({
      where: { category: 'weather' },
    });

    // Transform into key-value object
    const weatherSettings: Record<string, string> = {};
    settings.forEach((setting) => {
      const key = setting.id.replace('weather.', '');
      weatherSettings[key] = setting.value;
    });

    // Use settings or fall back to defaults
    const latitude = weatherSettings.latitude || DEFAULT_LAT;
    const longitude = weatherSettings.longitude || DEFAULT_LON;
    const location = weatherSettings.location || DEFAULT_LOCATION;
    const units = (weatherSettings.units || DEFAULT_UNITS) as 'fahrenheit' | 'celsius';

    const params = new URLSearchParams({
      latitude,
      longitude,
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'wind_speed_10m',
        'weather_code',
        'is_day',
      ].join(','),
      hourly: ['temperature_2m', 'weather_code', 'precipitation_probability'].join(','),
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'weather_code',
        'precipitation_probability_max',
        'sunrise',
        'sunset',
      ].join(','),
      temperature_unit: units,
      wind_speed_unit: 'mph',
      timezone: 'America/Indiana/Indianapolis',
      forecast_days: '7',
    });

    const response = await fetch(`${OPEN_METEO_URL}?${params}`, {
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to simpler format
    const result = {
      current: {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
      },
      daily: data.daily.time.map((time: string, i: number) => ({
        date: time,
        tempHigh: Math.round(data.daily.temperature_2m_max[i]),
        tempLow: Math.round(data.daily.temperature_2m_min[i]),
        weatherCode: data.daily.weather_code[i],
        precipitationProbability: data.daily.precipitation_probability_max[i],
      })),
      location,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Weather API] Error fetching weather:', error);
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
}
