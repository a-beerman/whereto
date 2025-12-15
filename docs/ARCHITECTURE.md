# Architecture: High-level overview (B2C-first + Offline Catalog)

> **Reference**: This architecture overview aligns with [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Sections 1-3. For the complete implementation-ready specification, see FINAL-SPEC.md.

## Goals (Phase 1)
- **B2C-first**: end users first (Bot + API; Miniapp optional).
- **Offline catalog**: venues are served from **our DB**, not from upstream APIs at request time.
- **Ingestion**: sync venues city-by-city (start: Kishinev).
- **Overrides**: manual corrections/curation survive the next sync.

Out of scope (Phase 1): menus, orders, booking, merchant cabinet.

---

## Components

### 1) API (Backend / BFF)
Responsibilities:
- Read operations for catalog:
  - search/list venues
  - venue details
  - saved/favorites (if stored server-side)
- Write operations for TG domain:
  - plans / participants / votes (group planning) - **core MVP feature**
  - booking requests for partner restaurants

Principles:
- **All user reads come from our DB**.
- External APIs (Google Places) are used only by ingestion workers.

### 2) Ingestion Worker (Batch/Job)
Responsibilities:
- City-based sync from data sources:
  - **Primary**: Google Places API (fetch places by categories/geo grid/bounds)
  - **Optional**: Delivery site parsing, ERP integration
  - normalize into our schema
  - upsert `Venue` + `VenueSource`
  - apply dedup rules
- Track sync metrics and failures.
- Support scheduled cadence + manual re-sync.

**Data Sources**:
- **Google Places API** (primary, Phase 1)
- **Delivery site parsing** (optional, for menu/prices/availability)
- **Own ERP integration** (optional, for venues using our system)

The `VenueSource` abstraction supports multiple sources, allowing new sources to be added without changing core logic. See [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 2 and [`docs/TZ-RU.md`](TZ-RU.md) Section 3.2 for details.

### 3) Bot (Telegram)
Responsibilities:
- Primary UX for Phase 1:
  - choose city
  - browse categories
  - search venues
  - open venue card
  - save/share
- **Group planning flow** (`/plan`): create plan, collect preferences, vote, book
- Different CTAs based on venue partner status:
  - Mass venues: "Call" / "Route" / "Menu"
  - Partner venues: "Request Booking in TG"

### 4) Mini App (Telegram WebApp) — optional in Phase 1
- Consumer zone `/c/*` can provide a richer UI for discovery/saved.
- Merchant zone `/m/*` is **Phase 2**.

### 5) Merchant Bot/Cabinet (for Partner Restaurants)
Responsibilities:
- Receive booking requests from group plans
- Confirm / Reject / Propose alternative time
- Track SLA (response time < 5 minutes target)
- View statistics (requests, confirms, conversion rate)
- Simple analytics dashboard

**Two-Track System**:
- **Mass Coverage Track**: All venues (150+ in Kishinev)
  - CTA: "Call" / "Route" / "Open Menu"
  - No booking confirmation in system
- **Partner Track**: 20 selected restaurants
  - CTA: "Request Booking in TG"
  - Booking request → confirmation flow
  - SLA tracking and prioritization in search results

---

## Data Stores

### Catalog DB (recommended: Postgres + PostGIS)
Stores:
- `City`
- `Venue`
- `VenueSource` (e.g. google `place_id`)
- `VenueOverrides`
- optional: `Saved` / `UserSavedVenue`
- `VenuePartner` (flags partner restaurants, SLA settings)

Indexes:
- geo index for radius/bbox search
- text index for name/address search

### TG Domain DB (group planning + booking)
Stores:
- `Plan`, `Participant`, `Vote`, `VoteCast` (+ audit timestamps)
- `BookingRequest` (for partner restaurants)
  - `plan_id`, `venue_id`, `requested_time`, `participants_count`
  - `status` (pending/confirmed/rejected/proposed)
  - `response_time`, `confirmed_at`

---

## Data Flow

### Catalog flow
1) Ingestion job runs for a `City`.
2) Pull from data sources (Google Places, delivery sites, ERP), normalize.
3) Upsert into Catalog DB.
4) Apply dedup + set hidden/duplicate flags.
5) Apply overrides at read time (or materialize a projection).

### User request flow (search/details)
1) Bot/Miniapp calls API.
2) API queries Catalog DB.
3) API returns list/details.
4) Bot renders list/card and actions (save/share/maps).

---

## Auth

### Bot (Consumer)
- Telegram user identity via `from.id`.
- For API calls from bot: use a service token or signed request (MVP-level).
- No additional authentication needed for basic features.

### Miniapp (if used)
- Telegram WebApp `initData` verified server-side.
- `GET /me` can return the user profile and feature flags.
- Merchant linking is Phase 2.

### Merchant Bot/Cabinet
**Authentication Methods (MVP):**

**Option A: Telegram Bot (Recommended for MVP)**
- Merchant authenticates via Telegram bot
- Link Telegram user ID to venue(s) via admin panel
- Merchant receives booking requests in Telegram
- Simple, fast to implement, no separate login system

**Option B: Web Cabinet with Phone Auth**
- Merchant logs in via phone number + SMS code
- Link phone number to venue(s)
- Access web dashboard for booking requests
- More complex, requires SMS service

**MVP Recommendation:** Start with Option A (Telegram Bot), add Option B later if needed.

**Merchant-Venue Linking:**
- Admin creates `VenuePartner` record linking `merchant_user_id` (Telegram ID) to `venue_id`
- One merchant can manage multiple venues (chain restaurants)
- Merchant receives notifications for all linked venues

---

## Notes / Next steps
- See [`docs/CATALOG-RU.md`](CATALOG-RU.md) for the catalog data model and ingestion rules.
- See [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) for implementation-ready specification.
- See [`docs/TZ-RU.md`](TZ-RU.md) for comprehensive Russian technical specification with detailed scenarios.
