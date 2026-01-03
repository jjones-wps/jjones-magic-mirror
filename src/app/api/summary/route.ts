/**
 * AI Summary API Route
 * Generates a personalized daily briefing
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { AIBehaviorSettings } from '@/lib/ai-behavior';
import { DEFAULT_AI_BEHAVIOR, fetchAIBehaviorSettings } from '@/lib/ai-behavior';

// ============================================
// TYPES
// ============================================

interface SummaryResponse {
  greeting: string;
  summary: string;
  tip?: string;
  lastUpdated: string;
}

// Context data types for AI summary generation
interface WeatherCurrent {
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  windSpeed: number;
}

interface WeatherDaily {
  date: string;
  tempHigh: number;
  tempLow: number;
  weatherCode: number;
  precipitationProbability: number;
}

interface WeatherData {
  location?: string;
  current?: WeatherCurrent;
  daily?: WeatherDaily[];
}

interface CalendarEvent {
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  allDay: boolean;
}

interface CalendarData {
  todayEvents?: CalendarEvent[];
  tomorrowEvents?: CalendarEvent[];
}

interface CommuteRoute {
  name: string;
  durationMinutes: number;
  trafficDelayMinutes: number;
  trafficStatus: 'light' | 'moderate' | 'heavy';
}

interface CommuteData {
  commutes?: CommuteRoute[];
}

interface ContextData {
  weather: WeatherData | null;
  calendar: CalendarData | null;
  commute: CommuteData | null;
}

interface AISummarySettings {
  // Weather context toggles
  includeWeatherLocation: boolean;
  includeFeelsLike: boolean;
  includeWindSpeed: boolean;
  includePrecipitation: boolean;
  includeTomorrowWeather: boolean;

  // Calendar context toggles
  includeCalendar: boolean;
  includeEventTimes: boolean;
  includeTimeUntilNext: boolean;
  includeAllDayEvents: boolean;

  // Commute context toggles
  includeCommute: boolean;
  includeCommuteDeviation: boolean;

  // Time context toggles
  includeDayDate: boolean;
  includeWeekendDetection: boolean;
}

const DEFAULT_SETTINGS: AISummarySettings = {
  includeWeatherLocation: true,
  includeFeelsLike: true,
  includeWindSpeed: true,
  includePrecipitation: true,
  includeTomorrowWeather: true,
  includeCalendar: true,
  includeEventTimes: true,
  includeTimeUntilNext: true,
  includeAllDayEvents: true,
  includeCommute: true,
  includeCommuteDeviation: true,
  includeDayDate: true,
  includeWeekendDetection: true,
};

// ============================================
// HELPER: Get time-based greeting
// ============================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

// ============================================
// HELPER: Fetch current data for context
// ============================================

async function fetchContextData(baseUrl: string): Promise<ContextData> {
  const [weatherRes, calendarRes, commuteRes] = await Promise.all([
    fetch(`${baseUrl}/api/weather`).catch(() => null),
    fetch(`${baseUrl}/api/calendar`).catch(() => null),
    fetch(`${baseUrl}/api/commute`).catch(() => null),
  ]);

  return {
    weather: weatherRes?.ok ? await weatherRes.json() : null,
    calendar: calendarRes?.ok ? await calendarRes.json() : null,
    commute: commuteRes?.ok ? await commuteRes.json() : null,
  };
}

// ============================================
// HELPER: Fetch AI Summary settings
// ============================================

async function fetchAISummarySettings(): Promise<AISummarySettings> {
  try {
    const settings = await prisma.setting.findMany({
      where: { category: 'ai-summary' },
    });

    // If no settings exist, return defaults
    if (settings.length === 0) {
      return DEFAULT_SETTINGS;
    }

    // Transform database settings into typed object
    const settingsMap: Record<string, string> = {};
    settings.forEach((setting) => {
      const key = setting.id.replace('ai-summary.', '');
      settingsMap[key] = setting.value;
    });

    // Build response with defaults for missing values
    return {
      includeWeatherLocation: settingsMap.includeWeatherLocation !== 'false',
      includeFeelsLike: settingsMap.includeFeelsLike !== 'false',
      includeWindSpeed: settingsMap.includeWindSpeed !== 'false',
      includePrecipitation: settingsMap.includePrecipitation !== 'false',
      includeTomorrowWeather: settingsMap.includeTomorrowWeather !== 'false',
      includeCalendar: settingsMap.includeCalendar !== 'false',
      includeEventTimes: settingsMap.includeEventTimes !== 'false',
      includeTimeUntilNext: settingsMap.includeTimeUntilNext !== 'false',
      includeAllDayEvents: settingsMap.includeAllDayEvents !== 'false',
      includeCommute: settingsMap.includeCommute !== 'false',
      includeCommuteDeviation: settingsMap.includeCommuteDeviation !== 'false',
      includeDayDate: settingsMap.includeDayDate !== 'false',
      includeWeekendDetection: settingsMap.includeWeekendDetection !== 'false',
    };
  } catch (error) {
    console.error('Error fetching AI summary settings, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
}

// ============================================
// HELPER: Generate template-based summary
// ============================================

function generateTemplateSummary(context: ContextData): string {
  const parts: string[] = [];

  // Weather summary
  if (context.weather?.current) {
    const { temperature, weatherCode } = context.weather.current;
    const conditions = getWeatherDescription(weatherCode);
    parts.push(`It's ${temperature}° and ${conditions.toLowerCase()} outside.`);

    // Check for precipitation in forecast
    const precipProb = context.weather.daily?.[0]?.precipitationProbability;
    if (precipProb !== undefined && precipProb > 50) {
      parts.push(`There's a ${precipProb}% chance of precipitation today.`);
    }
  }

  // Calendar summary
  const todayEvents = context.calendar?.todayEvents ?? [];
  if (todayEvents.length > 0) {
    const count = todayEvents.length;
    if (count === 1) {
      parts.push(`You have 1 event on your calendar today: ${todayEvents[0].title}.`);
    } else {
      parts.push(`You have ${count} events on your calendar today.`);
    }
  } else {
    parts.push('Your calendar is clear today.');
  }

  // Add a contextual tip based on conditions
  if (context.weather?.current) {
    const tip = getContextualTip(context.weather.current, todayEvents.length);
    if (tip) parts.push(tip);
  }

  return parts.join(' ');
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Rain showers',
    82: 'Heavy showers',
    95: 'Thunderstorms',
  };
  return descriptions[code] || 'Variable conditions';
}

function getPrecipitationType(code: number): string {
  // Snow codes: 71-77, 85-86
  if (code >= 71 && code <= 77) return 'snow';
  if (code === 85 || code === 86) return 'snow showers';

  // Rain codes: 51-67, 80-82
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 80 && code <= 82) return 'rain';

  // Thunderstorms: 95-99
  if (code >= 95) return 'thunderstorms';

  // Freezing rain/drizzle: 56-57, 66-67
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'freezing rain';

  return 'precipitation';
}

function getContextualTip(weather: WeatherCurrent, eventCount: number): string | null {
  const tips: string[] = [];

  // Weather-based tips
  if (weather.weatherCode >= 61 && weather.weatherCode <= 67) {
    tips.push("Don't forget an umbrella if you're heading out.");
  }
  if (weather.weatherCode >= 71 && weather.weatherCode <= 77) {
    tips.push('Roads may be slick — drive carefully.');
  }
  if (weather.temperature < 32) {
    tips.push("Bundle up, it's freezing out there.");
  }
  if (weather.temperature > 85) {
    tips.push('Stay hydrated in this heat.');
  }

  // Busy day tip
  if (eventCount >= 4) {
    tips.push('Busy day ahead — pace yourself.');
  }

  // Clear day tip
  if (eventCount === 0 && weather.weatherCode <= 2) {
    tips.push('Perfect day to get outside and enjoy the weather.');
  }

  return tips.length > 0 ? tips[Math.floor(Math.random() * tips.length)] : null;
}

// ============================================
// HELPER: Build AI system prompt
// ============================================

function buildSystemPrompt(context: ContextData, aiBehavior: AIBehaviorSettings): string {
  const parts: string[] = [];

  // Base role (ALWAYS INCLUDED)
  parts.push('You are a helpful assistant for a smart mirror display.');

  // Verbosity instruction (from settings.verbosity)
  if (aiBehavior.verbosity === 'low') {
    parts.push('Be extremely brief - essential facts only.');
  } else if (aiBehavior.verbosity === 'high') {
    parts.push('Provide detailed, descriptive summaries.');
  } else {
    parts.push('Generate a brief, friendly daily briefing in 2-3 sentences.');
  }

  // Tone instruction (from settings.tone)
  if (aiBehavior.tone === 'formal') {
    parts.push('Use professional, formal language.');
  } else {
    parts.push('Be warm but concise.');
  }

  // Humor level (from settings.humorLevel)
  if (aiBehavior.humorLevel === 'playful') {
    parts.push('Add light humor and playful comparisons where appropriate.');
  } else if (aiBehavior.humorLevel === 'subtle') {
    parts.push('Use subtle wordplay occasionally.');
  }
  // none = no instruction

  // Time-based tone override
  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 17;

  if (isMorning && aiBehavior.morningTone === 'energizing') {
    parts.push('Be energizing and action-focused for the morning ahead.');
  } else if (!isMorning && aiBehavior.eveningTone === 'calming') {
    parts.push('Be reflective and calming for the evening.');
  }

  // Stress-aware mode
  const todayEvents = context.calendar?.todayEvents ?? [];
  if (aiBehavior.stressAwareEnabled && todayEvents.length >= 5) {
    parts.push('The user has a very busy day. Use encouraging language and avoid adding pressure.');
  }

  // Celebration mode
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  if (aiBehavior.celebrationModeEnabled && isWeekend) {
    parts.push("It's the weekend - use an upbeat, celebratory tone!");
  }

  // User names
  if (aiBehavior.userNames.length > 0) {
    const names = aiBehavior.userNames.join(' and ');
    parts.push(`Address the user(s) by name: ${names}`);
  }

  // Custom instructions (appended with reduced priority)
  if (aiBehavior.customInstructions) {
    parts.push(`Additional context: ${aiBehavior.customInstructions}`);
  }

  // ALWAYS exclude emojis
  parts.push("Don't use emojis.");

  return parts.join(' ');
}

// ============================================
// OPENROUTER LLM INTEGRATION
// ============================================

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Build model-specific request parameters
 * Different providers support different parameters:
 * - Anthropic Claude: temperature OR top_p (not both), no presence/frequency_penalty
 * - Google Gemini: All parameters supported
 * - OpenAI GPT: All parameters supported
 */
function buildModelParams(behaviorSettings: AIBehaviorSettings) {
  const isAnthropic = behaviorSettings.model.includes('anthropic/');

  const baseParams: Record<string, unknown> = {
    model: behaviorSettings.model,
    max_tokens: behaviorSettings.maxTokens,
  };

  // Anthropic: Only temperature OR top_p (prefer temperature)
  // Claude models reject requests with both parameters
  if (isAnthropic) {
    baseParams.temperature = behaviorSettings.temperature;
    // top_p omitted for Anthropic to avoid API errors
    // presence_penalty and frequency_penalty not supported by Anthropic
  } else {
    // OpenAI and Gemini support all parameters
    baseParams.temperature = behaviorSettings.temperature;
    baseParams.top_p = behaviorSettings.topP;
    baseParams.presence_penalty = behaviorSettings.presencePenalty;
    baseParams.frequency_penalty = 1.5; // ALWAYS 1.5, not user-configurable
  }

  // Stop sequences supported by all providers
  if (behaviorSettings.stopSequences.length > 0) {
    baseParams.stop = behaviorSettings.stopSequences;
  }

  return baseParams;
}

async function generateAISummary(
  context: ContextData,
  summarySettings: AISummarySettings,
  behaviorSettings: AIBehaviorSettings
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null; // Fall back to template
  }

  try {
    const prompt = buildPrompt(context, summarySettings);
    const systemPrompt = buildSystemPrompt(context, behaviorSettings);

    const requestBody = {
      ...buildModelParams(behaviorSettings),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: prompt },
      ],
    };

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3002',
        'X-Title': 'Magic Mirror',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`AI summary generated using ${behaviorSettings.model}`);
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('AI summary error:', error);
    return null;
  }
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function buildPrompt(context: ContextData, settings: AISummarySettings): string {
  const now = new Date();
  const timeOfDay = getTimeOfDay();
  const hour = now.getHours();
  const isEvening = hour >= 17;
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const isWeekdayMorning = !isWeekend && hour >= 6 && hour <= 9;

  // Day and date context (if enabled)
  let briefingIntro = `Generate a brief ${timeOfDay} briefing`;
  if (settings.includeDayDate) {
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    briefingIntro += ` for ${dayName}, ${dateStr}`;
  }
  briefingIntro += ' based on:';

  const parts: string[] = [briefingIntro];

  // Weekend detection (if enabled)
  if (settings.includeWeekendDetection && isWeekend) {
    parts.push(`Note: It's the weekend!`);
  }

  // Weather context
  if (context.weather?.current) {
    const { temperature, feelsLike, weatherCode, windSpeed } = context.weather.current;
    const conditions = getWeatherDescription(weatherCode);

    // Build weather line with conditional parts
    let weatherLine = `Weather`;

    // Add location if enabled
    if (settings.includeWeatherLocation) {
      const location = context.weather.location || 'your location';
      weatherLine += ` in ${location}`;
    }

    weatherLine += `: ${temperature}°F, ${conditions}`;

    // Add feels-like if enabled and differs by more than 5 degrees
    if (settings.includeFeelsLike && Math.abs(temperature - feelsLike) > 5) {
      weatherLine += ` (feels like ${feelsLike}°F)`;
    }

    // Add wind if enabled and noteworthy (>15mph)
    if (settings.includeWindSpeed && windSpeed > 15) {
      weatherLine += `, winds at ${windSpeed}mph`;
    }

    parts.push(weatherLine);

    // Precipitation probability with type (if enabled)
    if (
      settings.includePrecipitation &&
      context.weather.daily &&
      context.weather.daily.length > 0
    ) {
      const todayForecast = context.weather.daily[0];
      if (todayForecast.precipitationProbability >= 30) {
        const precipType = getPrecipitationType(todayForecast.weatherCode);
        parts.push(`${todayForecast.precipitationProbability}% chance of ${precipType} today`);
      }
    }

    // Tomorrow's weather (if enabled and evening briefing)
    if (
      settings.includeTomorrowWeather &&
      isEvening &&
      context.weather.daily &&
      context.weather.daily.length > 1
    ) {
      const tomorrow = context.weather.daily[1];
      parts.push(`Tomorrow: High ${tomorrow.tempHigh}°F, Low ${tomorrow.tempLow}°F`);
    }
  }

  // Calendar context (if enabled)
  if (
    settings.includeCalendar &&
    context.calendar?.todayEvents &&
    context.calendar.todayEvents.length > 0
  ) {
    const events = context.calendar.todayEvents.slice(0, 5);
    const eventLines: string[] = [];

    events.forEach((event) => {
      // All-day events (if enabled)
      if (event.allDay) {
        if (settings.includeAllDayEvents) {
          eventLines.push(`${event.title} (all day)`);
        } else {
          // If all-day events disabled, just show title without time
          eventLines.push(event.title);
        }
      } else {
        // Timed events
        let eventStr = event.title;

        // Add event times if enabled
        if (settings.includeEventTimes) {
          const startTime = new Date(event.start);
          const timeStr = startTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });

          // Add time-until urgency if enabled
          if (settings.includeTimeUntilNext) {
            const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursUntil > 0 && hoursUntil < 3) {
              const minutesUntil = Math.round(hoursUntil * 60);
              eventStr += ` at ${timeStr} (in ${minutesUntil} min)`;
            } else {
              eventStr += ` at ${timeStr}`;
            }
          } else {
            eventStr += ` at ${timeStr}`;
          }
        }

        eventLines.push(eventStr);
      }
    });

    if (eventLines.length > 0) {
      parts.push(`Today's schedule:\n${eventLines.map((e) => `- ${e}`).join('\n')}`);
    }
  } else if (settings.includeCalendar) {
    parts.push('No events scheduled today.');
  }

  // Commute intelligence (if enabled and weekday morning)
  if (
    settings.includeCommute &&
    isWeekdayMorning &&
    context.commute?.commutes &&
    context.commute.commutes.length > 0
  ) {
    const primaryCommute = context.commute.commutes[0];
    const baselineMinutes = 22; // TODO: Make this configurable or calculated
    const currentMinutes = primaryCommute.durationMinutes;
    const deviation = currentMinutes - baselineMinutes;

    // Show deviation alerts if enabled
    if (settings.includeCommuteDeviation && Math.abs(deviation) >= 3) {
      if (deviation > 0) {
        parts.push(
          `Traffic alert: Your commute is running ${Math.round(deviation)} minutes longer than usual (${currentMinutes} min total)`
        );
      } else {
        parts.push(
          `Good news: Traffic is light! Your commute is about ${Math.abs(Math.round(deviation))} minutes faster than usual (${currentMinutes} min)`
        );
      }
    } else {
      // Normal traffic - always show duration if commute is enabled
      parts.push(`Commute time: ${currentMinutes} minutes with current traffic`);
    }
  }

  return parts.join('\n\n');
}

// ============================================
// API HANDLER
// ============================================

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  // Fetch settings and context data in parallel
  const [summarySettings, behaviorSettings, context] = await Promise.all([
    fetchAISummarySettings(),
    fetchAIBehaviorSettings(),
    fetchContextData(origin),
  ]);

  // Try AI summary first, fall back to template
  let summary = await generateAISummary(context, summarySettings, behaviorSettings);

  if (!summary) {
    summary = generateTemplateSummary(context);
  }

  const response: SummaryResponse = {
    greeting: getGreeting(),
    summary,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
