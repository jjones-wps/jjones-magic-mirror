/**
 * Open-Meteo Weather API Service
 * Free, no API key required, 10k calls/day
 */

// ============================================
// TYPES
// ============================================

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
}

export interface HourlyForecast {
  time: Date;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
}

export interface DailyForecast {
  date: Date;
  tempHigh: number;
  tempLow: number;
  weatherCode: number;
  precipitationProbability: number;
  sunrise: Date;
  sunset: Date;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  location: string;
  lastUpdated: Date;
}

// ============================================
// WMO WEATHER CODES
// https://open-meteo.com/en/docs
// ============================================

export const weatherDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// Short descriptions for compact display
export const weatherShort: Record<number, string> = {
  0: "Clear",
  1: "Clear",
  2: "Cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  56: "Ice",
  57: "Ice",
  61: "Rain",
  63: "Rain",
  65: "Heavy Rain",
  66: "Ice",
  67: "Ice",
  71: "Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow",
  80: "Showers",
  81: "Showers",
  82: "Storms",
  85: "Snow",
  86: "Snow",
  95: "Thunder",
  96: "Thunder",
  99: "Thunder",
};

// ============================================
// API FUNCTIONS
// ============================================

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export async function fetchWeather(
  lat: number,
  lon: number,
  location: string
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "wind_speed_10m",
      "weather_code",
      "is_day",
    ].join(","),
    hourly: [
      "temperature_2m",
      "weather_code",
      "precipitation_probability",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "weather_code",
      "precipitation_probability_max",
      "sunrise",
      "sunset",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "America/Indiana/Indianapolis",
    forecast_days: "7",
  });

  const response = await fetch(`${OPEN_METEO_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  // Parse current weather
  const current: CurrentWeather = {
    temperature: Math.round(data.current.temperature_2m),
    feelsLike: Math.round(data.current.apparent_temperature),
    humidity: data.current.relative_humidity_2m,
    windSpeed: Math.round(data.current.wind_speed_10m),
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day === 1,
  };

  // Parse hourly forecast (next 24 hours)
  const now = new Date();
  const hourly: HourlyForecast[] = data.hourly.time
    .map((time, i) => ({
      time: new Date(time),
      temperature: Math.round(data.hourly.temperature_2m[i]),
      weatherCode: data.hourly.weather_code[i],
      precipitationProbability: data.hourly.precipitation_probability[i],
    }))
    .filter((h) => h.time > now)
    .slice(0, 24);

  // Parse daily forecast
  const daily: DailyForecast[] = data.daily.time.map((time, i) => ({
    date: new Date(time),
    tempHigh: Math.round(data.daily.temperature_2m_max[i]),
    tempLow: Math.round(data.daily.temperature_2m_min[i]),
    weatherCode: data.daily.weather_code[i],
    precipitationProbability: data.daily.precipitation_probability_max[i],
    sunrise: new Date(data.daily.sunrise[i]),
    sunset: new Date(data.daily.sunset[i]),
  }));

  return {
    current,
    hourly,
    daily,
    location,
    lastUpdated: new Date(),
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getWeatherDescription(code: number): string {
  return weatherDescriptions[code] || "Unknown";
}

export function getWeatherShort(code: number): string {
  return weatherShort[code] || "Unknown";
}

/**
 * Determine if weather is "good" for display styling
 */
export function isGoodWeather(code: number): boolean {
  return code <= 3; // Clear, mainly clear, partly cloudy, overcast
}

/**
 * Determine if precipitation is expected
 */
export function hasPrecipitation(code: number): boolean {
  return code >= 51; // Anything drizzle or above
}
