# Magic Mirror

[![Deploy](https://github.com/jjones-wps/jjones-magic-mirror/actions/workflows/deploy.yml/badge.svg)](https://github.com/jjones-wps/jjones-magic-mirror/actions/workflows/deploy.yml)

A smart magic mirror display built with Next.js, designed for a 1080x2560 portrait display running on a Raspberry Pi.

## Features

- **Clock** - Large time display with animated digit transitions
- **Weather** - Current conditions and hourly forecast via Open-Meteo
- **Calendar** - Events from iCal feeds (iCloud, Google, etc.)
- **News** - Headlines with RSS feed parsing
- **AI Daily Briefing** - Personalized morning summary via OpenRouter
- **Spotify Now Playing** - Currently playing track with OAuth integration
- **Catholic Feast Days** - Liturgical calendar via romcal
- **Commute Times** - Traffic-aware routing via TomTom (workday mornings)

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4 + custom design system
- **Animations**: Framer Motion
- **Calendar Parsing**: node-ical
- **Liturgical Calendar**: romcal
- **Date Utilities**: date-fns

## Design System

The "Quiet Presence" design follows strict minimalist principles:

- Pure monochrome (white on black)
- Hierarchy through opacity levels
- GPU-accelerated animations only (transform + opacity)
- Optimized for Raspberry Pi performance

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/jjones-magic-mirror.git
cd jjones-magic-mirror

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your API keys and configuration

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the mirror.

## Environment Variables

Create a `.env.local` file with the following:

```bash
# Calendar (iCal feeds)
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

# TomTom Commute
TOMTOM_API_KEY=...
COMMUTE_1_NAME=Person1
COMMUTE_1_ORIGIN=lat,lon
COMMUTE_1_DESTINATION=lat,lon
COMMUTE_1_ARRIVAL_TIME=08:00
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Raspberry Pi Deployment

The mirror runs on a Raspberry Pi with pm2 process manager and **automated push-to-deploy** via GitHub Actions.

### Deploy Changes

Just push to main - deployment is automatic:

```bash
git push origin main
```

A self-hosted GitHub Actions runner on the Pi will:
1. Pull latest from git
2. Install dependencies
3. Build for production
4. Restart the pm2 server
5. Verify health

Monitor deploys at the [Actions tab](https://github.com/jjones-wps/jjones-magic-mirror/actions).

### Auto-Refresh

The `VersionChecker` component polls for version changes and automatically refreshes the display when updates are deployed.

## Project Structure

```
src/
├── app/
│   ├── api/           # Server-side API routes
│   │   ├── calendar/  # iCal feed parser
│   │   ├── commute/   # TomTom traffic routing
│   │   ├── feast-day/ # Catholic liturgical calendar
│   │   ├── news/      # RSS news headlines
│   │   ├── spotify/   # Spotify OAuth + now-playing
│   │   ├── summary/   # AI daily briefing
│   │   ├── version/   # Build version for auto-refresh
│   │   └── weather/   # Weather data proxy
│   ├── globals.css    # Design system + utilities
│   ├── layout.tsx     # Root layout with fonts
│   └── page.tsx       # Main mirror composition
├── components/
│   └── widgets/       # Display widgets
└── lib/               # Utilities and types
```

## License

MIT
