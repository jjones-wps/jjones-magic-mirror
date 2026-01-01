# Magic Mirror API Documentation

**Last Updated:** January 1, 2026
**Version:** 1.0.0
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
- [Admin API Routes](#admin-api-routes) (Incomplete)
  - [GET/PUT /api/admin/settings](#getput-apiadminsettings)
  - [GET /api/admin/mirror/status](#get-apiadminmirrorstatus)
  - [POST /api/admin/mirror/refresh](#post-apiadminmirrorrefresh)
  - [GET/PUT /api/admin/widgets](#getput-apiadminwidgets)
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

**⚠️ Note:** Admin portal is currently **incomplete** with 0% test coverage. These routes are excluded from production builds using `@ts-nocheck` directives. Documentation below is for reference only.

### GET/PUT /api/admin/settings

**Status:** 🚧 Incomplete
**Authentication:** JWT required
**Purpose:** Manage system-wide mirror settings

**Implementation:** Not fully implemented

---

### GET /api/admin/mirror/status

**Status:** 🚧 Incomplete
**Authentication:** JWT required
**Purpose:** Health check and system status

**Implementation:** Not fully implemented

---

### POST /api/admin/mirror/refresh

**Status:** 🚧 Incomplete
**Authentication:** JWT required
**Purpose:** Force mirror display refresh

**Implementation:** Not fully implemented

---

### GET/PUT /api/admin/widgets

**Status:** 🚧 Incomplete
**Authentication:** JWT required
**Purpose:** Configure widget visibility and settings

**Implementation:** Not fully implemented

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
