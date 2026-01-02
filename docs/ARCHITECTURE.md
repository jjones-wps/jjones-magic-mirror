# Magic Mirror Architecture

**Last Updated:** January 1, 2026
**Version:** 1.0.0
**Project:** Smart Magic Mirror Display for Raspberry Pi

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagrams](#architecture-diagrams)
  - [System Component Diagram](#system-component-diagram)
  - [Data Flow Diagram](#data-flow-diagram)
  - [Deployment Architecture](#deployment-architecture)
  - [Authentication Flow](#authentication-flow)
  - [Widget Lifecycle](#widget-lifecycle)
  - [Caching Strategy](#caching-strategy)
- [Technology Stack](#technology-stack)
- [Key Architectural Decisions](#key-architectural-decisions)
- [Performance Considerations](#performance-considerations)
- [Scalability & Future Growth](#scalability--future-growth)

---

## System Overview

The Magic Mirror is a **Next.js 16-based smart display application** designed to run on a Raspberry Pi in portrait mode (1080x2560). It displays real-time information through modular widgets that fetch data from various external APIs server-side, with client-side polling for updates.

### Core Principles

1. **Server-Side Data Fetching** - All external API calls happen server-side for security and caching
2. **Client-Side Polling** - Widgets refresh at appropriate intervals (5-30 minutes)
3. **Graceful Degradation** - Demo/fallback data when external APIs fail
4. **Monorepo Structure** - Single Next.js app with clear separation of concerns
5. **Continuous Deployment** - Push-to-deploy via GitHub Actions self-hosted runner

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Magic Mirror Display                 │
│              (Chromium Kiosk on Raspberry Pi)           │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Clock   │  │ Weather  │  │ Calendar │  ... (8 widgets)
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │             │                     │
│       └─────────────┼─────────────┘                     │
│                     │                                   │
└─────────────────────┼───────────────────────────────────┘
                      │ HTTP polling (5-30 min intervals)
                      ▼
┌─────────────────────────────────────────────────────────┐
│               Next.js Server (port 3000)                │
│                     (pm2-managed)                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │          API Routes (/api/*)                   │    │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐       │    │
│  │  │ Weather │  │Calendar │  │  News    │       │    │
│  │  └────┬────┘  └────┬────┘  └────┬─────┘       │    │
│  └───────┼────────────┼────────────┼──────────────┘    │
└──────────┼────────────┼────────────┼───────────────────┘
           │            │            │
           ▼            ▼            ▼
  ┌─────────────┐ ┌──────────┐ ┌─────────┐
  │ Open-Meteo  │ │  iCloud  │ │   RSS   │
  │     API     │ │  iCal    │ │  Feeds  │
  └─────────────┘ └──────────┘ └─────────┘
```

---

## Architecture Diagrams

### System Component Diagram

```mermaid
graph TB
    subgraph "Raspberry Pi Hardware"
        Browser[Chromium Kiosk<br/>1080x2560 Portrait]
        Server[Next.js Server<br/>pm2-managed]
        DB[(SQLite Database<br/>Admin Config)]
        Runner[GitHub Actions<br/>Self-Hosted Runner]
    end

    subgraph "Client-Side Widgets"
        Clock[Clock Widget]
        Weather[Weather Widget]
        Calendar[Calendar Widget]
        News[News Widget]
        Summary[AI Summary Widget]
        Spotify[Spotify Widget]
        Commute[Commute Widget]
        Feast[Feast Day Widget]
    end

    subgraph "Server-Side API Routes"
        WeatherAPI[/api/weather]
        CalendarAPI[/api/calendar]
        NewsAPI[/api/news]
        SummaryAPI[/api/summary]
        SpotifyAPI[/api/spotify/now-playing]
        CommuteAPI[/api/commute]
        FeastAPI[/api/feast-day]
        VersionAPI[/api/version]
    end

    subgraph "External Services"
        OpenMeteo[Open-Meteo<br/>Weather API]
        iCloud[iCloud/Google<br/>iCal Feeds]
        RSS[RSS News Feeds<br/>NY Times, BBC, etc.]
        OpenRouter[OpenRouter<br/>Claude 3 Haiku]
        SpotifyExt[Spotify API<br/>OAuth]
        TomTom[TomTom Routing<br/>Traffic API]
        Romcal[romcal Library<br/>Local Calendar]
    end

    subgraph "CI/CD Pipeline"
        GitHub[GitHub Repository]
        Actions[GitHub Actions<br/>Workflow]
    end

    %% Client → Server
    Browser --> Clock
    Browser --> Weather
    Browser --> Calendar
    Browser --> News
    Browser --> Summary
    Browser --> Spotify
    Browser --> Commute
    Browser --> Feast

    Clock --> VersionAPI
    Weather --> WeatherAPI
    Calendar --> CalendarAPI
    News --> NewsAPI
    Summary --> SummaryAPI
    Spotify --> SpotifyAPI
    Commute --> CommuteAPI
    Feast --> FeastAPI

    %% Server → External APIs
    WeatherAPI --> OpenMeteo
    CalendarAPI --> iCloud
    NewsAPI --> RSS
    SummaryAPI --> OpenRouter
    SummaryAPI --> WeatherAPI
    SummaryAPI --> CalendarAPI
    SummaryAPI --> NewsAPI
    SpotifyAPI --> SpotifyExt
    CommuteAPI --> TomTom
    FeastAPI --> Romcal

    %% Database connections
    Server --> DB
    VersionAPI -.-> DB

    %% CI/CD
    GitHub --> Actions
    Actions --> Runner
    Runner --> Server

    %% Styling
    classDef widget fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
    classDef api fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
    classDef external fill:#FF9800,stroke:#333,stroke-width:2px,color:#fff
    classDef infra fill:#9C27B0,stroke:#333,stroke-width:2px,color:#fff

    class Clock,Weather,Calendar,News,Summary,Spotify,Commute,Feast widget
    class WeatherAPI,CalendarAPI,NewsAPI,SummaryAPI,SpotifyAPI,CommuteAPI,FeastAPI,VersionAPI api
    class OpenMeteo,iCloud,RSS,OpenRouter,SpotifyExt,TomTom,Romcal external
    class Browser,Server,DB,GitHub,Actions,Runner infra
```

---

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant Widget as Widget Component<br/>(Client-Side)
    participant Cache as Next.js Cache<br/>(Server-Side)
    participant API as API Route<br/>(Server-Side)
    participant External as External API<br/>(Open-Meteo, etc.)

    Note over Widget: User opens mirror<br/>Widget mounts

    Widget->>API: GET /api/weather

    alt Cache Hit (< 15 min old)
        Cache-->>Widget: Return cached data
        Note over Widget: Display weather<br/>immediately
    else Cache Miss or Expired
        API->>External: Fetch fresh data
        External-->>API: Weather JSON
        Note over API: Transform data<br/>Round temperatures<br/>Simplify structure
        API->>Cache: Store with revalidate: 900s
        API-->>Widget: Return transformed data
        Note over Widget: Display weather
    end

    Note over Widget: Wait 15 minutes

    Widget->>API: GET /api/weather (refresh)
    Note over API,Cache: Cache still valid
    Cache-->>Widget: Return cached data

    Note over Widget: Wait 15 minutes

    Widget->>API: GET /api/weather (refresh)
    Note over API,Cache: Cache expired
    API->>External: Fetch fresh data
    External-->>API: Updated weather
    API->>Cache: Update cache
    API-->>Widget: Return new data
    Note over Widget: Update display
```

#### Calendar Data Flow (Merge Pattern)

```mermaid
graph LR
    subgraph "Client Side"
        CalWidget[Calendar Widget]
    end

    subgraph "Server Side"
        CalAPI[/api/calendar]
    end

    subgraph "External Sources"
        iCloud1[iCloud Calendar 1<br/>Primary]
        iCloud2[iCloud Calendar 2<br/>Secondary]
    end

    subgraph "Processing"
        Fetch1[Fetch Feed 1]
        Fetch2[Fetch Feed 2]
        Parse1[Parse iCal<br/>node-ical]
        Parse2[Parse iCal<br/>node-ical]
        Merge[Merge & Sort<br/>by start time]
        Categorize[Categorize<br/>Today/Tomorrow/Upcoming]
    end

    CalWidget -->|GET request| CalAPI
    CalAPI -->|Parallel fetch| Fetch1
    CalAPI -->|Parallel fetch| Fetch2
    Fetch1 --> iCloud1
    Fetch2 --> iCloud2
    iCloud1 --> Parse1
    iCloud2 --> Parse2
    Parse1 --> Merge
    Parse2 --> Merge
    Merge --> Categorize
    Categorize -->|JSON response| CalWidget

    style Merge fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
    style Categorize fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
```

---

### Deployment Architecture

```mermaid
graph TB
    subgraph "Development Machine"
        Dev[Developer]
        Git[Git Repository<br/>Local]
    end

    subgraph "GitHub Cloud"
        Repo[GitHub Repository<br/>jjones-wps/jjones-magic-mirror]
        Actions[GitHub Actions<br/>deploy.yml Workflow]
    end

    subgraph "Raspberry Pi 192.168.1.213"
        Runner[Self-Hosted Runner<br/>~/actions-runner]
        Deploy[deploy.sh Script]
        Files[Project Files<br/>~/magic-mirror/]
        PM2[pm2 Process Manager]
        NextJS[Next.js Server<br/>Port 3000]
        Chromium[Chromium Kiosk<br/>http://localhost:3000]
        Display[HDMI Display<br/>1080x2560]
    end

    %% Development flow
    Dev -->|git push origin main| Git
    Git -->|push trigger| Repo
    Repo -->|webhook| Actions

    %% CI/CD flow
    Actions -->|Job 1: Run Tests| Actions
    Actions -->|✓ Tests Pass| Runner
    Runner -->|Job 2: Deploy| Deploy

    %% Deployment steps
    Deploy -->|1. git reset --hard| Files
    Deploy -->|2. npm ci| Files
    Deploy -->|3. npm run build| Files
    Deploy -->|4. pm2 restart| PM2
    PM2 -->|manage| NextJS

    %% Runtime flow
    NextJS -->|serve| Chromium
    Chromium -->|render| Display

    %% Health check
    Deploy -->|5. curl localhost:3000| NextJS
    NextJS -.->|HTTP 200| Deploy
    Deploy -.->|✓ Success| Actions

    %% Styling
    classDef dev fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
    classDef github fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
    classDef pi fill:#FF9800,stroke:#333,stroke-width:2px,color:#000
    classDef deploy fill:#9C27B0,stroke:#333,stroke-width:2px,color:#fff

    class Dev,Git dev
    class Repo,Actions github
    class Runner,Deploy,Files,PM2,NextJS,Chromium,Display pi
```

#### Deployment Sequence

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GitHub
    participant Runner as Pi Runner
    participant Deploy as deploy.sh
    participant PM2
    participant NextJS as Next.js Server
    participant Health as Health Check

    Dev->>GitHub: git push origin main
    Note over GitHub: Trigger workflow<br/>deploy.yml

    GitHub->>Runner: Start "Run Tests" job
    Runner->>Runner: npm ci
    Runner->>Runner: npm run test:ci
    alt Tests Pass
        Runner-->>GitHub: ✅ Tests passed (296 tests, 88.88% coverage)
    else Tests Fail
        Runner-->>GitHub: ❌ Tests failed
        Note over GitHub: Deployment stops
    end

    GitHub->>Runner: Start "Deploy to Pi" job
    Runner->>Deploy: Execute deploy.sh

    Note over Deploy: Deployment Steps
    Deploy->>Deploy: 1. git reset --hard origin/main
    Deploy->>Deploy: 2. npm ci (install deps)
    Deploy->>Deploy: 3. prisma generate
    Deploy->>Deploy: 4. npm run build

    Deploy->>PM2: pm2 restart magic-mirror
    PM2->>NextJS: Restart server
    NextJS-->>PM2: Server ready

    Deploy->>Health: curl http://localhost:3000
    Health-->>Deploy: HTTP 200 OK

    Deploy-->>Runner: ✅ Deployment successful
    Runner-->>GitHub: Job complete

    Note over NextJS: Server running<br/>Build time: 1735686000000
```

---

### Authentication Flow

**⚠️ Note:** Admin portal currently incomplete. This diagram represents planned architecture.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextAuth as NextAuth API<br/>/api/auth
    participant Middleware as Next.js Middleware
    participant AdminAPI as Admin API Route
    participant DB as SQLite Database

    Note over User,DB: Initial Login
    User->>Browser: Navigate to /admin/login
    Browser->>Browser: Render login form
    User->>Browser: Submit email + password
    Browser->>NextAuth: POST /api/auth/signin

    NextAuth->>DB: Query user by email
    DB-->>NextAuth: User record (hashed password)
    NextAuth->>NextAuth: bcrypt.compare(password, hash)

    alt Password Valid
        NextAuth->>NextAuth: Generate JWT<br/>Claims: id, email, role
        NextAuth->>Browser: Set HTTP-only cookie<br/>auth-token
        NextAuth-->>Browser: Redirect to /admin
        Note over Browser: Cookie stored<br/>Subsequent requests<br/>include token
    else Password Invalid
        NextAuth-->>Browser: 401 Unauthorized
        Browser->>User: Show error message
    end

    Note over User,DB: Protected API Request
    User->>Browser: Click "Refresh Mirror"
    Browser->>AdminAPI: POST /admin/mirror/refresh<br/>Cookie: auth-token

    Middleware->>Middleware: Extract JWT from cookie
    Middleware->>Middleware: Verify signature<br/>Check expiration

    alt Token Valid
        Middleware->>AdminAPI: Forward request<br/>+ decoded JWT
        AdminAPI->>DB: Update systemState
        DB-->>AdminAPI: Success
        AdminAPI-->>Browser: 200 OK
        Browser->>User: Show success message
    else Token Invalid/Expired
        Middleware-->>Browser: 401 Redirect to /login
        Browser->>User: Show login page
    end

    Note over User,DB: Session Expiration (30 days)
    Note over Browser: JWT expires
    Browser->>AdminAPI: Request with expired token
    Middleware->>Middleware: Verify fails (expired)
    Middleware-->>Browser: 401 Redirect to /login
    User->>Browser: Re-authenticate
```

#### JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": "user-uuid",
    "email": "admin@example.com",
    "role": "admin",
    "iat": 1735686000,
    "exp": 1738278000
  },
  "signature": "HMACSHA256(...)"
}
```

---

### Widget Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Mounting: Component renders

    Mounting --> FetchingInitial: useEffect() runs
    FetchingInitial --> DisplayingData: API call succeeds
    FetchingInitial --> DisplayingError: API call fails
    FetchingInitial --> DisplayingDemo: Fallback to demo data

    DisplayingData --> PollingInterval: Set interval timer
    DisplayingError --> PollingInterval: Set interval timer
    DisplayingDemo --> PollingInterval: Set interval timer

    PollingInterval --> FetchingUpdate: Timer fires (5-30 min)
    FetchingUpdate --> DisplayingData: Update succeeds
    FetchingUpdate --> DisplayingError: Update fails
    FetchingUpdate --> DisplayingData: Keep previous data

    DisplayingData --> Unmounting: User navigates away
    DisplayingError --> Unmounting: User navigates away
    DisplayingDemo --> Unmounting: User navigates away

    Unmounting --> Cleanup: clearInterval()
    Cleanup --> [*]

    note right of FetchingInitial
        Fetch /api/weather
        /api/calendar
        /api/news, etc.
    end note

    note right of PollingInterval
        Weather: 15 min
        Calendar: 5 min
        News: 10 min
        Spotify: 10 sec
    end note

    note right of DisplayingData
        Animate transitions
        Update UI
        Cache in state
    end note
```

---

### Caching Strategy

The application uses a multi-tier caching approach to optimize performance and reduce external API calls.

```mermaid
graph TB
    subgraph "Client Side (Browser)"
        Widget[Widget Component]
        LocalState[Local State<br/>useState/useEffect]
        MemCache[In-Memory Cache<br/>Component State]
    end

    subgraph "Server Side (Next.js)"
        APIRoute[API Route Handler]
        NextCache[Next.js Cache<br/>fetch with revalidate]
        ResponseCache[Response Cache<br/>Memory]
    end

    subgraph "External APIs"
        External1[Open-Meteo]
        External2[iCloud iCal]
        External3[OpenRouter AI]
        External4[Spotify]
        External5[TomTom]
    end

    %% Request Flow
    Widget -->|1. Fetch data<br/>Every N minutes| APIRoute

    APIRoute -->|2. Check cache| NextCache

    NextCache -->|Cache HIT<br/>< revalidate time| APIRoute
    NextCache -->|Cache MISS<br/>or expired| External1
    NextCache -->|Cache MISS<br/>or expired| External2
    NextCache -->|Cache MISS<br/>or expired| External3
    NextCache -->|Cache MISS<br/>or expired| External4
    NextCache -->|Cache MISS<br/>or expired| External5

    External1 -->|Fresh data| NextCache
    External2 -->|Fresh data| NextCache
    External3 -->|Fresh data| NextCache
    External4 -->|Fresh data| NextCache
    External5 -->|Fresh data| NextCache

    NextCache -->|Store with<br/>revalidate timer| ResponseCache
    APIRoute -->|3. Return JSON| Widget
    Widget -->|4. Store in state| MemCache

    %% Cache Lifetimes
    note1[Weather: 15 min<br/>Calendar: 5 min<br/>News: 15 min]
    note2[AI Summary: 30 min<br/>Spotify: Real-time<br/>Commute: 5 min]

    NextCache -.-> note1
    MemCache -.-> note2

    %% Styling
    classDef client fill:#4CAF50,stroke:#2e7d32,stroke-width:2px,color:#fff
    classDef server fill:#2196F3,stroke:#1565c0,stroke-width:2px,color:#fff
    classDef external fill:#FF9800,stroke:#e65100,stroke-width:2px,color:#000
    classDef cache fill:#9C27B0,stroke:#6a1b9a,stroke-width:2px,color:#fff

    class Widget,LocalState,MemCache client
    class APIRoute server
    class NextCache,ResponseCache cache
    class External1,External2,External3,External4,External5 external
```

#### Cache Levels Explained

| Level | Location | Duration | Purpose |
|-------|----------|----------|---------|
| **Component State** | Browser (React) | Until widget unmounts | Prevents unnecessary re-fetches during polling intervals |
| **Next.js Cache** | Server (fetch API) | Per-route configuration | Reduces external API calls, configured via `revalidate` |
| **API Response Cache** | Server (memory) | Same as Next.js cache | Shared across multiple client requests |

#### Cache Configuration by Endpoint

```typescript
// Weather: 15 minutes
export const revalidate = 900; // seconds

// Calendar: 5 minutes
export const revalidate = 300;

// News: 15 minutes
export const revalidate = 900;

// AI Summary: 30 minutes
export const revalidate = 1800;

// Spotify: No server cache (real-time)
export const dynamic = 'force-dynamic';

// Commute: 5 minutes
export const revalidate = 300;
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.0 | React framework with App Router |
| **React** | 19.0.0 | UI library |
| **TypeScript** | 5.7.2 | Type safety |
| **Tailwind CSS** | 4.0.0 | Utility-first styling |
| **Framer Motion** | 11.15.0 | GPU-accelerated animations |
| **date-fns** | 4.1.0 | Date manipulation |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 16.0.0 | Server-side endpoints |
| **node-ical** | 0.20.1 | iCal feed parsing |
| **romcal** | 2.0.3 | Catholic liturgical calendar |
| **Prisma** | 7.2.0 | Database ORM (admin features) |
| **better-sqlite3** | 11.8.1 | SQLite adapter |
| **NextAuth v5** | beta.25 | Authentication (admin) |
| **bcryptjs** | 2.4.3 | Password hashing |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Jest** | 30.0.0-alpha.7 | Test framework |
| **React Testing Library** | 16.1.0 | Component testing |
| **@testing-library/jest-dom** | 6.6.3 | DOM matchers |

### DevOps & Deployment

| Technology | Version | Purpose |
|------------|---------|---------|
| **pm2** | Latest | Process manager (Pi) |
| **GitHub Actions** | N/A | CI/CD pipeline |
| **ESLint** | 9.17.0 | Code linting |
| **Prettier** | 3.4.2 | Code formatting |
| **Husky** | 9.1.7 | Git hooks |

### External APIs

| Service | Purpose | Rate Limit | Cost |
|---------|---------|------------|------|
| **Open-Meteo** | Weather data | 10,000 req/day | Free |
| **TomTom Routing** | Traffic-aware routing | 2,500 req/day | Free tier |
| **OpenRouter** | AI summaries (Claude 3 Haiku) | Pay-per-use | ~$0.25/1M tokens |
| **Spotify** | Now playing | Unlimited (OAuth) | Free |
| **iCloud/Google Calendar** | iCal feeds | Unlimited | Free |
| **RSS Feeds** | News headlines | Varies by provider | Free |

---

## Key Architectural Decisions

### 1. Why Next.js App Router?

**Decision:** Use Next.js 16 with App Router instead of Pages Router or alternative frameworks.

**Rationale:**
- **Server Components**: Default server-side rendering reduces client bundle size
- **API Routes**: Built-in API endpoints with zero config
- **Caching**: Native support for `revalidate` headers
- **TypeScript**: First-class TypeScript support
- **Developer Experience**: Hot reload, fast refresh, excellent tooling

**Trade-offs:**
- Steeper learning curve than traditional React SPA
- App Router still maturing (some features in beta)
- Overkill for simple static site, but future-proof for admin portal

---

### 2. Why SQLite for Admin Data?

**Decision:** Use SQLite with Prisma instead of PostgreSQL or remote database.

**Rationale:**
- **Zero Config**: No database server to manage on Pi
- **Embedded**: Single file database (`/prisma/dev.db`)
- **Sufficient Scale**: Admin portal has <10 records total
- **Backup**: Simple file copy for backups
- **Performance**: Fast for small datasets

**Trade-offs:**
- No concurrent write scalability (not needed for single-user admin)
- No built-in replication (acceptable for non-critical admin data)
- File-based corruption risk (mitigated by regular backups)

**Considered Alternatives:**
- PostgreSQL: Overkill for tiny dataset, requires service management
- MongoDB: Unnecessary complexity for relational admin data
- JSON files: No type safety, no query optimization

---

### 3. Why Client-Side Widget Refresh?

**Decision:** Widgets poll API routes client-side instead of Server-Sent Events (SSE) or WebSockets.

**Rationale:**
- **Simplicity**: `setInterval()` in `useEffect()` is straightforward
- **HTTP Caching**: Leverages Next.js built-in caching
- **Stateless Server**: No connection state to manage
- **Low Frequency**: 5-30 minute intervals don't benefit from push
- **Raspberry Pi**: Reduces server load (no persistent connections)

**Trade-offs:**
- Not real-time (5-30 minute delay acceptable for mirror use case)
- Polling overhead (mitigated by server-side caching)

**Considered Alternatives:**
- WebSockets: Overkill for low-frequency updates, adds complexity
- SSE: Better than WebSockets but still unnecessary overhead
- Background refresh: Requires service worker, more complex

---

### 4. Why Server-Side API Caching?

**Decision:** Cache external API responses server-side with Next.js `revalidate` instead of client-side.

**Rationale:**
- **Shared Cache**: All clients benefit from single fetch
- **Rate Limit Protection**: Prevents client-side over-fetching
- **Security**: API keys never exposed to client
- **Performance**: Faster response from cache than external API
- **Cost Control**: Reduces OpenRouter API costs

**Implementation:**
```typescript
const response = await fetch(EXTERNAL_API_URL, {
  next: { revalidate: 900 } // 15 minutes
});
```

**Trade-offs:**
- Cache invalidation complexity (not an issue with time-based revalidation)
- Stale data for up to 15 minutes (acceptable for weather/news)

---

### 5. Why Monolithic Deployment?

**Decision:** Single Next.js app with widgets, API routes, and admin portal instead of microservices.

**Rationale:**
- **Simple Deployment**: One `pm2 restart` updates everything
- **Shared Code**: Widgets and API routes share TypeScript types
- **Low Complexity**: No service discovery, API gateway, or orchestration
- **Resource Constrained**: Raspberry Pi benefits from single process
- **Development Speed**: Monorepo faster to develop and debug

**Trade-offs:**
- Tighter coupling between features (acceptable for personal project)
- All-or-nothing deployment (mitigated by comprehensive testing)
- No independent scaling (not needed for single-user display)

**When to Split:**
- If admin portal becomes complex (>10 routes, >100 users)
- If widgets need independent deployment cycles
- If resource usage exceeds Pi capacity

---

### 6. Why Push-to-Deploy Instead of Manual Deployment?

**Decision:** Automated GitHub Actions deployment instead of SSH + manual commands.

**Rationale:**
- **Zero-Touch**: Push to main automatically deploys
- **Consistent**: Same steps every deployment
- **Tested**: Runs full test suite before deploy
- **Auditable**: GitHub Actions logs every deployment
- **Fast**: 3-4 minute full deployment (tests + build + restart)

**Implementation:**
- Self-hosted runner on Pi (no external runner cost)
- Two-stage workflow: Test → Deploy (deploy only if tests pass)
- Health check verification after deployment
- pm2 auto-restart on file changes

**Trade-offs:**
- Requires runner maintenance (negligible with systemd service)
- Deploy failures block subsequent pushes (acceptable with good tests)

---

## Performance Considerations

### Target Hardware

**Raspberry Pi Specifications:**
- CPU: Quad-core ARM Cortex-A72 (Pi 4 Model B)
- RAM: 4GB (recommended), 2GB minimum
- Storage: MicroSD card (Class 10 UHS-I minimum)
- Network: Gigabit Ethernet or 802.11ac WiFi
- Display: 1080x2560 portrait via HDMI

### Performance Optimizations

#### 1. GPU-Accelerated Animations Only

**Rule:** Only animate `transform` and `opacity` CSS properties.

```css
/* ✅ GOOD - GPU accelerated */
.widget {
  transition: transform 300ms, opacity 300ms;
}

/* ❌ BAD - Forces layout reflow */
.widget {
  transition: width 300ms, height 300ms;
}
```

**Rationale:**
- `transform` and `opacity` use GPU compositing layer
- Avoids costly layout recalculation and repaint
- Critical on Raspberry Pi's limited CPU/GPU

**Monitored via:**
- Chrome DevTools Performance tab
- Target: 60 FPS during all animations
- Pi testing: Smooth animations at 1080x2560

---

#### 2. Lazy Image Loading

**Implementation:**
```tsx
<img
  src={albumArt}
  alt={title}
  loading="lazy"
  decoding="async"
/>
```

**Rationale:**
- Spotify album art and weather icons deferred until needed
- Reduces initial page load time
- Frees up bandwidth for API requests

---

#### 3. Component Code Splitting

**Implementation:**
```tsx
const AdminPortal = lazy(() => import('@/components/admin/Portal'));
```

**Rationale:**
- Admin portal code not loaded by mirror display
- Reduces main bundle size by ~200KB
- Faster initial page load

---

#### 4. Server-Side Caching Strategy

| Route | Revalidate | Rationale |
|-------|------------|-----------|
| Weather | 15 min | Weather stable over 15 min window |
| Commute | 5 min | Traffic changes frequently during rush hour |
| News | 5 min | Breaking news updates, but not real-time critical |
| Calendar | None | Always fresh (events may be added/removed) |
| Spotify | None | Real-time playback state |

**Cache Hit Ratio (Estimated):**
- Weather: ~95% (1 fetch per 15 min)
- Commute: ~90% (workday mornings only)
- News: ~92% (1 fetch per 5 min)

**Impact:**
- Reduces external API calls by ~90%
- Faster widget refresh (cache: <50ms, API: 200-500ms)

---

#### 5. Parallel Data Fetching

**Pattern:**
```typescript
const [weather, calendar, news] = await Promise.all([
  fetchWeather(),
  fetchCalendar(),
  fetchNews(),
]);
```

**Used in:**
- `/api/summary` - Fetches weather + calendar + news in parallel
- `/api/calendar` - Fetches both calendars in parallel
- `/api/news` - Fetches all RSS feeds in parallel

**Impact:**
- Summary generation: 500ms (parallel) vs 1500ms (sequential)
- Calendar merge: 800ms (parallel) vs 1600ms (sequential)

---

#### 6. Image Optimization

**Next.js Image Component:**
```tsx
import Image from 'next/image';

<Image
  src={weatherIcon}
  width={64}
  height={64}
  alt="Weather icon"
/>
```

**Benefits:**
- Automatic WebP conversion
- Lazy loading built-in
- Responsive sizing
- Automatic caching

**Not Used For:**
- SVG icons (WeatherIcons.tsx uses inline SVG for zero requests)
- Spotify album art (external URL, can't be optimized)

---

### Performance Metrics (Target vs Actual)

| Metric | Target | Actual | Notes |
|--------|--------|--------|-------|
| **Initial Page Load** | < 2s | ~1.5s | On Pi 4 with Ethernet |
| **Widget Render** | < 100ms | ~80ms | Average widget mount time |
| **API Response (cached)** | < 50ms | ~35ms | Server-side cache hit |
| **API Response (fresh)** | < 500ms | ~350ms | External API fetch |
| **Animation FPS** | 60 FPS | 58-60 FPS | Occasional drop during GC |
| **Memory Usage** | < 500MB | ~420MB | Next.js + Chromium combined |
| **CPU Usage (idle)** | < 10% | ~8% | pm2 + Chromium |

**Tested On:** Raspberry Pi 4 Model B (4GB), Raspbian Bullseye, Chromium 120

---

## Scalability & Future Growth

### Current Limitations

1. **Single-User Design**
   - No multi-tenant support
   - Admin portal designed for single administrator
   - Database schema assumes one mirror instance

2. **Local Network Only**
   - No HTTPS/SSL
   - No authentication on widget routes
   - Assumes trusted network environment

3. **SQLite Constraints**
   - No concurrent write scalability
   - Single file database (corruption risk)
   - No built-in replication

4. **Raspberry Pi Hardware**
   - Limited to ~10 active widgets
   - 4GB RAM ceiling
   - MicroSD write endurance

---

### Growth Paths

#### Path 1: Multi-Mirror Deployment

**Scenario:** Deploy to multiple mirrors (home + office)

**Required Changes:**
1. **Database Migration:**
   - SQLite → PostgreSQL for shared config
   - Add `mirror_id` to tables
   - Implement config sync via API

2. **Authentication:**
   - Add JWT-based mirror authentication
   - Implement API key per mirror instance
   - Add rate limiting per mirror

3. **Deployment:**
   - Containerize with Docker
   - Add `docker-compose.yml` for orchestration
   - Implement blue-green deployment

**Estimated Effort:** 2-3 weeks

---

#### Path 2: Public Deployment

**Scenario:** Deploy as SaaS for other users

**Required Changes:**
1. **Multi-Tenancy:**
   - Add user accounts and authentication
   - Implement organization/team structure
   - Tenant-scoped data isolation

2. **Security:**
   - Add HTTPS/TLS (Let's Encrypt)
   - Implement rate limiting
   - Add CORS configuration
   - Audit logging

3. **Scalability:**
   - Migrate to cloud hosting (Vercel, AWS, etc.)
   - Implement Redis for distributed caching
   - Add CDN for static assets

4. **Billing:**
   - Stripe integration
   - Usage-based pricing for OpenRouter costs
   - Tiered plans (free/pro/enterprise)

**Estimated Effort:** 3-6 months

---

#### Path 3: Plugin Architecture

**Scenario:** Allow third-party widget development

**Required Changes:**
1. **Widget API:**
   - Define widget interface (`IWidget`)
   - Implement dynamic widget loading
   - Add widget marketplace/registry

2. **Sandboxing:**
   - Isolate third-party widget code
   - Implement CSP for security
   - Add widget permission system

3. **Documentation:**
   - Create widget developer guide
   - Publish TypeScript widget SDK
   - Add widget validation/approval flow

**Estimated Effort:** 4-6 weeks

---

### Monitoring & Observability (Future)

**Not Currently Implemented:**

1. **Error Tracking:**
   - Sentry integration for frontend errors
   - Backend error aggregation
   - Alert on deployment failures

2. **Performance Monitoring:**
   - Real User Monitoring (RUM)
   - Server-side performance metrics
   - API response time tracking

3. **Analytics:**
   - Widget usage patterns
   - API endpoint popularity
   - Cache hit/miss ratios

4. **Health Checks:**
   - Uptime monitoring (UptimeRobot, Pingdom)
   - External API availability checks
   - Database connection pool monitoring

**Implementation Priority:**
- Phase 1: Error tracking (Sentry) - 1 week
- Phase 2: Performance monitoring - 2 weeks
- Phase 3: Analytics - 1 week
- Phase 4: Health checks - 1 week

---

## Additional Resources

- **Codebase:** [GitHub Repository](https://github.com/jjones-wps/jjones-magic-mirror)
- **API Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Testing Guide:** [TESTING.md](./TESTING.md)
- **Deployment Guide:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Design System:** [design/DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md)

---

**Document Version:** 1.0.0
**Last Updated:** January 1, 2026
**Maintainer:** Jack Jones
**Contact:** See CLAUDE.md for development guidance
