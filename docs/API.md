# API Documentation

This document describes the REST API structure, conventions, and endpoints for the WhereTo backend.

> **Reference**: This API documentation implements the specifications defined in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 6. For the canonical implementation-ready specification, see FINAL-SPEC.md.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.whereto.app` (example)

## API Versioning

APIs are versioned in the URL path:

```
/api/v1/venues
```

## Authentication

### Bot Requests

Bot requests use service token authentication:

```
Authorization: Bearer <service-token>
```

### Mini App Requests

Mini App requests use Telegram WebApp `initData` verification:

```
X-Telegram-Init-Data: <initData>
```

Server verifies the signature before processing requests.

## Language Support

The API is generally language-agnostic. Most internationalization (i18n) happens client-side in the Bot and Mini App.

### Optional Language Parameter

If needed, the API can accept an optional language parameter for error messages or localized content:

**Query Parameter:**

```
GET /api/v1/venues?lang=ru
```

**Accept-Language Header:**

```
Accept-Language: ru-RU,ru;q=0.9,en;q=0.8
```

**Supported Language Codes:**

- `ru` - Russian (default)
- `en` - English
- `ro` - Romanian

**Note**: Language detection and translation are primarily handled in the Bot (via Telegram `language_code`) and Mini App (via Telegram WebApp `initData`). The API typically returns data in a language-neutral format, and the client applies translations.

For detailed i18n implementation, see [`docs/I18N.md`](I18N.md).

## Response Format

### Success Response

```json
{
  "data": {
    /* response data */
  },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VENUE_NOT_FOUND",
    "message": "Venue with id 'xxx' not found",
    "statusCode": 404
  }
}
```

## Endpoints

### Catalog Endpoints

#### GET /api/v1/venues

Search and filter venues.

**Query Parameters:**

| Parameter      | Type    | Required | Description                                                                          |
| -------------- | ------- | -------- | ------------------------------------------------------------------------------------ |
| `q`            | string  | No       | Search query (name, address)                                                         |
| `cityId`       | UUID    | No       | Filter by city                                                                       |
| `category`     | string  | No       | Filter by category (single category or comma-separated list)                         |
| `lat`          | number  | No       | User latitude (for distance sorting/filtering)                                       |
| `lng`          | number  | No       | User longitude (for distance sorting/filtering)                                      |
| `radiusMeters` | number  | No       | Search radius in meters (requires lat/lng)                                           |
| `minRating`    | number  | No       | Minimum rating (0-5)                                                                 |
| `openNow`      | boolean | No       | Filter venues that are currently open (requires hours data)                          |
| `bbox`         | string  | No       | Bounding box: "minLat,minLng,maxLat,maxLng" (latitude, longitude order)              |
| `page`         | number  | No       | Page number (default: 1). Use with `limit`. Alternative to `cursor`.                 |
| `limit`        | number  | No       | Items per page (default: 20, max: 100). Use with `page`.                             |
| `cursor`       | string  | No       | Cursor for pagination (alternative to `page`/`limit`). Returns `nextCursor` in meta. |
| `offset`       | number  | No       | Offset for pagination (alternative to `cursor` or `page`). Use with `limit`.         |
| `sort`         | string  | No       | Sort order: "distance", "rating", "name" (default: "distance" if lat/lng provided)   |

**Example Requests:**

```http
# Using page-based pagination
GET /api/v1/venues?q=coffee&lat=47.0104&lng=28.8638&radiusMeters=1000&page=1&limit=10

# Using cursor-based pagination
GET /api/v1/venues?q=coffee&lat=47.0104&lng=28.8638&radiusMeters=1000&cursor=eyJpZCI6InV1aWQifQ&limit=10

# Using bbox
GET /api/v1/venues?bbox=47.0000,28.8500,47.0200,28.8700&category=cafe&openNow=true
```

**Example Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Coffee Shop",
      "address": "123 Main St",
      "location": {
        "lat": 47.0104,
        "lng": 28.8638
      },
      "categories": ["cafe", "coffee"],
      "rating": 4.5,
      "ratingCount": 120,
      "photoRefs": ["photo_ref_1", "photo_ref_2"],
      "hours": {
        "monday": "09:00-18:00",
        "tuesday": "09:00-18:00"
      },
      "distance": 250.5
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "hasMore": true,
    "nextCursor": "eyJpZCI6InV1aWQyIn0" // Present when using cursor pagination
  }
}
```

#### GET /api/v1/venues/:id

Get venue details by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `id`      | UUID | Yes      | Venue ID    |

**Example Request:**

```http
GET /api/v1/venues/123e4567-e89b-12d3-a456-426614174000
```

**Example Response:**

```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Coffee Shop",
    "address": "123 Main St, Kishinev",
    "location": {
      "lat": 47.0104,
      "lng": 28.8638
    },
    "categories": ["cafe", "coffee"],
    "rating": 4.5,
    "ratingCount": 120,
    "photoRefs": ["photo_ref_1", "photo_ref_2"],
    "hours": {
      "monday": "09:00-18:00",
      "tuesday": "09:00-18:00",
      "wednesday": "09:00-18:00",
      "thursday": "09:00-18:00",
      "friday": "09:00-18:00",
      "saturday": "10:00-16:00",
      "sunday": "closed"
    },
    "status": "active",
    "city": {
      "id": "city-uuid",
      "name": "Kishinev"
    }
  }
}
```

### Cities Endpoints

#### GET /api/v1/cities

List available cities.

**Query Parameters:**

| Parameter | Type    | Required | Description                               |
| --------- | ------- | -------- | ----------------------------------------- |
| `active`  | boolean | No       | Filter active cities only (default: true) |

**Example Response:**

```json
{
  "data": [
    {
      "id": "city-uuid",
      "name": "Kishinev",
      "countryCode": "MD",
      "center": {
        "lat": 47.0104,
        "lng": 28.8638
      },
      "timezone": "Europe/Chisinau",
      "isActive": true
    }
  ]
}
```

#### GET /api/v1/cities/:id

Get city details.

### User Endpoints (Phase 1)

#### GET /api/v1/me

Get current user profile (from Telegram initData).

**Response:**

```json
{
  "data": {
    "id": "telegram-user-id",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe"
  }
}
```

#### GET /api/v1/me/saved

Get user's saved venues.

**Query Parameters:**

| Parameter | Type   | Required | Description    |
| --------- | ------ | -------- | -------------- |
| `page`    | number | No       | Page number    |
| `limit`   | number | No       | Items per page |

#### POST /api/v1/me/saved

Save a venue.

**Request Body:**

```json
{
  "venueId": "venue-uuid"
}
```

#### DELETE /api/v1/me/saved/:venueId

Remove saved venue.

**Note on Saved/Favorites Implementation:**

The API supports two approaches for saved venues:

**Option A (Server-side favorites)** - Recommended for cross-device sync:

- Use the endpoints above (`GET /api/v1/me/saved`, `POST /api/v1/me/saved`, `DELETE /api/v1/me/saved/:venueId`)
- Favorites are stored in the database and persist across devices
- Requires user authentication

**Option B (Client-side favorites)** - Faster MVP, no API needed:

- Store favorites in bot session/local storage
- No server-side persistence
- Faster implementation but no cross-device sync
- Suitable for MVP if cross-device sync is not required

See [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 6.2 for specification details.

### Group Planning Endpoints (Core MVP Feature)

> **Note**: Group planning (`/plan`) is a core MVP feature that differentiates WhereTo in Telegram. This enables group decision-making directly in chat. See [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 6.3 for details.

#### POST /api/v1/plans

Create a new plan.

**Request Body:**

```json
{
  "date": "2024-01-15",
  "time": "19:00",
  "area": "city-center",
  "budget": "$$",
  "format": "dinner",
  "initiatorId": "telegram-user-id"
}
```

**Response:**

```json
{
  "data": {
    "id": "plan-uuid",
    "date": "2024-01-15",
    "time": "19:00",
    "status": "open",
    "initiatorId": "telegram-user-id",
    "createdAt": "2024-01-10T10:00:00Z"
  }
}
```

#### POST /api/v1/plans/:id/join

Join a plan (required before voting).

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `id`      | UUID | Yes      | Plan ID     |

**Request Body:**

```json
{
  "userId": "telegram-user-id",
  "preferences": {
    "format": "dinner",
    "budget": "$$",
    "area": "city-center"
  }
}
```

#### GET /api/v1/plans/:id/options

Get shortlist of venue options for a plan (generated from catalog based on preferences).

**Response:**

```json
{
  "data": [
    {
      "venueId": "venue-uuid",
      "venue": {
        /* venue details */
      },
      "score": 0.85
    }
  ]
}
```

#### POST /api/v1/plans/:id/vote

Cast a vote for a venue in a plan.

**Request Body:**

```json
{
  "userId": "telegram-user-id",
  "venueId": "venue-uuid"
}
```

#### POST /api/v1/plans/:id/close

Close a plan (initiator only).

**Request Body:**

```json
{
  "initiatorId": "telegram-user-id"
}
```

#### GET /api/v1/plans/:id

Get plan details including votes and result.

#### POST /api/v1/plans/:id/booking-request

Request a booking for the winning venue (partner venues only).

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `id`      | UUID | Yes      | Plan ID     |

**Request Body:**

```json
{
  "venueId": "venue-uuid",
  "requestedDate": "2024-01-15",
  "requestedTime": "19:00",
  "participantsCount": 6,
  "notes": "Window table preferred"
}
```

**Response:**

```json
{
  "data": {
    "id": "booking-request-uuid",
    "planId": "plan-uuid",
    "venueId": "venue-uuid",
    "status": "pending",
    "requestedDate": "2024-01-15",
    "requestedTime": "19:00",
    "participantsCount": 6,
    "createdAt": "2024-01-10T10:00:00Z"
  }
}
```

**Note**: This endpoint is only available for partner restaurants. For mass venues, users should use the "Call" CTA.

### Merchant/Partner Endpoints (for 20 Partner Restaurants)

> **Note**: These endpoints are for partner restaurants that participate in the booking confirmation system. Authentication via merchant token or Telegram bot.

#### GET /api/v1/merchant/booking-requests

Get pending booking requests for the authenticated merchant's venue(s).

**Query Parameters:**

| Parameter | Type   | Required | Description                                          |
| --------- | ------ | -------- | ---------------------------------------------------- |
| `status`  | string | No       | Filter by status: `pending`, `confirmed`, `rejected` |
| `limit`   | number | No       | Number of results (default: 20)                      |
| `offset`  | number | No       | Pagination offset                                    |

**Response:**

```json
{
  "data": [
    {
      "id": "request-uuid",
      "planId": "plan-uuid",
      "venueId": "venue-uuid",
      "requestedDate": "2024-01-15",
      "requestedTime": "19:00",
      "participantsCount": 6,
      "status": "pending",
      "createdAt": "2024-01-10T10:00:00Z",
      "plan": {
        "format": "dinner",
        "budget": "$$",
        "area": "city-center"
      }
    }
  ],
  "meta": {
    "total": 5,
    "pending": 3
  }
}
```

#### POST /api/v1/merchant/booking-requests/:id/confirm

Confirm a booking request.

**Path Parameters:**

| Parameter | Type | Required | Description        |
| --------- | ---- | -------- | ------------------ |
| `id`      | UUID | Yes      | Booking request ID |

**Request Body:**

```json
{
  "confirmedTime": "2024-01-15T19:00:00Z",
  "notes": "Table reserved near window"
}
```

**Response:**

```json
{
  "data": {
    "id": "request-uuid",
    "status": "confirmed",
    "confirmedAt": "2024-01-10T10:05:00Z",
    "responseTimeSeconds": 300
  }
}
```

#### POST /api/v1/merchant/booking-requests/:id/reject

Reject a booking request.

**Path Parameters:**

| Parameter | Type | Required | Description        |
| --------- | ---- | -------- | ------------------ |
| `id`      | UUID | Yes      | Booking request ID |

**Request Body:**

```json
{
  "reason": "Fully booked at that time"
}
```

**Response:**

```json
{
  "data": {
    "id": "request-uuid",
    "status": "rejected",
    "rejectedAt": "2024-01-10T10:05:00Z",
    "responseTimeSeconds": 300
  }
}
```

#### POST /api/v1/merchant/booking-requests/:id/propose-time

Propose an alternative time.

**Path Parameters:**

| Parameter | Type | Required | Description        |
| --------- | ---- | -------- | ------------------ |
| `id`      | UUID | Yes      | Booking request ID |

**Request Body:**

```json
{
  "proposedTime": "2024-01-15T20:00:00Z",
  "notes": "We have availability at 20:00"
}
```

**Response:**

```json
{
  "data": {
    "id": "request-uuid",
    "status": "proposed",
    "proposedTime": "2024-01-15T20:00:00Z",
    "proposedAt": "2024-01-10T10:05:00Z",
    "responseTimeSeconds": 300
  }
}
```

#### GET /api/v1/merchant/stats

Get statistics for the merchant's venue(s).

**Query Parameters:**

| Parameter   | Type   | Required | Description           |
| ----------- | ------ | -------- | --------------------- |
| `startDate` | string | No       | Start date (ISO 8601) |
| `endDate`   | string | No       | End date (ISO 8601)   |

**Response:**

```json
{
  "data": {
    "totalRequests": 45,
    "confirmed": 28,
    "rejected": 10,
    "pending": 7,
    "confirmRate": 0.62,
    "medianResponseTimeSeconds": 240,
    "averageParticipantsPerRequest": 4.2
  }
}
```

## DTOs (Data Transfer Objects)

### VenueFiltersDto

```typescript
export class VenueFiltersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000) // 50km max
  radiusMeters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsBoolean()
  openNow?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/)
  bbox?: string; // Format: "minLat,minLng,maxLat,maxLng"

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsIn(['distance', 'rating', 'name'])
  sort?: string;
}
```

## Error Codes

| Code              | Status | Description               |
| ----------------- | ------ | ------------------------- |
| `VENUE_NOT_FOUND` | 404    | Venue not found           |
| `CITY_NOT_FOUND`  | 404    | City not found            |
| `INVALID_FILTERS` | 400    | Invalid filter parameters |
| `UNAUTHORIZED`    | 401    | Authentication required   |
| `FORBIDDEN`       | 403    | Insufficient permissions  |
| `INTERNAL_ERROR`  | 500    | Internal server error     |

## Rate Limiting

API endpoints are rate-limited:

- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per user

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Caching

Responses are cached where appropriate:

- **Venue details**: 5 minutes TTL
- **City list**: 1 hour TTL
- **Search results**: 1 minute TTL (varies by query)

Cache headers:

```
Cache-Control: public, max-age=300
ETag: "abc123"
```

## OpenAPI/Swagger

API documentation is available via Swagger UI:

- **Swagger UI**: `http://localhost:3000/docs`
- **OpenAPI JSON Spec**: `http://localhost:3000/docs-json`

The Swagger UI provides interactive API documentation where you can:

- Browse all available endpoints
- View request/response schemas
- Test endpoints directly from the browser
- See authentication requirements

### Client Generation

TypeScript clients are automatically generated from the OpenAPI specification for use in bot and miniapp applications.

#### Generating Clients

**From running API:**

```bash
npm run generate:api-client
```

**From local OpenAPI spec file:**

```bash
npm run generate:api-client:local
```

**Export OpenAPI spec to file:**

```bash
npm run swagger:export
```

#### Generated Clients

The generation script creates two TypeScript clients:

1. **Axios Client** (`libs/shared/src/api-client-axios/`)
   - For use in the bot (NestJS/Node.js)
   - Uses axios for HTTP requests
   - Returns Promises (compatible with async/await)

2. **Angular Client** (`libs/shared/src/api-client-angular/`)
   - For use in the miniapp (Angular 20+)
   - Uses Angular's HttpClient
   - Returns RxJS Observables
   - Integrates with Angular dependency injection and interceptors

Both clients share the same TypeScript types/models, ensuring consistency across applications.

#### Using Generated Clients

**In Bot (Axios Client):**

```typescript
import { DefaultApi } from '@whereto/api-client-axios';
import { Configuration } from '@whereto/api-client-axios';

const config = new Configuration({
  basePath: 'http://localhost:3000/api/v1',
  accessToken: 'your-service-token',
});

const api = new DefaultApi(config);
const venues = await api.venuesControllerFindAll({ q: 'coffee' });
```

**In MiniApp (Angular Client):**

```typescript
import { DefaultService } from '@whereto/api-client-angular';
import { HttpClient } from '@angular/common/http';

// Inject in your service
constructor(private api: DefaultService) {}

// Use in methods
this.api.venuesControllerFindAll({ q: 'coffee' }).subscribe(venues => {
  // Handle response
});
```

**Note:** The generated clients are gitignored. Regenerate them when the API changes.

## Testing

See `docs/TESTING.md` for API testing guidelines.
