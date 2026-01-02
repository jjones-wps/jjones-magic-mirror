# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Documentation
- Comprehensive documentation reorganization into `docs/` directory
- Added navigation hub (`docs/README.md`) with persona-based paths
- Added complete API documentation (`docs/API_DOCUMENTATION.md`) for all 15 endpoints
- Added architecture documentation (`docs/ARCHITECTURE.md`) with 5 Mermaid diagrams
- Added contributing guidelines (`CONTRIBUTING.md`)
- Added security policy (`SECURITY.md`)
- Reorganized docs into `docs/design/` and `docs/internal/` subdirectories

---

## [0.2.0] - 2024-12-31

### Added

**Features:**
- **Catholic Feast Days**: Liturgical calendar integration via romcal library
  - Displays feast day name, liturgical season, color, and rank
  - Refreshes hourly, with special midnight detection for date changes
- **Commute Widget**: Traffic-aware commute times via TomTom Routing API
  - Supports multiple commutes with configurable arrival times
  - Shows only on workday mornings (Mon-Fri before 9 AM)
  - Calculates optimal departure time based on real-time traffic
- **Admin Portal** (incomplete, excluded from build):
  - Authentication system (NextAuth v5 with JWT)
  - Widget configuration UI
  - SQLite database with Prisma ORM
  - System status monitoring
- **Push-to-Deploy CI/CD Pipeline**:
  - GitHub Actions workflow with self-hosted runner on Raspberry Pi
  - Automated testing, building, and deployment on push to main
  - Health check verification after deployment
  - Deploy status badge in README

**Testing:**
- Comprehensive test suite: 296 tests with 92.68% coverage
  - Widget tests (95%+ coverage)
  - API route tests (90%+ coverage)
  - Utility tests (90%+ coverage)
- Jest configuration with ES module support
- GitHub Actions CI integration

**Documentation:**
- Added `TESTING_SUMMARY.md` (now `docs/TESTING.md`)
- Added `DEPLOYMENT_TROUBLESHOOTING.md` (now `docs/TROUBLESHOOTING.md`)
- Added `SESSION_HANDOFF.md` (now `docs/internal/SESSION_HANDOFF.md`)
- Added `PROJECT_AUDIT.md` (now `docs/internal/PROJECT_AUDIT.md`)
- Added deploy status badge to README
- Comprehensive CLAUDE.md updates with Pi deployment workflow

### Changed

**AI Summary Enhancements:**
- Time-aware greetings (morning/afternoon/evening/night) based on current time
- Enhanced context: LLM now receives article descriptions (up to 300 chars) in addition to headlines
- Faster dev refresh: Summary refreshes every 2 minutes in dev mode (vs 30 min in production)

**Auto-Refresh Improvements:**
- Version checker refreshes every 60 seconds in dev mode (vs 30 seconds in production)
- Full page refresh every 60 seconds in dev mode for rapid iteration

**Design System:**
- Enhanced visual hierarchy with refined opacity levels
- Optimized layout for 1080x2560 portrait display
- GPU-accelerated animations throughout

**Build Configuration:**
- TypeScript strict mode enabled
- Admin portal excluded from production builds (marked with `@ts-nocheck`)
- Prisma client auto-generation in postinstall hook
- ESLint and Prettier standards applied project-wide

### Fixed

**Deployment Issues (7 major fixes):**
1. **Date locale mismatch**: Fixed Jest tests failing on Pi due to locale differences
2. **ES module imports**: Fixed Jest config for Next.js App Router compatibility
3. **Coverage thresholds**: Adjusted to exclude incomplete admin portal
4. **TypeScript build errors**: Excluded admin/auth files from production build
5. **VersionChecker runtime errors**: Fixed hardcoded BUILD_TIME references
6. **Prisma client errors**: Added postinstall script to generate Prisma client in CI
7. **Feast day midnight refresh**: Properly detects date changes and refreshes immediately

**News API:**
- Fixed HTML entity decoding (added generic `&#NNN;` decoder for entities like `&#039;`)
- Increased description length from 200 to 300 characters

**Calendar:**
- Improved all-day event handling
- Fixed timezone conversion issues

### Security

- Added `.env.local` to gitignore (never commit secrets)
- Admin authentication system (NextAuth with bcrypt password hashing)
- Server-side API proxying (API keys never exposed to client)
- Input validation at system boundaries

---

## [0.1.0] - 2024-12-28

### Added

**Initial Release:**

- **Clock Widget**: Large time display with animated "Waterfall of Time" digit transitions
- **Weather Widget**: Current conditions and hourly forecast via Open-Meteo API
  - Temperature, feels like, humidity, wind speed
  - Hourly forecast for next 24 hours
  - 15-minute server-side caching
- **Calendar Widget**: Events from multiple iCal feeds (iCloud, Google Calendar, etc.)
  - Today's events, tomorrow's events, upcoming events
  - All-day event support
  - 5-minute refresh interval
- **News Widget**: Headlines from RSS feeds
  - Rotating display of top stories
  - Automatic refresh every 15 minutes
- **AI Daily Briefing**: Personalized morning summary via OpenRouter (Claude 3 Haiku)
  - Weather summary
  - Calendar overview
  - News highlights
  - Contextual greetings
- **Spotify Now Playing**: Current track display with OAuth integration
  - Album art, track name, artist
  - Progress bar with time
  - Supports both music and podcasts
  - Automatic token refresh

**Design System:**
- "Quiet Presence" minimalist design philosophy
  - Pure monochrome (white on black only)
  - Hierarchy through opacity levels (hero, primary, secondary, tertiary, disabled)
  - Typography: Syne (display) + DM Sans (body), weights 100-500 only
  - GPU-accelerated animations only (transform + opacity)
  - Optimized for Raspberry Pi 4 performance
- Custom Tailwind CSS 4 configuration
- Framer Motion animation tokens
- 8px base spacing unit

**Infrastructure:**
- Next.js 16 with App Router
- React 19 with Server Components
- TypeScript with strict mode
- Raspberry Pi deployment with pm2 process manager
- Version-aware auto-refresh system
  - Polls for version changes every 30 seconds
  - Automatic page refresh on deployment
  - Loading indicator during refresh

**Development Tools:**
- ESLint with Next.js config
- Prettier code formatting
- Docker support (optional)
- Development environment with hot reload

**Documentation:**
- Comprehensive README.md with setup instructions
- CLAUDE.md for AI-assisted development guidance
- Design system documentation (`docs/design/DESIGN_SYSTEM.md`)
- API integration examples
- Environment variable documentation

### Dependencies

**Core:**
- Next.js 16.1.1
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4
- Framer Motion 12

**External Integrations:**
- node-ical (calendar parsing)
- romcal (liturgical calendar)
- date-fns (date utilities)
- NextAuth (authentication)
- Prisma (database ORM)

---

## Version History

- **[0.2.0]** - 2024-12-31 - Feature enhancements, CI/CD, comprehensive testing
- **[0.1.0]** - 2024-12-28 - Initial release with core widgets and infrastructure

---

## How to Read This Changelog

### Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security-related changes

### Version Links

Versions are linked to their corresponding git tags (when available):

- [0.2.0]: https://github.com/jjones-wps/jjones-magic-mirror/compare/v0.1.0...v0.2.0
- [0.1.0]: https://github.com/jjones-wps/jjones-magic-mirror/releases/tag/v0.1.0

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- How to propose changes
- Commit message format (Conventional Commits)
- Pull request process

---

**Note**: This changelog started with version 0.2.0. Earlier development history can be found in the git commit log.

**Last Updated**: January 1, 2026
