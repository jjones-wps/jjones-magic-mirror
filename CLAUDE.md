# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A smart magic mirror display built with Next.js 16, designed for a 1080x2560 portrait display running on a Raspberry Pi. The mirror displays time, weather, calendar events, news, AI daily briefings, Spotify now-playing information, and Catholic feast days.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Current Development Setup (Dec 2024)

### Local Dev → Pi Display Workflow

The development environment runs on a Windows 11 machine with WSL2, displaying on a Raspberry Pi:

**Network Configuration:**
- Dev machine: 192.168.1.190 (WSL2 with mirrored networking)
- Raspberry Pi: 192.168.1.213 (kiosk mode with Chromium)
- Both on same network (192.168.1.x)

**Required Windows Setup (one-time):**
1. Port forwarding from Windows to WSL2:
   ```powershell
   # Run as Administrator
   netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3000 connectaddress=127.0.0.1 connectport=3001
   ```
2. Firewall rule for port 3000:
   ```powershell
   # Run as Administrator
   netsh advfirewall firewall add rule name="Magic Mirror Dev Server" dir=in action=allow protocol=TCP localport=3000
   ```

**Starting Dev Server:**
```bash
npm run dev -- -H 0.0.0.0
# Note: If port 3000 is taken by the port proxy, it will use 3001
# The port proxy forwards external :3000 → localhost:3001
```

**Pi Kiosk Config:**
- SSH: `ssh jjones@192.168.1.213` (password: WhatFish88!)
- Kiosk script: `/home/jjones/magic-mirror/kiosk.sh`
- URL configured: `http://192.168.1.190:3000`
- Auto-refresh: VersionChecker refreshes every 60s in dev mode

### Dev Mode Auto-Refresh

In development mode:
- **VersionChecker**: Full page refresh every 60 seconds
- **AISummary**: Refreshes every 2 minutes (vs 30 min in production)

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4 + custom design system
- **Animations**: Framer Motion
- **State**: React hooks (no external state library currently)
- **Calendar Parsing**: node-ical (server-side only)
- **Liturgical Calendar**: romcal (server-side)
- **Date Utilities**: date-fns

### Directory Structure
```
src/
├── app/
│   ├── api/           # Next.js API routes (server-side data fetching)
│   │   ├── calendar/  # iCal feed parser
│   │   ├── weather/   # Open-Meteo weather proxy
│   │   ├── news/      # News headlines with RSS parsing
│   │   ├── spotify/   # Spotify OAuth + now-playing
│   │   ├── summary/   # AI daily briefing (OpenRouter)
│   │   ├── version/   # Build version for auto-refresh
│   │   └── feast-day/ # Catholic liturgical calendar (romcal)
│   ├── globals.css    # Design system CSS variables + utilities
│   ├── layout.tsx     # Root layout with Syne + DM Sans fonts
│   └── page.tsx       # Main mirror page composition
├── components/
│   ├── widgets/       # Display widgets (Clock, Weather, Calendar, etc.)
│   └── VersionChecker.tsx  # Auto-refresh on version change
├── hooks/             # Custom React hooks (currently empty)
└── lib/
    ├── tokens.ts      # Framer Motion animation tokens
    ├── weather.ts     # Weather data types and client-side utils
    ├── calendar.ts    # Calendar types and demo data
    └── news.ts        # News data types
```

### Data Flow Pattern
1. **API Routes** (`/api/*`) fetch external data server-side with caching
2. **Widget Components** fetch from API routes client-side with `useEffect`
3. **Periodic Refresh** via `setInterval` (weather: 15min, calendar: 5min, etc.)

### Design System ("Quiet Presence")

The design follows strict principles documented in `docs/DESIGN_SYSTEM.md`:

- **Colors**: Pure monochrome only - white (#FFFFFF) on black (#000000)
- **Hierarchy via Opacity**: hero(1.0), primary(0.87), secondary(0.6), tertiary(0.38), disabled(0.2)
- **Typography**: Syne (display), DM Sans (body), weights 100-500 only (never bold)
- **Spacing**: 8px base unit
- **Animations**: GPU-accelerated only (transform + opacity), breathing rhythms (2-4s)
- **Target**: 1080x2560px portrait, optimized for Raspberry Pi performance

### Key CSS Classes
- `.mirror-container` - Fixed 1080x2560 viewport
- `.widget` - Standard widget padding
- `.text-mirror-*` - Design system typography scale (6xl to xs)
- `.opacity-*` - Design system opacity levels
- `.label` - Section header styling (uppercase, tracking-widest)
- `.divider-shimmer` - Animated gradient divider
- `.animate-breathe` - 3s breathing opacity animation

### Animation Tokens (lib/tokens.ts)
Framer Motion variants and springs for consistent animations across widgets. Key exports:
- `clockDigitVariants` - "Waterfall of Time" digit transitions
- `staggerContainer` / `staggerItem` - List stagger animations
- `fadeInUp`, `fadeOnly` - Presence animations
- `springs.gentle`, `springs.snappy` - Spring physics configs

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Calendar (iCal feeds from iCloud, Google, etc.)
CALENDAR_URL_PRIMARY=https://...
CALENDAR_URL_SECONDARY=https://...

# Weather location
WEATHER_LAT=41.0793
WEATHER_LON=-85.1394
WEATHER_LOCATION=Fort Wayne, IN

# Spotify (optional)
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...

# AI Summary (OpenRouter)
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=anthropic/claude-3-haiku
```

## Widget Development

When creating new widgets:

1. Use `"use client"` directive (all widgets are client components)
2. Import tokens from `@/lib/tokens` for consistent animations
3. Use design system CSS classes for typography and opacity
4. Implement loading/error states with `.opacity-disabled`
5. Add periodic data refresh via `setInterval` in `useEffect`
6. Follow the existing widget patterns (Weather.tsx, Calendar.tsx are good examples)

## Recent Changes (Dec 31, 2024 Session)

### AI Summary Enhancements
- **Time-aware greetings**: LLM prompt now uses dynamic time-of-day ("morning", "afternoon", "evening", "night") instead of hardcoded "morning"
- **News context**: LLM now receives article descriptions (up to 300 chars) in addition to headlines for better context
- **Faster dev refresh**: Summary refreshes every 2 minutes in dev mode

### News API Improvements
- Fixed HTML entity decoding (added generic `&#NNN;` decoder for entities like `&#039;`)
- Increased description length from 200 to 300 characters

### Catholic Feast Day Feature (NEW)
- **API**: `/api/feast-day` using `romcal` library with US Catholic calendar
- **Display**: Shows feast day between date and greeting in Clock component
- Returns: feastDay name, liturgical season, color, and rank
- Refreshes hourly

### Version Checker Updates
- In dev mode (`BUILD_TIME === "development"`), auto-refreshes page every 60 seconds
- Production mode unchanged (polls for version changes every 30 seconds)

## Performance Considerations

Target device is Raspberry Pi:
- Only animate `transform` and `opacity` (GPU-accelerated)
- Avoid backdrop-blur, SVG filters, heavy particle systems
- Keep animations smooth (2-4 second breathing rhythms)
- Respect `prefers-reduced-motion` media query

## Deployment (Coolify on TrueNAS)

The app is deployed via Coolify with push-to-deploy:

1. Push to `main` branch triggers automatic rebuild
2. Coolify builds using the multi-stage `Dockerfile`
3. `BUILD_TIME` env var is set at build time for version tracking
4. Pi's browser points to `http://truenas:3000` (or configured hostname)

### Version-Aware Auto-Refresh

The `VersionChecker` component (`src/components/VersionChecker.tsx`):
- Polls `/api/version` every 30 seconds
- Compares `BUILD_TIME` from build vs current server
- On mismatch, shows "Updating..." indicator and refreshes after 2s

This enables seamless deploys without manual Pi intervention.

## Key Files Modified This Session

| File | Changes |
|------|---------|
| `src/app/api/summary/route.ts` | Added `getTimeOfDay()` for dynamic prompts, enhanced news context with descriptions |
| `src/app/api/news/route.ts` | Fixed HTML entity decoding, increased description limit to 300 chars |
| `src/app/api/feast-day/route.ts` | NEW - Catholic liturgical calendar using romcal |
| `src/components/widgets/Clock.tsx` | Added feast day fetching and display |
| `src/components/widgets/AISummary.tsx` | Dev mode 2-minute refresh |
| `src/components/VersionChecker.tsx` | Dev mode 60-second auto-refresh |

## Dependencies Added

- `romcal` - Catholic liturgical calendar calculations (generates feast days, seasons, colors locally without external API)
