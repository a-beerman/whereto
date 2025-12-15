# Architecture: High-level overview (B2C-first + Offline Catalog)

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
- Write operations for TG domain (if used in Phase 1):
  - plans / participants / votes (group planning)

Principles:
- **All user reads come from our DB**.
- External APIs (Google Places) are used only by ingestion workers.

### 2) Ingestion Worker (Batch/Job)
Responsibilities:
- City-based sync from Google Places:
  - fetch places by categories/geo grid/bounds
  - normalize into our schema
  - upsert `Venue` + `VenueSource`
  - apply dedup rules
- Track sync metrics and failures.
- Support scheduled cadence + manual re-sync.

### 3) Bot (Telegram)
Responsibilities:
- Primary UX for Phase 1:
  - choose city
  - browse categories
  - search venues
  - open venue card
  - save/share
- Optional group flow (if kept): `/plan`, join, voting.

### 4) Mini App (Telegram WebApp) — optional in Phase 1
- Consumer zone `/c/*` can provide a richer UI for discovery/saved.
- Merchant zone `/m/*` is **Phase 2**.

---

## Data Stores

### Catalog DB (recommended: Postgres + PostGIS)
Stores:
- `City`
- `Venue`
- `VenueSource` (e.g. google `place_id`)
- `VenueOverrides`
- optional: `Saved` / `UserSavedVenue`

Indexes:
- geo index for radius/bbox search
- text index for name/address search

### TG Domain DB (if you keep /plan in Phase 1)
Stores:
- `Plan`, `Participant`, `Vote`, `VoteCast` (+ audit timestamps)

---

## Data Flow

### Catalog flow
1) Ingestion job runs for a `City`.
2) Pull from Google Places, normalize.
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

### Bot
- Telegram user identity via `from.id`.
- For API calls from bot: use a service token or signed request (MVP-level).

### Miniapp (if used)
- Telegram WebApp `initData` verified server-side.
- `GET /me` can return the user profile and feature flags.
- Merchant linking is Phase 2.

---

## Notes / Next steps
- See `docs/CATALOG-RU.md` for the catalog data model and ingestion rules.
