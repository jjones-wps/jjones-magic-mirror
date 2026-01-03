# Magic Mirror API Documentation

**Last Updated:** January 3, 2026
**Version:** 0.2.0
**Base URL:** `http://localhost:3000` (development) or `http://192.168.1.213:3000` (production Pi)

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Public API Routes](#public-api-routes)
  - [GET /api/calendar](#get-apicalendar)
  - [GET /api/commute](#get-apicommute)
  - [GET /api/config-version](#get-apiconfig-version)
  - [GET /api/feast-day](#get-apifeast-day)
  - [GET /api/news](#get-apinews)
  - [GET /api/spotify/now-playing](#get-apispotifynow-playing)
  - [GET /api/summary](#get-apisummary)
  - [GET /api/version](#get-apiversion)
  - [GET /api/weather](#get-apiweather)
- [Admin API Routes](#admin-api-routes)
  - [System Management](#system-management)
    - [GET /api/admin/settings](#get-apiadminsettings)
    - [PUT /api/admin/settings](#put-apiadminsettings)
    - [POST /api/admin/settings](#post-apiadminsettings)
    - [GET /api/admin/widgets](#get-apiadminwidgets)
    - [PUT /api/admin/widgets](#put-apiadminwidgets)
    - [GET /api/admin/mirror/status](#get-apiadminmirrorstatus)
    - [POST /api/admin/mirror/status](#post-apiadminmirrorstatus)
    - [POST /api/admin/mirror/refresh](#post-apiadminmirrorrefresh)
  - [Feature Configuration](#feature-configuration)
    - [GET /api/admin/weather](#get-apiadminweather)
    - [PUT /api/admin/weather](#put-apiadminweather)
    - [GET /api/admin/ai-summary](#get-apiadminai-summary)
    - [PUT /api/admin/ai-summary](#put-apiadminai-summary)
    - [GET /api/admin/ai-behavior](#get-apiadminai-behavior)
    - [PUT /api/admin/ai-behavior](#put-apiadminai-behavior)
  - [Calendar Management](#calendar-management)
    - [GET /api/admin/calendar](#get-apiadmincalendar)
    - [POST /api/admin/calendar](#post-apiadmincalendar)
    - [PUT /api/admin/calendar](#put-apiadmincalendar)
    - [DELETE /api/admin/calendar/:id](#delete-apiadmincalendarid)
    - [POST /api/admin/calendar/validate](#post-apiadmincalendarvalidate)
  - [Commute Management](#commute-management)
    - [GET /api/admin/commute](#get-apiadmincommute)
    - [POST /api/admin/commute](#post-apiadmincommute)
    - [PUT /api/admin/commute](#put-apiadmincommute)
    - [DELETE /api/admin/commute/:id](#delete-apiadmincommuteid)
  - [Utilities](#utilities)
    - [GET /api/admin/geocode/search](#get-apiadmingeocodesearch)
- [OAuth Routes](#oauth-routes)
  - [GET /api/spotify/authorize](#get-apispotifyauthorize)
  - [GET /api/spotify/callback](#get-apispotifycallback)
- [Error Codes](#error-codes)
- [Rate Limiting & Caching](#rate-limiting--caching)
- [TypeScript Usage Examples](#typescript-usage-examples)

---

## Overview

The Magic Mirror API provides server-side data fetching and caching for all widget data displayed on the mirror. All routes use Next.js App Router patterns and return JSON responses.

### Key Features

- **Server-side caching** via Next.js `revalidate` headers
- **Parallel data fetching** using `Promise.all()`
- **Graceful degradation** with demo/fallback data
- **TypeScript-first** with full type definitions

### API Design Patterns

1. **Proxy Pattern**: External API calls are proxied server-side for caching and security
2. **Merge Pattern**: Multiple data sources (e.g., two calendars) are merged server-side
3. **Transform Pattern**: External API responses are simplified for client consumption
4. **Fallback Pattern**: Demo data provided when external APIs fail

---

## Authentication

### Public Routes

All mirror widget routes (`/api/calendar`, `/api/weather`, etc.) are **unauthenticated** and publicly accessible. These are designed to be called from the client-side mirror display.

### Admin Routes

Admin routes (`/api/admin/*`) require **JWT authentication** via NextAuth v5:
- Authentication handled by `/api/auth/[...nextauth]`
- Uses JWT tokens in HTTP-only cookies
- Admin credentials stored in `.env.local` (email + bcrypt password hash)

**Note:** Admin portal is currently incomplete (0% test coverage, excluded from builds).

---

## Public API Routes

### GET /api/calendar

**Purpose:** Fetches and parses iCal feeds from multiple calendars (iCloud, Google, etc.), categorizes events by today/tomorrow/upcoming.

**Authentication:** None required

**Query Parameters:** None (configured via environment variables)

**Response:**

```typescript
interface CalendarResponse {
  todayEvents: CalendarEvent[];
  tomorrowEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[]; // Next 7 days, max 5 events
  lastUpdated: string; // ISO timestamp
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  allDay: boolean;
  location?: string;
  description?: string;
  calendar: 'primary' | 'secondary';
}
```

**Example Response:**

```json
{
  "todayEvents": [
    {
      "id": "ABC123",
      "title": "Team Meeting",
      "start": "2026-01-01T14:00:00.000Z",
      "end": "2026-01-01T15:00:00.000Z",
      "allDay": false,
      "location": "Conference Room A",
      "calendar": "primary"
    }
  ],
  "tomorrowEvents": [],
  "upcomingEvents": [
    {
      "id": "DEF456",
      "title": "Doctor Appointment",
      "start": "2026-01-03T10:00:00.000Z",
      "end": "2026-01-03T11:00:00.000Z",
      "allDay": false,
      "calendar": "secondary"
    }
  ],
  "lastUpdated": "2026-01-01T12:00:00.000Z"
}
```

**Environment Variables:**

```bash
CALENDAR_URL_PRIMARY=https://p06-calendarws.icloud.com/ca/subscribe/1/...
CALENDAR_URL_SECONDARY=https://p06-calendarws.icloud.com/ca/subscribe/1/...
```

**Error Handling:**

- Returns `{ error: "No calendar URLs configured" }` (500) if both URLs missing
- Returns empty arrays for failed calendar fetches (graceful degradation)

**Caching:** No explicit caching (fresh data on each request)

**TypeScript Example:**

```typescript
async function fetchCalendar(): Promise<CalendarResponse> {
  const response = await fetch('/api/calendar');
  if (!response.ok) throw new Error('Calendar fetch failed');
  return response.json();
}
```

---

### GET /api/commute

**Purpose:** Fetches traffic-aware commute times using TomTom Routing API with real-time traffic data.

**Authentication:** None required

**Query Parameters:** None (configured via environment variables)

**Response:**

```typescript
interface CommuteAPIResponse {
  commutes: CommuteData[];
  lastUpdated: string; // ISO timestamp
  isDemo: boolean;
}

interface CommuteData {
  name: string;
  durationMinutes: number; // With current traffic
  distanceMiles: number;
  trafficDelayMinutes: number; // Delay vs free-flow
  trafficStatus: 'light' | 'moderate' | 'heavy';
  suggestedDepartureTime: string; // ISO timestamp
  targetArrivalTime: string; // HH:MM format
}
```

**Example Response:**

```json
{
  "commutes": [
    {
      "name": "Jack",
      "durationMinutes": 23,
      "distanceMiles": 15.4,
      "trafficDelayMinutes": 8,
      "trafficStatus": "moderate",
      "suggestedDepartureTime": "2026-01-01T07:37:00.000Z",
      "targetArrivalTime": "08:00"
    }
  ],
  "lastUpdated": "2026-01-01T07:15:00.000Z",
  "isDemo": false
}
```

**Traffic Status Calculation:**

- `light`: < 5 minutes delay
- `moderate`: 5-10 minutes delay
- `heavy`: > 10 minutes delay

**Environment Variables:**

```bash
TOMTOM_API_KEY=your_api_key_here

# Commute 1
COMMUTE_1_NAME=Person1
COMMUTE_1_ORIGIN=41.0454,-85.1455        # lat,lon
COMMUTE_1_DESTINATION=41.1327,-85.1762
COMMUTE_1_ARRIVAL_TIME=08:00             # HH:MM

# Commute 2
COMMUTE_2_NAME=Person2
COMMUTE_2_ORIGIN=41.0454,-85.1455
COMMUTE_2_DESTINATION=41.0421,-85.2409
COMMUTE_2_ARRIVAL_TIME=08:00
```

**Fallback Behavior:**

- Returns demo data if `TOMTOM_API_KEY` not configured
- Returns demo data if all TomTom API requests fail
- Filters out commutes with missing origin/destination

**Caching:** 5 minutes (300 seconds) via Next.js `revalidate`

**TypeScript Example:**

```typescript
async function fetchCommute(): Promise<CommuteAPIResponse> {
  const response = await fetch('/api/commute');
  if (!response.ok) throw new Error('Commute fetch failed');
  return response.json();
}
```

---

### GET /api/config-version

**Purpose:** Returns configuration version for admin portal config polling. Also updates mirror heartbeat in database.

**Authentication:** None required (mirror needs to poll this)

**Query Parameters:** None

**Response:**

```typescript
interface ConfigVersionResponse {
  version: number; // Increments on config changes
  updatedAt: string | null; // ISO timestamp
}
```

**Example Response:**

```json
{
  "version": 5,
  "updatedAt": "2026-01-01T10:30:00.000Z"
}
```

**Side Effects:**

- Updates `systemState.mirror` table with heartbeat ping
- Sets `online: true` and `lastPing: new Date()`

**Error Handling:**

- Returns `{ version: 0, updatedAt: null }` on database errors (safe default)

**Caching:** No caching

**Database Tables:**

- `configVersion` - Tracks configuration version
- `systemState` - Tracks mirror health/uptime

**TypeScript Example:**

```typescript
async function pollConfigVersion(): Promise<ConfigVersionResponse> {
  const response = await fetch('/api/config-version');
  return response.json(); // Always returns 200, even on errors
}
```

---

### GET /api/feast-day

**Purpose:** Returns Catholic liturgical calendar information using the `romcal` library.

**Authentication:** None required

**Query Parameters:** None (uses current date automatically)

**Response:**

```typescript
interface FeastDayResponse {
  feastDay: string | null; // e.g., "Saint Thomas Becket"
  season: string | null; // e.g., "Advent", "Ordinary Time"
  color: string | null; // e.g., "white", "green", "red"
  rank: string | null; // e.g., "Solemnity", "Feast", "Memorial"
  lastUpdated: string; // ISO timestamp
}
```

**Example Response:**

```json
{
  "feastDay": "Saint Thomas Becket",
  "season": "Christmas",
  "color": "white",
  "rank": "Optional Memorial",
  "lastUpdated": "2026-01-01T12:00:00.000Z"
}
```

**Liturgical Ranks:**

- **Solemnity** - Highest rank celebration
- **Feast** - Major saint or event
- **Memorial** - Saint or event of local/universal importance
- **Optional Memorial** - Optional celebration
- **Weekday** - Ordinary weekday (Feria)

**Liturgical Colors:**

- **White** - Christmas, Easter, feasts of Jesus/Mary/saints (non-martyrs)
- **Red** - Passion Sunday, Good Friday, Pentecost, martyrs
- **Green** - Ordinary Time
- **Violet/Purple** - Advent, Lent
- **Rose** - Gaudete Sunday (Advent 3), Laetare Sunday (Lent 4)

**Environment Variables:**

None required (uses US national calendar by default)

**Error Handling:**

- Returns all null values if romcal calculation fails
- Always returns 200 status with valid JSON

**Caching:** No caching (data changes daily at midnight)

**TypeScript Example:**

```typescript
async function fetchFeastDay(): Promise<FeastDayResponse> {
  const response = await fetch('/api/feast-day');
  if (!response.ok) throw new Error('Feast day fetch failed');
  return response.json();
}
```

---

### GET /api/news

**Purpose:** Fetches and parses RSS feeds from multiple news sources, deduplicates, and returns top headlines.

**Authentication:** None required

**Query Parameters:** None (RSS feeds configured in route file)

**Response:**

```typescript
interface NewsResponse {
  articles: NewsArticle[];
  lastUpdated: string; // ISO timestamp
}

interface NewsArticle {
  id: string;
  title: string;
  source: string; // e.g., "NY Times", "BBC", "WANE 15"
  link: string;
  pubDate: string; // ISO timestamp
  description?: string; // Max 300 characters
}
```

**Example Response:**

```json
{
  "articles": [
    {
      "id": "https://www.nytimes.com/2026/01/01/world/...",
      "title": "Major Policy Announcement Expected This Week",
      "source": "NY Times",
      "link": "https://www.nytimes.com/2026/01/01/world/...",
      "pubDate": "2026-01-01T10:30:00.000Z",
      "description": "Administration officials signal a major policy shift in upcoming announcement..."
    },
    {
      "id": "guid-abc-123",
      "title": "Local Fort Wayne Business Expands Operations",
      "source": "WANE 15",
      "link": "https://www.wane.com/news/local/...",
      "pubDate": "2026-01-01T08:15:00.000Z"
    }
  ],
  "lastUpdated": "2026-01-01T12:00:00.000Z"
}
```

**News Sources (Configurable):**

```typescript
const NEWS_FEEDS = [
  // Local Fort Wayne (prioritized)
  { url: 'https://www.wane.com/feed/', source: 'WANE 15' },
  { url: 'https://www.wishtv.com/feed/', source: 'WISH-TV' },
  { url: 'https://www.ibj.com/feed', source: 'IBJ' },

  // National headlines
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'NY Times' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
  { url: 'https://www.npr.org/rss/rss.php?id=1001', source: 'NPR' },
];
```

**Data Processing:**

1. Fetches all feeds in parallel
2. Takes top 5 articles from each source
3. Sorts by publish date (newest first)
4. Deduplicates by normalized title (first 50 chars, case-insensitive)
5. Returns top 8 unique articles

**HTML Entity Decoding:**

- Handles CDATA sections
- Decodes numeric entities (`&#NNN;`)
- Decodes named entities (`&amp;`, `&quot;`, etc.)
- Strips HTML tags from descriptions

**Environment Variables:**

None required (feeds hardcoded in route file)

**Error Handling:**

- Failed feeds return empty arrays (graceful degradation)
- Continues processing other feeds if one fails

**Caching:** 5 minutes (300 seconds) via Next.js `revalidate`

**TypeScript Example:**

```typescript
async function fetchNews(): Promise<NewsResponse> {
  const response = await fetch('/api/news');
  if (!response.ok) throw new Error('News fetch failed');
  return response.json();
}
```

---

### GET /api/spotify/now-playing

**Purpose:** Returns currently playing track or podcast from Spotify using OAuth refresh token flow.

**Authentication:** None required (uses server-side refresh token)

**Query Parameters:** None

**Response:**

```typescript
interface SpotifyResponse {
  isPlaying: boolean;
  configured: boolean;
  type?: 'track' | 'podcast';

  // Track fields (when type === 'track')
  title?: string;
  artist?: string; // Comma-separated if multiple artists
  album?: string;

  // Podcast fields (when type === 'podcast')
  show?: string;

  // Common fields
  imageUrl?: string; // Album/show art URL
  progress?: number; // Milliseconds
  duration?: number; // Milliseconds

  // Error fields
  error?: string;
  message?: string;
}
```

**Example Response (Playing Track):**

```json
{
  "isPlaying": true,
  "configured": true,
  "type": "track",
  "title": "Bohemian Rhapsody",
  "artist": "Queen",
  "album": "A Night at the Opera",
  "imageUrl": "https://i.scdn.co/image/...",
  "progress": 120000,
  "duration": 354000
}
```

**Example Response (Playing Podcast):**

```json
{
  "isPlaying": true,
  "configured": true,
  "type": "podcast",
  "title": "The Future of AI",
  "show": "Tech Talk Daily",
  "imageUrl": "https://i.scdn.co/image/...",
  "progress": 600000,
  "duration": 3600000
}
```

**Example Response (Nothing Playing):**

```json
{
  "isPlaying": false,
  "configured": true
}
```

**Example Response (Not Configured):**

```json
{
  "isPlaying": false,
  "configured": false,
  "message": "Spotify not configured"
}
```

**Environment Variables:**

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token  # Obtained via OAuth flow
```

**OAuth Flow:**

1. User authorizes via `/api/spotify/authorize`
2. Callback to `/api/spotify/callback` exchanges code for tokens
3. Refresh token stored in `.env.local`
4. This endpoint uses refresh token to get access token

**Error Handling:**

- Returns `configured: false` if credentials missing
- Returns `isPlaying: false` with `error` field on API failures
- HTTP 204 from Spotify = nothing playing (normal)

**Caching:** No caching (real-time playback state)

**TypeScript Example:**

```typescript
async function fetchNowPlaying(): Promise<SpotifyResponse> {
  const response = await fetch('/api/spotify/now-playing');
  if (!response.ok) throw new Error('Spotify fetch failed');
  return response.json();
}
```

---

### GET /api/summary

**Purpose:** Generates a personalized daily briefing using AI (OpenRouter) or template-based fallback.

**Authentication:** None required

**Query Parameters:** None

**Response:**

```typescript
interface SummaryResponse {
  greeting: string; // e.g., "Good morning", "Good afternoon"
  summary: string; // 2-3 sentence briefing
  tip?: string; // Optional contextual tip (template mode only)
  lastUpdated: string; // ISO timestamp
}
```

**Example Response (AI Mode):**

```json
{
  "greeting": "Good morning",
  "summary": "It's a chilly 28° morning with clear skies. You have 3 events on your calendar today, starting with a team meeting at 9am. Top news includes major policy announcements and local business expansions.",
  "lastUpdated": "2026-01-01T07:00:00.000Z"
}
```

**Example Response (Template Mode):**

```json
{
  "greeting": "Good evening",
  "summary": "It's 45° and partly cloudy outside. Your calendar is clear today. Perfect day to get outside and enjoy the weather.",
  "tip": "Perfect day to get outside and enjoy the weather.",
  "lastUpdated": "2026-01-01T18:00:00.000Z"
}
```

**Generation Modes:**

1. **AI Mode** (preferred)
   - Uses OpenRouter API with configurable model (default: Claude 3 Haiku)
   - Receives weather, calendar, and news context
   - Generates natural, contextual 2-3 sentence summary
   - No emoji output

2. **Template Mode** (fallback)
   - Activates if `OPENROUTER_API_KEY` not configured
   - Rule-based summary generation
   - Weather-based and calendar-based tips
   - More predictable but less natural

**Context Data Sources:**

The summary endpoint fetches from:
- `/api/weather` - Current conditions
- `/api/calendar` - Today's events
- `/api/news` - Top headlines (includes descriptions)

**Time-of-Day Greetings:**

- **Morning**: 5:00 AM - 11:59 AM
- **Afternoon**: 12:00 PM - 4:59 PM
- **Evening**: 5:00 PM - 8:59 PM
- **Night**: 9:00 PM - 4:59 AM

**Template Tips Examples:**

- Weather < 32°F: "Bundle up, it's freezing out there."
- Weather > 85°F: "Stay hydrated in this heat."
- Rain forecast > 50%: "Don't forget an umbrella if you're heading out."
- Snow forecast: "Roads may be slick — drive carefully."
- 4+ events: "Busy day ahead — pace yourself."
- No events + clear weather: "Perfect day to get outside and enjoy the weather."

**Environment Variables:**

```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3-haiku  # Optional, defaults to Haiku
```

**Error Handling:**

- Falls back to template mode if OpenRouter API fails
- Always returns 200 with valid summary (graceful degradation)

**Caching:** No caching (generates fresh summary on each request)

**TypeScript Example:**

```typescript
async function fetchSummary(): Promise<SummaryResponse> {
  const response = await fetch('/api/summary');
  if (!response.ok) throw new Error('Summary fetch failed');
  return response.json();
}
```

---

### GET /api/version

**Purpose:** Returns build timestamp for version-aware auto-refresh system (VersionChecker component).

**Authentication:** None required

**Query Parameters:** None

**Response:**

```typescript
interface VersionResponse {
  buildTime: string; // Unix timestamp or "development"
  timestamp: number; // Current Unix timestamp (ms)
}
```

**Example Response (Production):**

```json
{
  "buildTime": "1735686000000",
  "timestamp": 1735686123456
}
```

**Example Response (Development):**

```json
{
  "buildTime": "development",
  "timestamp": 1735686123456
}
```

**How Version Checking Works:**

1. `BUILD_TIME` set during production build (deploy.sh)
2. VersionChecker polls this endpoint every 30 seconds (production) or 60 seconds (dev)
3. If `buildTime` changes from cached value → new deployment detected
4. VersionChecker shows "Updating..." and refreshes page after 2 seconds

**Environment Variables:**

```bash
BUILD_TIME=$(date +%s%3N)  # Set during build, not in .env
```

**Error Handling:**

- Always returns 200 (this endpoint cannot fail)
- Returns "development" if `BUILD_TIME` not set

**Caching:** No caching (needs to reflect latest build)

**TypeScript Example:**

```typescript
async function checkVersion(): Promise<VersionResponse> {
  const response = await fetch('/api/version');
  if (!response.ok) throw new Error('Version fetch failed');
  return response.json();
}

// Usage in VersionChecker
const cachedBuildTime = localStorage.getItem('buildTime');
const { buildTime } = await checkVersion();

if (buildTime !== cachedBuildTime && buildTime !== 'development') {
  // New deployment detected!
  localStorage.setItem('buildTime', buildTime);
  window.location.reload();
}
```

---

### GET /api/weather

**Purpose:** Proxies Open-Meteo API for weather data with server-side caching and response transformation.

**Authentication:** None required

**Query Parameters:** None (location configured via environment variables)

**Response:**

```typescript
interface WeatherResponse {
  current: CurrentWeather;
  daily: DailyForecast[];
  location: string;
  lastUpdated: string; // ISO timestamp
}

interface CurrentWeather {
  temperature: number; // Fahrenheit
  feelsLike: number; // Apparent temperature
  humidity: number; // Percentage
  windSpeed: number; // MPH
  weatherCode: number; // WMO weather code
  isDay: boolean;
}

interface DailyForecast {
  date: string; // YYYY-MM-DD
  tempHigh: number;
  tempLow: number;
  weatherCode: number;
  precipitationProbability: number; // Percentage
}
```

**Example Response:**

```json
{
  "current": {
    "temperature": 28,
    "feelsLike": 22,
    "humidity": 65,
    "windSpeed": 8,
    "weatherCode": 2,
    "isDay": true
  },
  "daily": [
    {
      "date": "2026-01-01",
      "tempHigh": 32,
      "tempLow": 24,
      "weatherCode": 3,
      "precipitationProbability": 20
    },
    {
      "date": "2026-01-02",
      "tempHigh": 35,
      "tempLow": 26,
      "weatherCode": 61,
      "precipitationProbability": 75
    }
  ],
  "location": "Fort Wayne, IN",
  "lastUpdated": "2026-01-01T12:00:00.000Z"
}
```

**WMO Weather Codes:**

| Code | Description |
|------|-------------|
| 0 | Clear sky |
| 1 | Mainly clear |
| 2 | Partly cloudy |
| 3 | Overcast |
| 45, 48 | Foggy |
| 51, 53, 55 | Drizzle (light, moderate, dense) |
| 61, 63, 65 | Rain (light, moderate, heavy) |
| 71, 73, 75 | Snow (light, moderate, heavy) |
| 80, 81, 82 | Rain showers |
| 95 | Thunderstorm |

**Environment Variables:**

```bash
WEATHER_LAT=41.0793                   # Latitude
WEATHER_LON=-85.1394                  # Longitude
WEATHER_LOCATION=Fort Wayne, IN       # Display name
```

**API Source:**

- Uses [Open-Meteo](https://open-meteo.com/) (free, no API key required)
- Timezone: `America/Indiana/Indianapolis`
- Units: Fahrenheit, MPH
- Forecast days: 7

**Data Transformations:**

- Rounds temperatures to integers
- Converts Open-Meteo response to simpler structure
- Maps daily forecast arrays to objects

**Error Handling:**

- Returns `{ error: "Failed to fetch weather" }` (500) on API failures

**Caching:** 15 minutes (900 seconds) via Next.js `revalidate`

**TypeScript Example:**

```typescript
async function fetchWeather(): Promise<WeatherResponse> {
  const response = await fetch('/api/weather');
  if (!response.ok) throw new Error('Weather fetch failed');
  return response.json();
}

// Weather code helper
function getWeatherDescription(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    // ... see full map in route file
  };
  return map[code] || 'Variable conditions';
}
```

---

## Admin API Routes

All admin routes require **JWT authentication** via NextAuth v5 session. Unauthorized requests return `401 Unauthorized`.

### System Management

#### GET /api/admin/settings

**Purpose:** Retrieve all settings or filter by category. Encrypted settings are masked with asterisks.

**Authentication:** JWT session required

**Query Parameters:**

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| category  | string | No       | Filter settings by category (e.g., "weather", "ai-summary") |

**Response:**

```typescript
{
  "settings": [
    {
      "id": "weather.latitude",
      "category": "weather",
      "value": "41.0793", // JSON parsed, encrypted values shown as "********"
      "label": "Latitude",
      "encrypted": false,
      "updatedBy": "user-id",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **500:** Failed to fetch settings

**TypeScript Example:**

```typescript
// Fetch all settings
const response = await fetch('/api/admin/settings');
const { settings } = await response.json();

// Fetch weather settings only
const weatherResponse = await fetch('/api/admin/settings?category=weather');
const { settings: weatherSettings } = await weatherResponse.json();
```

---

#### PUT /api/admin/settings

**Purpose:** Update multiple settings in a single request. Increments config version to trigger mirror refresh.

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "settings": [
    {
      "id": "weather.latitude",
      "value": "41.0793"
    },
    {
      "id": "weather.longitude",
      "value": "-85.1394"
    }
  ]
}
```

**Response:**

```typescript
{
  "success": true,
  "updated": 2 // Number of settings updated
}
```

**Error Responses:**

- **400:** Invalid settings format (must be an array)
- **401:** Unauthorized (no valid session)
- **500:** Failed to update settings

**Side Effects:**

- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `settings.update`

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    settings: [
      { id: 'weather.latitude', value: '41.0793' },
      { id: 'weather.longitude', value: '-85.1394' },
    ],
  }),
});

const { success, updated } = await response.json();
```

---

#### POST /api/admin/settings

**Purpose:** Create a new setting. Used for adding custom configuration values.

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "id": "custom.setting",
  "value": "some-value",
  "category": "custom",
  "label": "Custom Setting", // Optional
  "encrypted": false // Optional, defaults to false
}
```

**Response:**

```typescript
{
  "success": true,
  "setting": {
    "id": "custom.setting",
    "value": "\"some-value\"", // Stored as JSON string
    "category": "custom",
    "label": "Custom Setting",
    "encrypted": false,
    "updatedBy": "user-id",
    "createdAt": "2025-01-03T00:00:00.000Z",
    "updatedAt": "2025-01-03T00:00:00.000Z"
  }
}
```

**Error Responses:**

- **400:** Missing required fields (id, value, category)
- **401:** Unauthorized (no valid session)
- **500:** Failed to create setting (e.g., ID already exists)

**Side Effects:**

- Creates activity log entry with action `settings.create`

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'custom.apiKey',
    value: 'sk_test_123',
    category: 'integrations',
    label: 'External API Key',
    encrypted: true,
  }),
});

const { success, setting } = await response.json();
```

---

#### GET /api/admin/widgets

**Purpose:** Retrieve all widget configurations including visibility, order, and custom settings.

**Authentication:** JWT session required

**Query Parameters:** None

**Response:**

```typescript
{
  "widgets": [
    {
      "id": "weather",
      "enabled": true,
      "order": 1,
      "settings": { // Parsed from JSON
        "refreshInterval": 900000,
        "showForecast": true
      },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **500:** Failed to fetch widgets

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/widgets');
const { widgets } = await response.json();

// Find a specific widget
const weatherWidget = widgets.find((w) => w.id === 'weather');
```

---

#### PUT /api/admin/widgets

**Purpose:** Update widget configurations (visibility, display order, custom settings).

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "widgets": [
    {
      "id": "weather",
      "enabled": true,
      "order": 1,
      "settings": {
        "refreshInterval": 900000,
        "showForecast": true
      }
    },
    {
      "id": "calendar",
      "enabled": false
    }
  ]
}
```

**Response:**

```typescript
{
  "success": true,
  "updated": 2
}
```

**Error Responses:**

- **400:** Invalid widgets format (must be an array)
- **401:** Unauthorized (no valid session)
- **500:** Failed to update widgets

**Side Effects:**

- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `widgets.update`

**TypeScript Example:**

```typescript
// Disable weather widget
const response = await fetch('/api/admin/widgets', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    widgets: [{ id: 'weather', enabled: false }],
  }),
});

const { success } = await response.json();
```

---

#### GET /api/admin/mirror/status

**Purpose:** Retrieve mirror system health metrics, config version, widget stats, and recent activity.

**Authentication:** JWT session required

**Query Parameters:** None

**Response:**

```typescript
{
  "status": {
    "online": true,
    "lastPing": "2025-01-03T12:00:00.000Z",
    "uptime": 3600, // seconds
    "memoryUsage": 128, // MB (heap used)
    "cpuUsage": 0.25 // 1-minute load average
  },
  "config": {
    "version": 42,
    "lastUpdated": "2025-01-03T11:30:00.000Z"
  },
  "widgets": {
    "enabled": 7,
    "total": 10
  },
  "recentActivity": [
    {
      "id": "activity-123",
      "action": "weather.update",
      "category": "weather",
      "details": { "location": "Fort Wayne, IN" },
      "createdAt": "2025-01-03T11:30:00.000Z",
      "user": "admin@example.com"
    }
  ]
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **500:** Failed to get mirror status

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/mirror/status');
const { status, config, widgets, recentActivity } = await response.json();

// Check if mirror is online
if (!status.online) {
  console.warn('Mirror is offline!');
}
```

---

#### POST /api/admin/mirror/status

**Purpose:** Update mirror heartbeat (called by mirror display itself). No authentication required for heartbeat updates.

**Authentication:** None required (public endpoint for mirror)

**Request Body:** None

**Response:**

```typescript
{
  "success": true
}
```

**Error Responses:**

- **500:** Failed to update heartbeat

**Side Effects:**

- Updates `SystemState` record with current metrics (uptime, memory, CPU)
- Sets `online: true` and updates `lastPing` timestamp

**TypeScript Example:**

```typescript
// Called automatically by mirror display every 60 seconds
const response = await fetch('/api/admin/mirror/status', {
  method: 'POST',
});
```

---

#### POST /api/admin/mirror/refresh

**Purpose:** Force mirror display to refresh by incrementing config version.

**Authentication:** JWT session required

**Request Body:** None

**Response:**

```typescript
{
  "success": true,
  "message": "Refresh signal sent to mirror",
  "configVersion": 43
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **500:** Failed to trigger refresh

**Side Effects:**

- Increments `configVersion` (mirror polls this and refreshes when changed)
- Creates activity log entry with action `mirror.refresh`

**TypeScript Example:**

```typescript
// Trigger mirror refresh from admin panel
const response = await fetch('/api/admin/mirror/refresh', {
  method: 'POST',
});

const { configVersion } = await response.json();
console.log(`Refresh signal sent, config version now: ${configVersion}`);
```

---

### Feature Configuration

#### GET /api/admin/weather

**Purpose:** Retrieve weather configuration (location coordinates and units).

**Authentication:** JWT session required

**Query Parameters:** None

**Response:**

```typescript
{
  "latitude": "41.0793",
  "longitude": "-85.1394",
  "location": "Fort Wayne, IN",
  "units": "fahrenheit" // or "celsius"
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **500:** Failed to fetch weather settings

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/weather');
const { latitude, longitude, location, units } = await response.json();
```

---

#### PUT /api/admin/weather

**Purpose:** Update weather configuration with validation.

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "latitude": "41.0793", // -90 to 90
  "longitude": "-85.1394", // -180 to 180
  "location": "Fort Wayne, IN",
  "units": "fahrenheit" // "fahrenheit" or "celsius"
}
```

**Response:**

```typescript
{
  "success": true
}
```

**Error Responses:**

- **400:** All fields are required
- **400:** Latitude must be a number between -90 and 90
- **400:** Longitude must be a number between -180 and 180
- **400:** Units must be either "fahrenheit" or "celsius"
- **401:** Unauthorized (no valid session)
- **500:** Failed to update weather settings

**Side Effects:**

- Updates four database settings: `weather.latitude`, `weather.longitude`, `weather.location`, `weather.units`
- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `weather.update`

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/weather', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: '41.0793',
    longitude: '-85.1394',
    location: 'Fort Wayne, IN',
    units: 'fahrenheit',
  }),
});

const { success } = await response.json();
```

---

#### GET /api/admin/ai-summary

**Purpose:** Retrieve AI summary context settings (which data to include in AI prompts).

**Authentication:** JWT session required

**Query Parameters:** None

**Response:**

```typescript
{
  // Weather Context
  "includeWeatherLocation": true,
  "includeFeelsLike": true,
  "includeWindSpeed": true,
  "includePrecipitation": true,
  "includeTomorrowWeather": true,

  // Calendar Context
  "includeCalendar": true,
  "includeEventTimes": true,
  "includeTimeUntilNext": true,
  "includeAllDayEvents": true,

  // Commute Context
  "includeCommute": true,
  "includeCommuteDeviation": true,

  // Temporal Context
  "includeDayDate": true,
  "includeWeekendDetection": true
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **500:** Failed to fetch AI summary settings

**Note:** These settings are persisted to the database but NOT yet consumed by `/api/summary` route. This is a feature stub for future implementation.

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/ai-summary');
const settings = await response.json();

if (settings.includeWeather) {
  console.log('Weather context enabled in AI summaries');
}
```

---

#### PUT /api/admin/ai-summary

**Purpose:** Update which context data is included in AI summary prompts.

**Authentication:** JWT session required

**Request Body:**

All fields are required and must be boolean values.

```typescript
{
  "includeWeatherLocation": true,
  "includeFeelsLike": true,
  "includeWindSpeed": true,
  "includePrecipitation": true,
  "includeTomorrowWeather": true,
  "includeCalendar": true,
  "includeEventTimes": true,
  "includeTimeUntilNext": true,
  "includeAllDayEvents": true,
  "includeCommute": true,
  "includeCommuteDeviation": true,
  "includeDayDate": true,
  "includeWeekendDetection": true
}
```

**Response:**

```typescript
{
  "success": true
}
```

**Error Responses:**

- **400:** Missing or invalid field (all fields must be boolean)
- **401:** Unauthorized (no valid session)
- **500:** Failed to update AI summary settings

**Side Effects:**

- Updates 13 database settings with prefix `ai-summary.*`
- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `ai-summary.update`

**TypeScript Example:**

```typescript
// Disable commute and weekend detection in AI summaries
const response = await fetch('/api/admin/ai-summary', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    includeWeatherLocation: true,
    includeFeelsLike: true,
    includeWindSpeed: true,
    includePrecipitation: true,
    includeTomorrowWeather: true,
    includeCalendar: true,
    includeEventTimes: true,
    includeTimeUntilNext: true,
    includeAllDayEvents: true,
    includeCommute: false, // Disabled
    includeCommuteDeviation: false,
    includeDayDate: true,
    includeWeekendDetection: false, // Disabled
  }),
});

const { success } = await response.json();
```

---

#### GET /api/admin/ai-behavior

**Purpose:** Retrieve AI model parameters and personality settings for daily summary generation.

**Authentication:** JWT session required

**Query Parameters:** None

**Response:**

```typescript
{
  // Model & Output Parameters
  "model": "anthropic/claude-3-haiku",
  "temperature": 0.7, // 0-2 (creativity)
  "maxTokens": 150, // 50-300 (summary length)
  "topP": 1, // 0-1 (nucleus sampling)
  "presencePenalty": 0, // -2 to 2 (topic diversity)
  "verbosity": "medium", // "low" | "medium" | "high"

  // Tone & Personalization
  "tone": "casual", // "formal" | "casual"
  "userNames": ["Jack", "Lauren"], // Array of names for personalization
  "humorLevel": "subtle", // "none" | "subtle" | "playful"
  "customInstructions": "", // Max 500 chars

  // Context-Aware Intelligence
  "morningTone": "energizing", // "energizing" | "neutral" | "custom"
  "eveningTone": "calming", // "calming" | "neutral" | "custom"
  "stressAwareEnabled": true, // Detect busy schedules
  "celebrationModeEnabled": true, // Celebrate birthdays, holidays

  // Advanced Controls
  "stopSequences": [] // Max 10 sequences
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **500:** Failed to fetch AI behavior settings

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/ai-behavior');
const settings = await response.json();

console.log(`Current AI model: ${settings.model}`);
console.log(`Temperature: ${settings.temperature}`);
```

---

#### PUT /api/admin/ai-behavior

**Purpose:** Update AI behavior settings with comprehensive validation.

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "model": "anthropic/claude-3-haiku",
  "temperature": 0.7, // Must be 0-2
  "maxTokens": 150, // Must be 50-300
  "topP": 1, // Must be 0-1
  "presencePenalty": 0, // Must be -2 to 2
  "verbosity": "medium", // Must be "low" | "medium" | "high"
  "tone": "casual", // Must be "formal" | "casual"
  "userNames": ["Jack", "Lauren"], // Max 10 names
  "humorLevel": "subtle", // Must be "none" | "subtle" | "playful"
  "customInstructions": "Be encouraging on Mondays", // Max 500 chars
  "morningTone": "energizing",
  "eveningTone": "calming",
  "stressAwareEnabled": true,
  "celebrationModeEnabled": true,
  "stopSequences": ["END", "STOP"] // Max 10 sequences
}
```

**Response:**

```typescript
{
  "success": true
}
```

**Validation Rules:**

- **temperature:** 0-2
- **maxTokens:** 50-300
- **topP:** 0-1
- **presencePenalty:** -2 to 2
- **verbosity:** "low" | "medium" | "high"
- **tone:** "formal" | "casual"
- **humorLevel:** "none" | "subtle" | "playful"
- **customInstructions:** Max 500 characters
- **stopSequences:** Max 10 sequences
- **userNames:** Max 10 names

**Error Responses:**

- **400:** Validation error with detailed message (e.g., "Temperature must be between 0 and 2")
- **401:** Unauthorized (no valid session)
- **500:** Failed to update AI behavior settings

**Side Effects:**

- Updates 15 database settings with prefix `ai-behavior.*`
- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `ai-behavior.update`
- Invalidates server-side AI behavior cache

**TypeScript Example:**

```typescript
// Make AI more creative and playful in the morning
const response = await fetch('/api/admin/ai-behavior', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'anthropic/claude-3-haiku',
    temperature: 1.2, // More creative
    maxTokens: 200, // Longer summaries
    topP: 1,
    presencePenalty: 0,
    verbosity: 'high',
    tone: 'casual',
    userNames: ['Jack', 'Lauren'],
    humorLevel: 'playful', // More humor
    customInstructions: 'Always include a motivational quote',
    morningTone: 'energizing',
    eveningTone: 'calming',
    stressAwareEnabled: true,
    celebrationModeEnabled: true,
    stopSequences: [],
  }),
});

if (!response.ok) {
  const error = await response.json();
  console.error(error.error); // "Temperature must be between 0 and 2"
}
```

---

### Calendar Management

#### GET /api/admin/calendar

**Purpose:** Retrieve all configured calendar feeds.

**Authentication:** JWT session required

**Query Parameters:** None

**Response:**

```typescript
{
  "feeds": [
    {
      "id": "feed-123",
      "name": "Personal Calendar",
      "url": "https://calendar.icloud.com/holidays/US_en.ics",
      "enabled": true,
      "color": "#FF5733", // Optional hex color
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **500:** Failed to fetch calendar feeds

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/calendar');
const { feeds } = await response.json();

// Find enabled feeds
const enabledFeeds = feeds.filter((f) => f.enabled);
```

---

#### POST /api/admin/calendar

**Purpose:** Create a new calendar feed.

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "name": "Work Calendar",
  "url": "https://calendar.google.com/calendar/ical/.../.ics",
  "enabled": true, // Optional, defaults to true
  "color": "#4285F4" // Optional hex color
}
```

**Response:**

```typescript
{
  "feed": {
    "id": "feed-456",
    "name": "Work Calendar",
    "url": "https://calendar.google.com/calendar/ical/.../.ics",
    "enabled": true,
    "color": "#4285F4",
    "createdAt": "2025-01-03T12:00:00.000Z",
    "updatedAt": "2025-01-03T12:00:00.000Z"
  }
}
```

**Error Responses:**

- **400:** Name and URL are required
- **401:** Unauthorized (no valid session)
- **500:** Failed to create calendar feed

**Side Effects:**

- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `calendar.create`

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/calendar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Work Calendar',
    url: 'https://calendar.google.com/calendar/ical/.../basic.ics',
    enabled: true,
    color: '#4285F4',
  }),
});

const { feed } = await response.json();
console.log(`Created feed with ID: ${feed.id}`);
```

---

#### PUT /api/admin/calendar

**Purpose:** Bulk update calendar feeds (for enable/disable operations).

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "feeds": [
    { "id": "feed-123", "enabled": true },
    { "id": "feed-456", "enabled": false }
  ]
}
```

**Response:**

```typescript
{
  "success": true
}
```

**Error Responses:**

- **400:** Feeds array is required
- **401:** Unauthorized (no valid session)
- **500:** Failed to update calendar feeds

**Side Effects:**

- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `calendar.update`

**TypeScript Example:**

```typescript
// Disable multiple calendar feeds
const response = await fetch('/api/admin/calendar', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    feeds: [
      { id: 'feed-123', enabled: false },
      { id: 'feed-456', enabled: false },
    ],
  }),
});

const { success } = await response.json();
```

---

#### DELETE /api/admin/calendar/:id

**Purpose:** Delete a calendar feed by ID.

**Authentication:** JWT session required

**Path Parameters:**

| Parameter | Type   | Description          |
| --------- | ------ | -------------------- |
| id        | string | Calendar feed ID     |

**Request Body:** None

**Response:**

```typescript
{
  "success": true
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **404:** Feed not found
- **500:** Failed to delete calendar feed

**Side Effects:**

- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `calendar.delete`

**TypeScript Example:**

```typescript
const feedId = 'feed-123';
const response = await fetch(`/api/admin/calendar/${feedId}`, {
  method: 'DELETE',
});

if (response.ok) {
  console.log('Feed deleted successfully');
}
```

---

#### POST /api/admin/calendar/validate

**Purpose:** Validate an iCal URL before saving to database. Fetches and parses the feed to ensure it's accessible and valid.

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "url": "https://calendar.icloud.com/holidays/US_en.ics"
}
```

**Response (Valid Feed):**

```typescript
{
  "valid": true,
  "eventCount": 42,
  "message": "Successfully parsed 42 events"
}
```

**Response (Invalid Feed):**

```typescript
{
  "valid": false,
  "error": "Could not reach the calendar URL. Check the URL and your network connection."
}
```

**Error Responses:**

- **400:** URL is required
- **400:** Invalid URL format
- **400:** Validation failed with user-friendly error message
- **401:** Unauthorized (no valid session)
- **500:** Failed to validate calendar URL

**User-Friendly Error Mapping:**

- **Network errors:** "Could not reach the calendar URL. Check the URL and your network connection."
- **Parse errors:** "The URL does not contain a valid iCal feed."
- **404:** "Calendar feed not found (404). Check the URL."
- **401/403:** "Access denied. The calendar URL may be private or require authentication."

**TypeScript Example:**

```typescript
// Validate before creating a feed
const validateResponse = await fetch('/api/admin/calendar/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://calendar.google.com/calendar/ical/.../basic.ics',
  }),
});

const { valid, eventCount, error } = await validateResponse.json();

if (valid) {
  console.log(`Valid feed with ${eventCount} events`);
  // Proceed to create feed
} else {
  console.error(`Invalid feed: ${error}`);
}
```

---

### Commute Management

#### GET /api/admin/commute

**Purpose:** Retrieve all configured commute routes.

**Authentication:** JWT session required

**Query Parameters:** None

**Response:**

```typescript
{
  "routes": [
    {
      "id": "route-123",
      "name": "Jack to Work",
      "originLat": 41.0454,
      "originLon": -85.1455,
      "destLat": 41.1327,
      "destLon": -85.1762,
      "arrivalTime": "08:00",
      "daysActive": "1,2,3,4,5", // 0=Sun, 1=Mon, ..., 6=Sat
      "enabled": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **500:** Failed to fetch commute routes

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/commute');
const { routes } = await response.json();

// Find routes active on Monday
const mondayRoutes = routes.filter((r) => r.daysActive.includes('1'));
```

---

#### POST /api/admin/commute

**Purpose:** Create a new commute route with validation.

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "name": "Lauren to School",
  "originLat": "41.0454", // -90 to 90
  "originLon": "-85.1455", // -180 to 180
  "destLat": "41.0421",
  "destLon": "-85.2409",
  "arrivalTime": "08:00", // HH:MM format (24-hour)
  "daysActive": "1,2,3,4,5", // Optional, defaults to weekdays
  "enabled": true // Optional, defaults to true
}
```

**Response:**

```typescript
{
  "route": {
    "id": "route-456",
    "name": "Lauren to School",
    "originLat": 41.0454,
    "originLon": -85.1455,
    "destLat": 41.0421,
    "destLon": -85.2409,
    "arrivalTime": "08:00",
    "daysActive": "1,2,3,4,5",
    "enabled": true,
    "createdAt": "2025-01-03T12:00:00.000Z",
    "updatedAt": "2025-01-03T12:00:00.000Z"
  }
}
```

**Validation Rules:**

- **originLat / destLat:** -90 to 90
- **originLon / destLon:** -180 to 180
- **arrivalTime:** HH:MM format (e.g., "08:00", "17:30")
- **daysActive:** Comma-separated numbers 0-6 (0=Sunday, 6=Saturday)

**Error Responses:**

- **400:** Name, origin coordinates, destination coordinates, and arrival time are required
- **400:** Origin/Destination latitude must be between -90 and 90
- **400:** Origin/Destination longitude must be between -180 and 180
- **400:** Arrival time must be in HH:MM format
- **400:** Days active must be comma-separated numbers 0-6
- **401:** Unauthorized (no valid session)
- **500:** Failed to create commute route

**Side Effects:**

- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `commute.create`

**TypeScript Example:**

```typescript
const response = await fetch('/api/admin/commute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Lauren to School',
    originLat: '41.0454',
    originLon: '-85.1455',
    destLat: '41.0421',
    destLon: '-85.2409',
    arrivalTime: '08:00',
    daysActive: '1,2,3,4,5', // Mon-Fri
    enabled: true,
  }),
});

const { route } = await response.json();
console.log(`Created route with ID: ${route.id}`);
```

---

#### PUT /api/admin/commute

**Purpose:** Bulk update commute routes (for enable/disable operations).

**Authentication:** JWT session required

**Request Body:**

```typescript
{
  "routes": [
    { "id": "route-123", "enabled": true },
    { "id": "route-456", "enabled": false }
  ]
}
```

**Response:**

```typescript
{
  "success": true
}
```

**Error Responses:**

- **400:** Routes array is required
- **401:** Unauthorized (no valid session)
- **500:** Failed to update commute routes

**Side Effects:**

- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `commute.update`

**TypeScript Example:**

```typescript
// Disable weekend routes
const response = await fetch('/api/admin/commute', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    routes: [
      { id: 'route-123', enabled: false },
      { id: 'route-456', enabled: false },
    ],
  }),
});

const { success } = await response.json();
```

---

#### DELETE /api/admin/commute/:id

**Purpose:** Delete a commute route by ID.

**Authentication:** JWT session required

**Path Parameters:**

| Parameter | Type   | Description       |
| --------- | ------ | ----------------- |
| id        | string | Commute route ID  |

**Request Body:** None

**Response:**

```typescript
{
  "success": true
}
```

**Error Responses:**

- **401:** Unauthorized (no valid session)
- **404:** Route not found
- **500:** Failed to delete commute route

**Side Effects:**

- Increments `configVersion` to trigger mirror auto-refresh
- Creates activity log entry with action `commute.delete`

**TypeScript Example:**

```typescript
const routeId = 'route-123';
const response = await fetch(`/api/admin/commute/${routeId}`, {
  method: 'DELETE',
});

if (response.ok) {
  console.log('Route deleted successfully');
}
```

---

### Utilities

#### GET /api/admin/geocode/search

**Purpose:** Search for locations using TomTom Search API with typeahead support. Used for address autocomplete in admin forms.

**Authentication:** JWT session required

**Query Parameters:**

| Parameter | Type   | Required | Description                             |
| --------- | ------ | -------- | --------------------------------------- |
| q         | string | Yes      | Search query (2-100 characters)         |

**Response:**

```typescript
{
  "results": [
    {
      "address": "1600 Pennsylvania Avenue NW, Washington, DC 20500",
      "lat": 38.8977,
      "lon": -77.0365
    },
    {
      "address": "1600 Pennsylvania St, Fort Wayne, IN 46802",
      "lat": 41.0732,
      "lon": -85.1394
    }
  ]
}
```

**Error Responses:**

- **400:** Query parameter "q" is required
- **400:** Query must be at least 2 characters
- **400:** Query must not exceed 100 characters
- **401:** Unauthorized (no valid session)

**Graceful Degradation:**

- If `TOMTOM_API_KEY` is missing, returns empty results with warning log
- If TomTom API fails, returns empty results (no error)

**Caching:**

- 24-hour cache (addresses rarely change)
- Reduces API usage on TomTom free tier (2,500 requests/day)

**TypeScript Example:**

```typescript
// Typeahead search as user types
const searchLocation = async (query: string) => {
  if (query.length < 2) return;

  const response = await fetch(
    `/api/admin/geocode/search?q=${encodeURIComponent(query)}`
  );
  const { results } = await response.json();

  return results.map((r) => ({
    label: r.address,
    coordinates: { lat: r.lat, lon: r.lon },
  }));
};

// Usage in autocomplete component
const suggestions = await searchLocation('1600 Penn');
// Returns:
// [
//   { label: "1600 Pennsylvania Avenue NW, Washington, DC 20500", coordinates: {...} },
//   { label: "1600 Pennsylvania St, Fort Wayne, IN 46802", coordinates: {...} }
// ]
```

---

## OAuth Routes

### GET /api/spotify/authorize

**Purpose:** Initiates Spotify OAuth flow

**Authentication:** None required

**Query Parameters:** None

**Response:** HTTP redirect to Spotify authorization page

**OAuth Scopes Requested:**
- `user-read-currently-playing` - Read current playback
- `user-read-playback-state` - Read playback state

**Redirect URI:** `http://localhost:3000/api/spotify/callback` (or production equivalent)

**Implementation:** Redirects to:
```
https://accounts.spotify.com/authorize?
  client_id=YOUR_CLIENT_ID&
  response_type=code&
  redirect_uri=YOUR_REDIRECT_URI&
  scope=user-read-currently-playing user-read-playback-state
```

---

### GET /api/spotify/callback

**Purpose:** Handles OAuth callback and exchanges authorization code for tokens

**Authentication:** None required (public callback endpoint)

**Query Parameters:**
- `code` (string, required) - Authorization code from Spotify
- `state` (string, optional) - CSRF protection token

**Response:** HTTP redirect to admin page with status message

**Token Exchange:**
1. Receives authorization code from Spotify
2. Exchanges code for access token + refresh token
3. Stores refresh token in database or instructs user to add to `.env.local`
4. Redirects to success/error page

**Manual Token Storage:**

After OAuth flow completes, add to `.env.local`:
```bash
SPOTIFY_REFRESH_TOKEN=your_refresh_token_here
```

**Error Handling:**
- Missing code parameter → Error page
- Token exchange failure → Error page with details

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed successfully |
| 204 | No Content | Spotify: Nothing currently playing |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid JWT (admin routes) |
| 403 | Forbidden | Valid JWT but insufficient permissions |
| 404 | Not Found | Route doesn't exist |
| 500 | Server Error | External API failure, database error |

### Common Error Response Format

```typescript
interface ErrorResponse {
  error: string; // Human-readable error message
  message?: string; // Additional context
  code?: string; // Error code (when applicable)
}
```

**Example:**

```json
{
  "error": "Failed to fetch weather",
  "message": "Open-Meteo API returned 503",
  "code": "EXTERNAL_API_ERROR"
}
```

---

## Rate Limiting & Caching

### Server-Side Caching

All routes use Next.js `revalidate` headers for automatic caching:

| Route | Cache Duration | Rationale |
|-------|----------------|-----------|
| `/api/calendar` | None | Fresh events needed |
| `/api/commute` | 5 minutes | Traffic changes frequently |
| `/api/feast-day` | None | Changes daily at midnight |
| `/api/news` | 5 minutes | Breaking news updates |
| `/api/spotify/now-playing` | None | Real-time playback |
| `/api/summary` | None | Generates fresh context |
| `/api/version` | None | Deployment detection |
| `/api/weather` | 15 minutes | Weather stable over short periods |
| `/api/config-version` | None | Admin config polling |

### External API Rate Limits

| Service | Limit | Mitigation |
|---------|-------|------------|
| Open-Meteo | 10,000 req/day | Server-side caching (15 min) |
| TomTom Routing | 2,500 req/day (free tier) | Caching (5 min) + workday-only widget |
| OpenRouter | Varies by model | Template fallback on failure |
| Spotify | None for refresh token flow | No special handling needed |
| RSS Feeds | Varies by provider | Parallel fetching + error handling |

### Client-Side Polling

Widgets poll API routes at different intervals:

```typescript
const REFRESH_INTERVALS = {
  weather: 15 * 60 * 1000,    // 15 minutes
  calendar: 5 * 60 * 1000,     // 5 minutes
  news: 10 * 60 * 1000,        // 10 minutes
  spotify: 10 * 1000,          // 10 seconds
  summary: 30 * 60 * 1000,     // 30 minutes (prod)
  commute: 5 * 60 * 1000,      // 5 minutes
  feastDay: 60 * 60 * 1000,    // 1 hour
  version: 30 * 1000,          // 30 seconds (prod)
};
```

---

## TypeScript Usage Examples

### Basic Fetch with Error Handling

```typescript
async function fetchWithRetry<T>(
  url: string,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Unreachable');
}

// Usage
const weather = await fetchWithRetry<WeatherResponse>('/api/weather');
```

### React Hook for API Polling

```typescript
import { useState, useEffect } from 'react';

function useApiPolling<T>(
  url: string,
  interval: number,
  initialData: T
) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');
        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // Initial fetch
    const timer = setInterval(fetchData, interval);
    return () => clearInterval(timer);
  }, [url, interval]);

  return { data, loading, error };
}

// Usage in component
function WeatherWidget() {
  const { data, loading, error } = useApiPolling<WeatherResponse>(
    '/api/weather',
    15 * 60 * 1000,
    { current: null, daily: [], location: '', lastUpdated: '' }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{data.current.temperature}°</div>;
}
```

### Parallel Data Fetching

```typescript
async function fetchAllWidgetData() {
  const [weather, calendar, news, spotify] = await Promise.all([
    fetch('/api/weather').then(r => r.json()),
    fetch('/api/calendar').then(r => r.json()),
    fetch('/api/news').then(r => r.json()),
    fetch('/api/spotify/now-playing').then(r => r.json()),
  ]);

  return { weather, calendar, news, spotify };
}
```

### Type-Safe API Client

```typescript
class MagicMirrorAPI {
  constructor(private baseUrl: string = '') {}

  async getWeather(): Promise<WeatherResponse> {
    const response = await fetch(`${this.baseUrl}/api/weather`);
    if (!response.ok) throw new Error('Weather fetch failed');
    return response.json();
  }

  async getCalendar(): Promise<CalendarResponse> {
    const response = await fetch(`${this.baseUrl}/api/calendar`);
    if (!response.ok) throw new Error('Calendar fetch failed');
    return response.json();
  }

  async getNews(): Promise<NewsResponse> {
    const response = await fetch(`${this.baseUrl}/api/news`);
    if (!response.ok) throw new Error('News fetch failed');
    return response.json();
  }

  // ... other methods
}

// Usage
const api = new MagicMirrorAPI();
const weather = await api.getWeather();
const calendar = await api.getCalendar();
```

---

## Additional Notes

### Production vs Development

- **Development:** `BUILD_TIME === "development"`, faster widget refreshes
- **Production:** `BUILD_TIME` set to Unix timestamp during build

### Security Considerations

1. **API Keys:** Never expose in client-side code (all API calls server-side)
2. **CORS:** Not configured (same-origin only)
3. **Rate Limiting:** None implemented (runs on private network)
4. **Input Validation:** Minimal (environment variables trusted)

### Performance Optimization

1. **Parallel Fetching:** All multi-source routes use `Promise.all()`
2. **Caching:** Strategic use of Next.js `revalidate` headers
3. **Fallback Data:** Demo data prevents widget failures
4. **Lazy Loading:** Widgets fetch on-demand, not during SSR

### Future Enhancements

- [ ] Complete admin portal implementation
- [ ] Add request/response logging
- [ ] Implement rate limiting for public network deployment
- [ ] Add webhook support for real-time calendar updates
- [ ] GraphQL API layer for complex queries
- [ ] OpenAPI/Swagger specification generation

---

**Documentation Version:** 1.0.0
**Last Updated:** January 1, 2026
**Maintainer:** Jack Jones
**Repository:** https://github.com/jjones-wps/jjones-magic-mirror
