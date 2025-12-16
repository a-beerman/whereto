# Database Schema & Migrations Guide

This document describes the database schema, migration strategy, and geospatial queries for the WhereTo catalog.

> **Reference**: This schema implements the data model specified in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 4. For the canonical implementation-ready specification, see FINAL-SPEC.md.

## Schema Overview

The catalog database uses PostgreSQL with **native lat/lng columns** (no PostGIS extension required).

**Geospatial Approach:**

- Store `lat DECIMAL(10,8)`, `lng DECIMAL(11,8)` columns
- Calculate distances using Haversine formula in application code (see `apps/api/src/utils/geo.ts`)
- Use bounding box pre-filtering in SQL (simple WHERE clauses)
- No extension required, simpler deployment and setup

This approach is sufficient for MVP and city-level searches. For very large-scale production with complex spatial queries, PostGIS could be added later if needed.

### Core Tables

**Catalog Domain:**

- `cities` - City/location catalog
- `venues` - Canonical venue records
- `venue_sources` - Links venues to external sources (Google Places)
- `venue_overrides` - Manual edits that survive syncs
- `venue_partners` - Partner restaurant flags and SLA settings
- `user_saved_venues` - User favorites (optional for Phase 1)

**Group Planning Domain:**

- `plans` - Group planning plans
- `participants` - Plan participants and preferences
- `votes` - Voting sessions for plans
- `vote_casts` - Individual votes cast by participants

**Merchant/Booking Domain:**

- `booking_requests` - Booking requests from group plans

## Entity Definitions

### Cities Table

```sql
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  country_code CHAR(2) NOT NULL,
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  bounds JSONB, -- Optional: bbox or polygon
  timezone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cities_active ON cities(is_active) WHERE is_active = true;
CREATE INDEX idx_cities_location ON cities(center_lat, center_lng);
```

### Venues Table

```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8), -- Latitude
  lng DECIMAL(11, 8), -- Longitude
  categories JSONB, -- Array of category strings
  rating DECIMAL(3, 2), -- 0.00 to 5.00
  rating_count INTEGER,
  photo_refs JSONB, -- Array of photo references/URLs
  hours JSONB, -- Opening hours structure
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'duplicate')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_venues_city ON venues(city_id);
CREATE INDEX idx_venues_status ON venues(status) WHERE status = 'active';
CREATE INDEX idx_venues_location ON venues(lat, lng); -- Composite index for bounding box queries
CREATE INDEX idx_venues_categories ON venues USING GIN(categories); -- For category filtering
```

### Venue Sources Table

```sql
CREATE TABLE venue_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL, -- 'google_places', etc.
  external_id VARCHAR(255) NOT NULL, -- e.g., Google place_id
  last_synced_at TIMESTAMP WITH TIME ZONE,
  raw_hash VARCHAR(64), -- Hash of normalized payload for change detection
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, external_id)
);

CREATE INDEX idx_venue_sources_venue ON venue_sources(venue_id);
CREATE INDEX idx_venue_sources_external ON venue_sources(source, external_id);
```

### Venue Overrides Table

```sql
CREATE TABLE venue_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name_override VARCHAR(255),
  address_override TEXT,
  pin_lat_override DECIMAL(10, 8), -- Override latitude
  pin_lng_override DECIMAL(11, 8), -- Override longitude
  category_overrides JSONB,
  hidden BOOLEAN DEFAULT false,
  note TEXT, -- Editor note
  updated_by VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id)
);

CREATE INDEX idx_venue_overrides_venue ON venue_overrides(venue_id);
```

### User Saved Venues (Optional Phase 1)

```sql
CREATE TABLE user_saved_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- Telegram user ID or UUID
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
);

CREATE INDEX idx_user_saved_venues_user ON user_saved_venues(user_id);
CREATE INDEX idx_user_saved_venues_venue ON user_saved_venues(venue_id);
```

### User Preferences Table (Optional)

Optional table for storing user preferences, including language override. Language is automatically detected from Telegram user settings, but this table allows manual override if needed.

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- Telegram user ID
  language VARCHAR(10), -- Language override: 'ru', 'en', 'ro' (optional, null = use auto-detection)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
```

**Note**: For MVP, language detection is automatic from Telegram user settings (`ctx.from.language_code` for Bot, `initData.user.language_code` for Mini App). This table is optional and only needed if you want to support manual language override. See [`docs/I18N.md`](I18N.md) for i18n implementation details.

### Venue Partners Table

Flags partner restaurants and tracks SLA settings.

```sql
CREATE TABLE venue_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  merchant_user_id VARCHAR(255), -- Telegram user ID or merchant account ID
  response_time_target_seconds INTEGER DEFAULT 300, -- Target: 5 minutes
  subscription_tier VARCHAR(20), -- 'free', 'starter', 'pro'
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id)
);

CREATE INDEX idx_venue_partners_venue ON venue_partners(venue_id);
CREATE INDEX idx_venue_partners_active ON venue_partners(is_active) WHERE is_active = true;
CREATE INDEX idx_venue_partners_merchant ON venue_partners(merchant_user_id);
```

### Plans Table

Group planning plans created in Telegram groups.

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id BIGINT NOT NULL, -- Telegram group chat ID
  initiator_id VARCHAR(255) NOT NULL, -- Telegram user ID
  date DATE NOT NULL,
  time TIME NOT NULL,
  area VARCHAR(255), -- Area name or "midpoint"
  location_lat DECIMAL(10, 8), -- If specific location
  location_lng DECIMAL(11, 8),
  budget VARCHAR(10), -- '$', '$$', '$$$'
  format VARCHAR(50), -- 'dinner', 'bar', 'coffee', etc.
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'voting', 'closed', 'cancelled')),
  voting_ends_at TIMESTAMP WITH TIME ZONE,
  winning_venue_id UUID REFERENCES venues(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plans_chat ON plans(telegram_chat_id);
CREATE INDEX idx_plans_status ON plans(status);
CREATE INDEX idx_plans_initiator ON plans(initiator_id);
CREATE INDEX idx_plans_date ON plans(date);
```

### Participants Table

Plan participants and their preferences.

```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL, -- Telegram user ID
  preferences JSONB, -- { format, budget, area, cuisine, alcohol, quiet, etc. }
  location_lat DECIMAL(10, 8), -- For "midpoint" calculation
  location_lng DECIMAL(11, 8),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, user_id)
);

CREATE INDEX idx_participants_plan ON participants(plan_id);
CREATE INDEX idx_participants_user ON participants(user_id);
```

### Votes Table

Voting sessions for plans.

```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  winner_venue_id UUID REFERENCES venues(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_votes_plan ON votes(plan_id);
CREATE INDEX idx_votes_status ON votes(status);
```

### Vote Casts Table

Individual votes cast by participants.

```sql
CREATE TABLE vote_casts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL, -- Telegram user ID
  venue_id UUID NOT NULL REFERENCES venues(id),
  cast_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vote_id, user_id) -- One vote per user per voting session
);

CREATE INDEX idx_vote_casts_vote ON vote_casts(vote_id);
CREATE INDEX idx_vote_casts_plan ON vote_casts(plan_id);
CREATE INDEX idx_vote_casts_user ON vote_casts(user_id);
CREATE INDEX idx_vote_casts_venue ON vote_casts(venue_id);
```

### Booking Requests Table

Booking requests from group plans for partner restaurants.

```sql
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id),
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  participants_count INTEGER NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'proposed', 'cancelled')),
  confirmed_time TIMESTAMP WITH TIME ZONE,
  proposed_time TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  response_time_seconds INTEGER, -- Time from request to merchant response
  merchant_user_id VARCHAR(255), -- Merchant who responded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_booking_requests_plan ON booking_requests(plan_id);
CREATE INDEX idx_booking_requests_venue ON booking_requests(venue_id);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);
CREATE INDEX idx_booking_requests_merchant ON booking_requests(merchant_user_id);
CREATE INDEX idx_booking_requests_date ON booking_requests(requested_date);
```

## TypeORM Entities

See `apps/api/src/catalog/entities/` for TypeORM entity definitions matching the catalog schema above.

See `apps/api/src/plans/entities/` for group planning entities (Plan, Participant, Vote, VoteCast).

See `apps/api/src/merchant/entities/` for merchant/booking entities (VenuePartner, BookingRequest).

## Migrations

### Migration Strategy

We use TypeORM migrations for schema versioning. Migrations are stored in `apps/api/migrations/`.

### Creating Migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- --name=AddVenueOverrides

# Create empty migration
npm run migration:create -- --name=CustomMigration
```

### Running Migrations

```bash
# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Migration Best Practices

1. **Always test migrations** on a copy of production data
2. **Make migrations reversible** - include both `up` and `down`
3. **Add indexes in separate migrations** for large tables
4. **Use transactions** for data migrations
5. **Never modify existing migrations** - create new ones

### Example Migration

```typescript
// migrations/1234567890-AddVenueOverrides.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVenueOverrides1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE venue_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        name_override VARCHAR(255),
        -- ... other fields
        UNIQUE(venue_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_venue_overrides_venue ON venue_overrides(venue_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS venue_overrides;`);
  }
}
```

## Geospatial Queries

We use native PostgreSQL lat/lng columns with Haversine distance calculations in application code.

### Utility Functions

See `apps/api/src/utils/geo.ts` for:

- `haversineDistance()` - Calculate distance between two points in meters
- `calculateBoundingBox()` - Calculate bounding box for radius queries

### Geo Queries

#### Find Venues in Bounding Box

```typescript
// Simple bounding box filter in SQL
const venues = await venueRepository
  .createQueryBuilder('venue')
  .where('venue.lat BETWEEN :minLat AND :maxLat', { minLat, maxLat })
  .andWhere('venue.lng BETWEEN :minLng AND :maxLng', { minLng, maxLng })
  .andWhere('venue.status = :status', { status: 'active' })
  .getMany();
```

#### Calculate Distance (Haversine Formula in Application)

```typescript
// utils/geo.ts
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Find venues within radius (two-step: bounding box filter, then distance filter)
async function findNearby(lat: number, lng: number, radiusMeters: number): Promise<Venue[]> {
  // Step 1: Rough bounding box filter (faster)
  // Approximate: 1 degree lat ≈ 111km, 1 degree lng ≈ 111km * cos(lat)
  const latDelta = radiusMeters / 111000;
  const lngDelta = radiusMeters / (111000 * Math.cos(toRadians(lat)));

  const candidates = await venueRepository
    .createQueryBuilder('venue')
    .where('venue.lat BETWEEN :minLat AND :maxLat', {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
    })
    .andWhere('venue.lng BETWEEN :minLng AND :maxLng', {
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    })
    .andWhere('venue.status = :status', { status: 'active' })
    .getMany();

  // Step 2: Accurate distance filter
  return candidates.filter((venue) => {
    const distance = haversineDistance(lat, lng, venue.lat, venue.lng);
    return distance <= radiusMeters;
  });
}
```

#### Sort by Distance

```typescript
async function findVenuesSortedByDistance(
  lat: number,
  lng: number,
): Promise<Array<Venue & { distance: number }>> {
  const venues = await venueRepository.find({
    where: { status: 'active' },
  });

  return venues
    .map((venue) => ({
      ...venue,
      distance: haversineDistance(lat, lng, venue.lat, venue.lng),
    }))
    .sort((a, b) => a.distance - b.distance);
}
```

### Indexing Strategy

- **Composite indexes** on (lat, lng) for bounding box queries
- **GIN indexes** on JSONB columns for array/object queries
- **B-tree indexes** on foreign keys and frequently filtered columns
- **Partial indexes** for filtered queries (e.g., `WHERE status = 'active'`)

## Data Seeding

### Seed Scripts

Seed scripts populate initial data (cities, test venues, etc.):

```typescript
// scripts/seed-cities.ts
async function seed() {
  // Seed cities
  const city = await cityRepository.save({
    name: 'Chișinău',
    countryCode: 'MD',
    centerLat: 47.0104,
    centerLng: 28.8638,
    timezone: 'Europe/Chisinau',
    isActive: true,
  });

  // Seed test venues
  // ...
}
```

Run seeds:

```bash
npx ts-node apps/api/src/scripts/seed-cities.ts
```

## Performance Considerations

1. **Composite Indexes**: Use (lat, lng) composite index for bounding box queries
2. **Query Optimization**: Use `EXPLAIN ANALYZE` to optimize slow queries
3. **Connection Pooling**: Configure appropriate pool size
4. **Read Replicas**: Consider read replicas for high read load
5. **Caching**: Cache frequently accessed data (cities, popular venues)
6. **Bounding Box Pre-filtering**: Always use bounding box in SQL before applying Haversine distance filter

## Backup & Recovery

### Backup Strategy

```bash
# Full database backup
pg_dump -h localhost -U postgres -d whereto_catalog -F c -f backup.dump

# Schema only
pg_dump -h localhost -U postgres -d whereto_catalog --schema-only -f schema.sql
```

### Restore

```bash
pg_restore -h localhost -U postgres -d whereto_catalog backup.dump
```

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeORM Migrations](https://typeorm.io/migrations)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
