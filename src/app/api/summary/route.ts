/**
 * AI Summary API Route
 * Generates a personalized daily briefing
 */

import { NextResponse } from "next/server";

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
  weatherCode: number;
}

interface WeatherData {
  current?: WeatherCurrent;
  daily?: Array<{
    precipitationProbability?: number;
  }>;
}

interface CalendarEvent {
  title: string;
}

interface CalendarData {
  todayEvents?: CalendarEvent[];
}

interface NewsArticle {
  title: string;
  description?: string;
}

interface NewsData {
  articles?: NewsArticle[];
}

interface ContextData {
  weather: WeatherData | null;
  calendar: CalendarData | null;
  news: NewsData | null;
}

// ============================================
// HELPER: Get time-based greeting
// ============================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

// ============================================
// HELPER: Fetch current data for context
// ============================================

async function fetchContextData(baseUrl: string): Promise<ContextData> {
  const [weatherRes, calendarRes, newsRes] = await Promise.all([
    fetch(`${baseUrl}/api/weather`).catch(() => null),
    fetch(`${baseUrl}/api/calendar`).catch(() => null),
    fetch(`${baseUrl}/api/news`).catch(() => null),
  ]);

  return {
    weather: weatherRes?.ok ? await weatherRes.json() : null,
    calendar: calendarRes?.ok ? await calendarRes.json() : null,
    news: newsRes?.ok ? await newsRes.json() : null,
  };
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
    parts.push("Your calendar is clear today.");
  }

  // Add a contextual tip based on conditions
  if (context.weather?.current) {
    const tip = getContextualTip(context.weather.current, todayEvents.length);
    if (tip) parts.push(tip);
  }

  return parts.join(" ");
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Foggy",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy showers",
    95: "Thunderstorms",
  };
  return descriptions[code] || "Variable conditions";
}

function getContextualTip(weather: WeatherCurrent, eventCount: number): string | null {
  const tips: string[] = [];

  // Weather-based tips
  if (weather.weatherCode >= 61 && weather.weatherCode <= 67) {
    tips.push("Don't forget an umbrella if you're heading out.");
  }
  if (weather.weatherCode >= 71 && weather.weatherCode <= 77) {
    tips.push("Roads may be slick — drive carefully.");
  }
  if (weather.temperature < 32) {
    tips.push("Bundle up, it's freezing out there.");
  }
  if (weather.temperature > 85) {
    tips.push("Stay hydrated in this heat.");
  }

  // Busy day tip
  if (eventCount >= 4) {
    tips.push("Busy day ahead — pace yourself.");
  }

  // Clear day tip
  if (eventCount === 0 && weather.weatherCode <= 2) {
    tips.push("Perfect day to get outside and enjoy the weather.");
  }

  return tips.length > 0 ? tips[Math.floor(Math.random() * tips.length)] : null;
}

// ============================================
// OPENROUTER LLM INTEGRATION
// ============================================

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku";

async function generateAISummary(context: ContextData): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null; // Fall back to template
  }

  try {
    const prompt = buildPrompt(context);

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3002",
        "X-Title": "Magic Mirror",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant for a smart mirror display. Generate a brief, friendly daily briefing in 2-3 sentences. Be warm but concise. Don't use emojis.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`AI summary generated using ${DEFAULT_MODEL}`);
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("AI summary error:", error);
    return null;
  }
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function buildPrompt(context: ContextData): string {
  const timeOfDay = getTimeOfDay();
  const parts: string[] = [`Generate a brief ${timeOfDay} briefing based on:`];

  if (context.weather?.current) {
    parts.push(
      `Weather: ${context.weather.current.temperature}°F, ${getWeatherDescription(context.weather.current.weatherCode)}`
    );
  }

  if (context.calendar?.todayEvents && context.calendar.todayEvents.length > 0) {
    const events = context.calendar.todayEvents
      .slice(0, 3)
      .map((e: CalendarEvent) => e.title)
      .join(", ");
    parts.push(`Today's events: ${events}`);
  } else {
    parts.push("No events scheduled today.");
  }

  if (context.news?.articles && context.news.articles.length > 0) {
    const newsItems = context.news.articles
      .slice(0, 3)
      .map((a: NewsArticle) => {
        const desc = a.description ? ` - ${a.description}` : "";
        return `• ${a.title}${desc}`;
      })
      .join("\n");
    parts.push(`Top news:\n${newsItems}`);
  }

  return parts.join("\n");
}

// ============================================
// API HANDLER
// ============================================

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  // Fetch context data
  const context = await fetchContextData(origin);

  // Try AI summary first, fall back to template
  let summary = await generateAISummary(context);

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
