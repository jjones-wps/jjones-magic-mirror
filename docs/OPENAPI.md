# OpenAPI Specification Guide

**Last Updated:** January 1, 2026
**OpenAPI Version:** 3.0.3
**Spec File:** [`openapi.yaml`](../openapi.yaml)

---

## Overview

The Magic Mirror API is documented using the **OpenAPI 3.0 specification** (formerly Swagger). This machine-readable format enables:

- Interactive API exploration
- Automatic client generation
- API validation and testing
- Integration with API tools

The specification covers all **15 API endpoints** including public widget routes, admin routes, and OAuth flows.

---

## Viewing the Specification

### Option 1: Swagger UI (Online Viewer)

The easiest way to view and interact with the API specification:

1. **Copy the raw URL:**
   ```
   https://raw.githubusercontent.com/jjones-wps/jjones-magic-mirror/main/openapi.yaml
   ```

2. **Open Swagger Editor:**
   - Go to [editor.swagger.io](https://editor.swagger.io/)
   - File → Import URL
   - Paste the raw GitHub URL
   - Click "OK"

3. **Explore the API:**
   - Left panel: YAML source
   - Right panel: Interactive documentation
   - Try out endpoints (if mirror is running and accessible)

### Option 2: Redoc (Online Viewer)

For a cleaner, read-only view:

1. Go to [redocly.github.io/redoc](https://redocly.github.io/redoc/)
2. Paste the raw GitHub URL in the top box
3. View beautifully formatted API documentation

### Option 3: VS Code (Local Viewing)

If you have the repository cloned:

1. **Install OpenAPI Extension:**
   - [OpenAPI (Swagger) Editor](https://marketplace.visualstudio.com/items?itemName=42Crunch.vscode-openapi)
   - Or [Swagger Viewer](https://marketplace.visualstudio.com/items?itemName=Arjun.swagger-viewer)

2. **Open the spec file:**
   ```bash
   code openapi.yaml
   ```

3. **Preview:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "OpenAPI: Show Preview"
   - Or right-click → "Preview Swagger"

### Option 4: Local Swagger UI (Docker)

Run Swagger UI locally with Docker:

```bash
# From repository root
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/openapi.yaml \
  -v $(pwd)/openapi.yaml:/openapi.yaml \
  swaggerapi/swagger-ui

# Open browser to http://localhost:8080
```

---

## Using the Specification

### Generate API Clients

#### JavaScript/TypeScript Client

Using OpenAPI Generator:

```bash
# Install generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./generated/api-client

# Use in your project
import { DefaultApi } from './generated/api-client';

const api = new DefaultApi({
  basePath: 'http://192.168.1.213:3000'
});

const weather = await api.getWeather();
```

#### Python Client

```bash
# Generate Python client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./generated/python-client

# Use in Python
from generated.python_client import DefaultApi
from generated.python_client.rest import ApiException

api = DefaultApi()
try:
    weather = api.get_weather()
    print(weather.current.temperature)
except ApiException as e:
    print(f"Error: {e}")
```

#### Other Languages

OpenAPI Generator supports 50+ languages. See full list:
- [OpenAPI Generator Docs](https://openapi-generator.tech/docs/generators)

Supported languages include:
- Java, Kotlin, C#, Go, Ruby, PHP
- Swift, Dart, Rust
- And many more

### API Validation

Validate the OpenAPI spec:

```bash
# Install swagger-cli
npm install -g @apidevtools/swagger-cli

# Validate spec
swagger-cli validate openapi.yaml

# Output: openapi.yaml is valid
```

### Mock Server

Create a mock API server for testing:

```bash
# Install Prism (mock server)
npm install -g @stoplight/prism-cli

# Start mock server on port 4010
prism mock openapi.yaml -p 4010

# Test endpoints
curl http://localhost:4010/api/weather
# Returns example response from spec
```

---

## Specification Structure

### Tags

API endpoints are organized into 3 tags:

| Tag | Description | Endpoints |
|-----|-------------|-----------|
| **Public Widgets** | Unauthenticated widget data | 9 routes (calendar, weather, news, etc.) |
| **Admin** | Authenticated admin portal | 4 routes (settings, status, widgets, refresh) |
| **OAuth** | OAuth authorization flows | 2 routes (Spotify authorize/callback) |

### Schemas

All request/response types are defined in `components/schemas`:

- `CalendarResponse`, `CalendarEvent`
- `WeatherResponse`, `CurrentWeather`, `HourlyForecast`
- `SpotifyResponse`
- `NewsResponse`, `NewsArticle`
- `SummaryResponse`
- `CommuteResponse`, `Commute`
- `FeastDayResponse`
- `VersionResponse`
- `ConfigVersionResponse`
- `SystemStatusResponse`
- `ErrorResponse`

### Security Schemes

- **jwtAuth**: JWT bearer token (admin routes only)
- Public routes: No authentication required

---

## API Design Patterns

The specification documents these patterns used throughout the API:

### 1. Proxy Pattern
External API calls proxied server-side for caching and security.

**Example:** `/api/weather` → Open-Meteo API

### 2. Merge Pattern
Multiple data sources merged server-side.

**Example:** `/api/calendar` merges primary + secondary iCal feeds

### 3. Transform Pattern
External API responses simplified for client consumption.

**Example:** Weather data rounds temperatures, simplifies structure

### 4. Fallback Pattern
Demo data provided when external APIs fail.

**Example:** Commute, AI summary return demo data on API failure

---

## Caching Strategy

Each endpoint documents its caching behavior:

| Endpoint | Cache Duration | Strategy |
|----------|----------------|----------|
| `/api/weather` | 15 minutes | Next.js `revalidate: 900` |
| `/api/calendar` | None | Fresh on each request |
| `/api/news` | 15 minutes | Next.js `revalidate: 900` |
| `/api/summary` | 30 minutes | Next.js `revalidate: 1800` |
| `/api/commute` | 5 minutes | Next.js `revalidate: 300` |
| `/api/feast-day` | 1 hour | Next.js `revalidate: 3600` |
| `/api/spotify/now-playing` | None | Real-time (no cache) |
| `/api/version` | None | Build timestamp check |

---

## Extending the Specification

When adding new API endpoints:

1. **Add path** to `paths` section
2. **Define schemas** in `components/schemas`
3. **Add tag** if new category needed
4. **Document caching** in description
5. **Provide examples** in schema
6. **Validate spec**:
   ```bash
   swagger-cli validate openapi.yaml
   ```

### Example: Adding New Endpoint

```yaml
paths:
  /api/new-widget:
    get:
      tags:
        - Public Widgets
      summary: Get new widget data
      description: |
        Describe what this endpoint does.

        **Caching:** 10 minutes (600 seconds)
      operationId: getNewWidget
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NewWidgetResponse'

components:
  schemas:
    NewWidgetResponse:
      type: object
      required:
        - data
      properties:
        data:
          type: string
          example: Example value
```

---

## Limitations

### Current Limitations

- **Admin routes incomplete**: Schemas are placeholders (admin portal in development)
- **No pagination**: APIs return full datasets (acceptable for current use case)
- **No versioning**: Single API version (v1 implicit)
- **Local network only**: No public deployment or CORS configuration

### Future Enhancements

- Complete admin route schemas when portal is finished
- Add API versioning if breaking changes needed (`/v2/api/*`)
- Add rate limiting documentation
- Add webhook specifications for real-time updates

---

## Related Documentation

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Human-readable API docs with examples
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and data flow diagrams
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute new endpoints

---

## Tools & Resources

**OpenAPI Tools:**
- [Swagger Editor](https://editor.swagger.io/) - Online editor
- [Redoc](https://redocly.github.io/redoc/) - Beautiful documentation renderer
- [OpenAPI Generator](https://openapi-generator.tech/) - Client/server code generation
- [Prism](https://stoplight.io/open-source/prism) - Mock server
- [Swagger UI](https://swagger.io/tools/swagger-ui/) - Interactive documentation

**Learning Resources:**
- [OpenAPI Specification](https://swagger.io/specification/) - Official spec
- [OpenAPI Guide](https://swagger.io/docs/specification/about/) - Getting started
- [API Design Best Practices](https://swagger.io/blog/api-design/api-design-best-practices/)

---

**Questions?** Open an issue on GitHub or check the [Documentation Hub](./README.md).
