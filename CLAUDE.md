# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A smart magic mirror display built with Next.js 16, designed for a 1080x2560 portrait display running on a Raspberry Pi. The mirror displays time, weather, calendar events, news, AI daily briefings, and Spotify now-playing information.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4 + custom design system
- **Animations**: Framer Motion
- **State**: React hooks (no external state library currently)
- **Calendar Parsing**: node-ical (server-side only)
- **Date Utilities**: date-fns

### Directory Structure
```
src/
├── app/
│   ├── api/           # Next.js API routes (server-side data fetching)
│   │   ├── calendar/  # iCal feed parser
│   │   ├── weather/   # Open-Meteo weather proxy
│   │   ├── news/      # News headlines
│   │   ├── spotify/   # Spotify OAuth + now-playing
│   │   └── summary/   # AI daily briefing
│   ├── globals.css    # Design system CSS variables + utilities
│   ├── layout.tsx     # Root layout with Syne + DM Sans fonts
│   └── page.tsx       # Main mirror page composition
├── components/
│   └── widgets/       # Display widgets (Clock, Weather, Calendar, etc.)
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
```

## Widget Development

When creating new widgets:

1. Use `"use client"` directive (all widgets are client components)
2. Import tokens from `@/lib/tokens` for consistent animations
3. Use design system CSS classes for typography and opacity
4. Implement loading/error states with `.opacity-disabled`
5. Add periodic data refresh via `setInterval` in `useEffect`
6. Follow the existing widget patterns (Weather.tsx, Calendar.tsx are good examples)

## Performance Considerations

Target device is Raspberry Pi:
- Only animate `transform` and `opacity` (GPU-accelerated)
- Avoid backdrop-blur, SVG filters, heavy particle systems
- Keep animations smooth (2-4 second breathing rhythms)
- Respect `prefers-reduced-motion` media query
