/**
 * Weather API Route
 * Proxies Open-Meteo API for server-side caching
 */

import { NextResponse } from 'next/server';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Default to Fort Wayne, IN
const DEFAULT_LAT = process.env.WEATHER_LAT || '41.0793';
const DEFAULT_LON = process.env.WEATHER_LON || '-85.1394';

export async function GET() {
  try {
    const params = new URLSearchParams({
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
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
      temperature_unit: 'fahrenheit',
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
      location: process.env.WEATHER_LOCATION || 'Fort Wayne, IN',
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
}
