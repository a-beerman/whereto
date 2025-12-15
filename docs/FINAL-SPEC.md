# WhereTo — Final MVP Specification (Implementation-Ready)

This document is the **single implementation-ready reference** for Phase 1 (MVP).  
It consolidates decisions from: `README.md`, `docs/PRD-RU.md`, `docs/CATALOG-RU.md`, `docs/Backlog-M1-M2-RU.md`, `docs/ARCHITECTURE.md`, `docs/Bot-Copy-RU.md`.

> **For Implementation**: See [Implementation References](#implementation-references) section below for links to detailed technical documentation.

## 1) Product direction (final)
### Phase 1 (MVP): B2C-first
Primary goal: help end users quickly discover places in a city and make group decisions:
**browse/search → place details → save/share** + **group planning → vote → book**.

**Core MVP Features**:
- **Group Planning** (`/plan`): Telegram-native group decision-making (killer feature)
  - Create plan in group chat
  - Collect preferences from participants
  - Generate shortlist and vote
  - Book winning venue
- **Venue Discovery**: browse/search → place details → save/share
- **Two-Track System**:
  - **Mass Coverage**: All venues (150+ in Kishinev) with call-to-book
  - **Partner Pilot**: 20 restaurants with confirmed booking requests

Primary channel:
- **Telegram Bot** (main UX)

Optional channel:
- Mini App (consumer `/c/*`) for richer venue cards and menus

### Phase 2 (explicitly out of MVP)
- Full merchant onboarding / cabinet
- Menus / products / orders / payments (delegated to partners like foodhouse.md)
- Promotions / campaigns / business analytics
- Marketplace offers on plans

## 2) Key decision: Offline catalog (Google Places → our DB)
We do **not** call Google Places for every user query.  
Instead we:
1) sync per city into our **own Postgres** catalog,
2) serve all reads from our DB via our API,
3) refresh via scheduled ingestion.

Why:
- predictable latency + predictable cost
- consistent ranking/search behavior
- ability to enrich/override data
- resilience to upstream limits/outages

### Data Sources

**Primary source (Phase 1)**:
- **Google Places API** — primary data source for venues

**Optional sources** (can be added):
- **Delivery site parsing** — for obtaining current menu, prices, availability data
- **Own ERP integration** — for venues already using our system

The architecture supports multiple sources via the `VenueSource` abstraction, allowing new sources to be added without changing core logic. See [`docs/TZ-RU.md`](TZ-RU.md) Section 3.2 for details.

## 3) System overview (implementation)
### Components
1) **API (Backend / BFF)**
   - serves catalog search & details from DB
   - serves group planning domain (/plan) - **core MVP feature**
   - serves booking requests for partner restaurants
   - optionally serves user favorites (if server-side)

2) **Ingestion Worker / Job**
   - city-based Google Places sync
   - normalization into our schema
   - upserts, dedup, metrics
   - supports scheduled cadence + manual re-sync

3) **Telegram Bot**
   - city selection
   - browse categories
   - search
   - results list with pagination
   - place card + actions (save/share/map/call/site)
   - **Group planning flow** (`/plan`): create plan, collect preferences, vote, book
   - Different CTAs based on venue partner status:
     - Mass venues: "Call" / "Route" / "Menu"
     - Partner venues: "Request Booking in TG"

4) **Merchant Bot/Cabinet** (for 20 partner restaurants)
   - Receive booking requests
   - Confirm / Reject / Propose alternative time
   - View statistics (requests, confirms, response time)
   - SLA tracking

5) **DB**
   - Postgres + PostGIS (recommended)

## 4) Data model (canonical for MVP)
> Minimal fields; can be extended without breaking contracts.

### 4.1 City
- `id`
- `name`
- `country_code`
- `center_lat`, `center_lng`
- `bounds` (optional; bbox/polygon)
- `timezone`
- `is_active`

### 4.2 Venue (canonical user-facing entity)
- `id`
- `city_id`
- `name`
- `address`
- `lat`, `lng` (Note: In database, can be stored as PostGIS `GEOGRAPHY(POINT)` or simple `DECIMAL` columns. See [`docs/DATABASE.md`](DATABASE.md) for both options.)
- `categories` (our normalized categories/tags)
- `rating`, `rating_count` (when available)
- `photo_refs` (references / URLs strategy)
- `hours` (structured or string)
- `status` (`active` | `hidden` | `duplicate`)
- `created_at`, `updated_at`

> **Implementation Note**: See [`docs/DATABASE.md`](DATABASE.md) for complete schema definition, TypeORM entities, and PostGIS usage patterns.

### 4.3 VenueSource (source tracking)
- `id`
- `venue_id`
- `source` (e.g. `google_places`)
- `external_id` (e.g. Google `place_id`)
- `last_synced_at`
- `raw_hash` (for change detection)

Constraints:
- `unique(source, external_id)` (or equivalent)

### 4.4 VenueOverrides (curation layer)
Manual corrections that must survive re-sync:
- `venue_id`
- `name_override`
- `address_override`
- `pin_override` (lat/lng)
- `category_overrides`
- `hidden` (bool)
- `note`
- `updated_by`, `updated_at`

Read-time rule:
- API returns “projected venue” = `Venue` merged with `VenueOverrides`.

## 5) Ingestion pipeline (city-based)
### 5.1 Granularity
- Unit of sync: **City**

### 5.2 High-level algorithm
1) Load city config (bounds/center/radius), categories list.
2) For each category/segment:
   - query Google Places (paging)
   - normalize records into internal model
3) For each normalized record:
   - find `VenueSource` by `(source, external_id)`
   - if exists → update Venue + VenueSource
   - else → create Venue + VenueSource
4) Run dedup:
   - primary: same external_id
   - secondary: geo distance threshold + name similarity
   - tertiary: address similarity
5) Mark duplicates as `duplicate/hidden` (keeping a master).
6) Save metrics (counts, duration, errors).

### 5.3 Cadence (MVP recommendation)
- Full city sync: 1/day (off-peak local time)
- Optional incremental refresh: 2–6h (if feasible)
- Manual re-sync: operator command/script

## 6) API surface (MVP)
> Keep contracts stable, fields can be extended.

### 6.1 Catalog endpoints
- `GET /venues`
  - Query params:
    - `q` (string, optional)
    - `category` (string or list, optional)
    - location filter:
      - `bbox` (string, format: `"minLat,minLng,maxLat,maxLng"` - latitude, longitude order) OR
      - `lat`, `lng`, `radiusMeters` (number)
    - `minRating` (optional)
    - `openNow` (optional; if hours are reliably available)
    - pagination: `limit`, `cursor` (or `offset`, or `page`/`limit`)
- `GET /venues/{id}`

> **Detailed API Documentation**: See [`docs/API.md`](API.md) for complete endpoint specifications, request/response formats, DTOs, error codes, and examples.

### 6.2 Saved/Favorites (choose one approach)
**Option A (server-side favorites)**:
- `POST /saved/{venueId}`
- `DELETE /saved/{venueId}`
- `GET /saved`

**Option B (client-side favorites)**:
- stored in bot/session; no API needed (fast MVP, less cross-device)

### 6.3 Group planning `/plan` (core MVP feature)
**This is the primary differentiator for MVP.**

Endpoints:
- `POST /plans` - Create plan (time, location, budget, format)
- `POST /plans/{id}/join` - Join plan and set preferences
- `GET /plans/{id}/options` - Get shortlist (5 venues) based on preferences
- `POST /plans/{id}/vote` - Vote for venue
- `POST /plans/{id}/close` - Close plan and select winner
- `POST /plans/{id}/booking-request` - Request booking (partner venues only)

Flow:
1. User creates plan in group chat (`/plan`)
2. Participants join and set preferences
3. System generates shortlist from catalog
4. Group votes in chat
5. Winner selected → booking request (if partner) or call-to-book (if mass)

> **Detailed API Documentation**: See [`docs/API.md`](API.md) Section "Group Planning Endpoints" for complete specifications.

### 6.4 Merchant/Partner endpoints (for 20 partner restaurants)
- `GET /merchant/booking-requests` - List pending booking requests
- `POST /merchant/booking-requests/{id}/confirm` - Confirm booking
- `POST /merchant/booking-requests/{id}/reject` - Reject booking
- `POST /merchant/booking-requests/{id}/propose-time` - Propose alternative time
- `GET /merchant/stats` - Statistics (requests, confirms, response time)

> **Detailed API Documentation**: See [`docs/API.md`](API.md) Section "Merchant/Partner Endpoints" for complete specifications.

## 7) Telegram Bot UX (MVP)
Primary flow:
1) City selection
2) Choose category OR search query
3) Results list (pagination)
4) Place card:
   - save/share
   - open in maps
   - call/site if present
   - Different CTAs based on venue type:
     - **Mass venues**: "Call" / "Route" / "Menu"
     - **Partner venues**: "Request Booking in TG"

Group planning flow (`/plan`):
1) User creates plan in group chat (`/plan`)
2) Bot collects: time, location, budget, format
3) Participants join and set preferences (cuisine, alcohol, quiet, etc.)
4) Bot generates shortlist (5 venues) from catalog
5) Group votes in chat
6) Winner selected → booking request (partner) or call-to-book (mass)
7) If partner: restaurant confirms/rejects via merchant bot
8) Bot sends confirmation to all participants

Copy is maintained in `docs/Bot-Copy-RU.md` (RU).  
If making EN canonical, add `docs/Bot-Copy.md`.

## 8) Observability & analytics (minimum)
### 8.1 Product events
- `search` (q/category, city)
- `open_place` (venueId)
- `save_place`
- `share_place`
- `open_plan_flow` (if /plan is used)

### 8.2 Ingestion metrics
- job duration per city
- fetched count
- created/updated venues
- duplicates count
- errors/retries
- last successful sync time per city

### 8.3 SLO (starter)
- **p95 latency** for `/venues`: < 500ms (target)
- **p95 latency** for `/venues/{id}`: < 300ms (target)
- **Ingestion job success rate**: ≥ 95% (target)
- **Bot response time**: 1-2 seconds (including Telegram network)

### 8.4 Non-functional requirements

**Performance**:
- Search venues (`GET /venues`): p95 latency < 500ms
- Venue details (`GET /venues/{id}`): p95 latency < 300ms
- Bot: response to user within 1-2 seconds (including Telegram network)

**Reliability**:
- Ingestion sync must complete successfully ≥ 95% of runs
- On sync failure: logging, alerting, retry mechanism
- API must work even if Google Places is unavailable (read from our DB)

**Scalability** (MVP start):
- Support 1 city in MVP
- Architecture allows adding cities without rewriting (city = separate config and separate worker run)
- Database: Postgres + PostGIS for geo indexes, full-text search

**Security**:
- User authentication via Telegram (`from.id` in bot, `initData` in Mini App)
- For API calls from bot: service token or signed request (MVP-level)
- Manual edits (VenueOverrides) accessible only to operators (role-based authorization)

> **Implementation Guidance**: See [`docs/TECH-STACK.md`](TECH-STACK.md) for observability patterns and [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) for monitoring setup. For detailed scenarios and requirements, see [`docs/TZ-RU.md`](TZ-RU.md) Section 7.

## 9) MVP Definition of Done
MVP is "done" when:
1) One city (Kishinev) is synced end-to-end (Google Places → DB) with repeatable runs.
2) `/venues` search returns stable results (q/category + geo filter + pagination).
3) `/venues/{id}` returns a complete place card.
4) Bot supports city → browse/search → list → card → save/share.
5) **Group planning (`/plan`) works end-to-end**: create → join → preferences → shortlist → vote → booking request.
6) **Partner system works**: 20 restaurants can receive and confirm booking requests via merchant bot/cabinet.
7) Dedup and overrides exist (even minimal), and overrides survive re-sync.
8) Ingestion metrics and API latency metrics are visible.
9) Phase 2 scope (full B2B cabinet, menus/orders, marketplace offers) is not implemented in Phase 1.

## 10) Execution plan reference
Use `docs/Backlog-M1-M2-RU.md` as the current delivery outline (M1/M2).  
If English is required as canonical, convert it to `docs/Backlog-M1-M2.md`.

---

## Implementation References

For detailed implementation guidance, see:

- **[`docs/DEVELOPMENT-SETUP.md`](DEVELOPMENT-SETUP.md)** - Local development setup, dependencies, running services
- **[`docs/TECH-STACK.md`](TECH-STACK.md)** - Framework patterns (NestJS, Angular, Ionic, Telegram Bot), observability, Google Places integration
- **[`docs/DATABASE.md`](DATABASE.md)** - Complete database schema, migrations, PostGIS usage, queries
- **[`docs/API.md`](API.md)** - Detailed REST API specifications, endpoints, DTOs, error codes
- **[`docs/ALGORITHMS.md`](ALGORITHMS.md)** - Detailed algorithm specifications (shortlist generation, preference matching, voting, ranking)
- **[`docs/TESTING.md`](TESTING.md)** - Testing strategies, unit/integration/E2E tests, best practices
- **[`docs/CODE-STYLE.md`](CODE-STYLE.md)** - TypeScript conventions, naming, formatting, linting
- **[`docs/DEPLOYMENT.md`](DEPLOYMENT.md)** - CI/CD, Docker, deployment strategies, monitoring, observability
- **[`docs/ENVIRONMENT.md`](ENVIRONMENT.md)** - Environment variables, configuration, secrets management
- **[`docs/GIT-WORKFLOW.md`](GIT-WORKFLOW.md)** - Branching strategy, commit messages, PR process

## MVP Definition of Done Checklist

Use this checklist to verify MVP completion:

- [ ] **Ingestion**: One city (Kishinev) synced end-to-end (Google Places → DB) with repeatable runs
- [ ] **Search API**: `/venues` search returns stable results with:
  - [ ] Text query (`q` parameter)
  - [ ] Category filtering
  - [ ] Geo filtering (bbox OR lat/lng/radius)
  - [ ] Pagination (cursor or page/limit)
- [ ] **Details API**: `/venues/{id}` returns complete place card with all fields
- [ ] **Bot Flow**: Supports complete user journey:
  - [ ] City selection
  - [ ] Browse categories OR search
  - [ ] Results list with pagination
  - [ ] Place card display
  - [ ] Save/share actions
- [ ] **Data Quality**: 
  - [ ] Deduplication implemented (minimal: by external_id + geo+name heuristic)
  - [ ] Overrides system exists and survives re-sync
- [ ] **Observability**:
  - [ ] Ingestion metrics visible (duration, counts, errors)
  - [ ] API latency metrics visible (p95 for search/details)
- [ ] **Scope Compliance**: Phase 2 features (B2B, booking, menus) are NOT implemented

## 11) Risks and Mitigation

### Risk 1: Exceeding Google Places API Budget
**Description**: If synchronization requires too many API requests, costs may be high.  
**Mitigation**:
- Optimize city traversal strategy (minimize overlap)
- Use incremental updates (only changed venues)
- Limit sync frequency (1x per day instead of more frequent)
- Track costs, set limits in Google Cloud

### Risk 2: Poor Deduplication Quality
**Description**: System creates too many duplicates or merges different venues.  
**Mitigation**:
- Start with conservative rules (only by place_id)
- Gradually add geo+name heuristics, tracking false positives
- Provide operator tool for manual duplicate marking
- Use feedback loop: operator marks duplicate → system considers in next run

### Risk 3: Stale Data (Hours, "Open Now" Status)
**Description**: Venue changed hours, but sync was yesterday.  
**Mitigation**:
- In MVP, accept that data may be inaccurate (trade-off for speed and cost)
- In card, indicate "data as of [last sync date]"
- In Phase 2: add "report error" and prioritize resync of popular venues

### Risk 4: Low User Engagement
**Description**: Users don't find needed venues or don't return.  
**Mitigation**:
- A/B test bot UX (button order, copy)
- Collect feedback (button "didn't find needed venue")
- Improve ranking (distance, rating, openNow)
- Add collections/recommendations (Phase 2)

### Risk 5: Compliance / Legal
**Description**: Using Google Places data may require compliance (attribution, caching restrictions).  
**Mitigation**:
- Review Google Places API Terms of Service
- Include attribution in cards (if required)
- Ensure data storage in our DB doesn't violate ToS (usually allowed for caching with reasonable TTL and attribution)

> **Detailed Risk Analysis**: See [`docs/TZ-RU.md`](TZ-RU.md) Section 11 for comprehensive risk analysis.

## 12) MVP Timeline and Milestones (Kishinev)

### Phase 0: Concierge Pilot (Weeks 1-2)
**Goal**: Prove group planning mechanics work

- Bot: `/plan` creation, preference collection, voting
- Catalog: Connect top 50 restaurants from existing 150
- Booking: Manual confirmation via operator for 5-10 restaurants
- **Metrics Target**: ≥20 plans/week, vote completion ≥40-50%

### Phase 1: MVP v1 (Weeks 3-6)
**Goal**: Automated partner booking system

- Mini App: Venue cards + menus (read-only)
- Automated shortlist generation
- Merchant bot/cabinet: Confirm/reject/propose time
- Partner prioritization in shortlist
- **Metrics Target**: 20 partners, median response <5 min, confirm rate ≥60%

### Phase 2: Monetization Test (Weeks 7-10)
**Goal**: First paying restaurants and stable usage

- Hybrid pricing: $1 per confirmed booking + $29/month subscription
- UX improvements: "midpoint between participants", presets
- Affiliate integration: foodhouse.md delivery links
- **Metrics Target**: 100 plans/week, 200-300 booking requests/month, first revenue

### Success Criteria
- **User Engagement**: 100 plans/week by end of week 8
- **Partner Performance**: 60%+ confirm rate, <5 min median response
- **Retention**: 20-30% of initiators create second plan within 30 days
- **Revenue**: First paying partners (5-10 restaurants on subscription)

> **Business Strategy**: See [`docs/BUSINESS-STRATEGY.md`](BUSINESS-STRATEGY.md) for detailed business model, pricing, go-to-market plan, and financial projections.

## 13) Algorithm Specifications

### 13.1 Shortlist Generation Algorithm

Generate shortlist of 5 venues for a plan based on participant preferences.

**Inputs:**
- Plan: date, time, area/location, budget, format
- Participants: preferences (cuisine, alcohol, quiet, etc.), locations (for midpoint)
- Venue catalog: filtered by city, status = 'active'

**Algorithm:**
1. **Calculate meeting point**:
   - If specific location provided → use it
   - If "midpoint" → calculate centroid of participant locations
   - If area name → use area center or city center

2. **Filter venues**:
   - Status = 'active'
   - City matches plan city
   - Categories match format (dinner/bar/coffee)
   - Budget range matches (if available)
   - Open at requested time (if hours available)

3. **Score venues** (0-1 scale):
   - **Distance score** (40%): closer = higher score
     - `distanceScore = 1 - (distance / maxDistance)`
     - Max distance: 5km for city center, 10km for suburbs
   - **Rating score** (30%): higher rating = higher score
     - `ratingScore = (rating - 3.0) / 2.0` (normalize 3-5 to 0-1)
   - **Preference match** (20%): aggregate participant preferences
     - Category match: +0.1 per matching preference
     - Budget match: +0.1 if matches
   - **Partner bonus** (10%): partner venues get +0.1 boost

4. **Rank and select top 5**:
   - Sort by total score (descending)
   - Take top 5
   - Ensure diversity (max 2 from same category if possible)

**Output:** Array of 5 venues with scores

### 13.2 Preference Matching

Aggregate participant preferences for shortlist generation.

**Preference fields:**
- `format`: dinner/bar/coffee
- `budget`: $/$$/$$$
- `cuisine`: array of cuisine types
- `alcohol`: yes/no/prefer
- `quiet`: yes/no
- `outdoor`: yes/no
- `kidsFriendly`: yes/no

**Aggregation rules:**
- **Format**: Use plan format (majority wins if conflicts)
- **Budget**: Use plan budget or average if not specified
- **Cuisine**: Union of all participant cuisines
- **Boolean preferences**: Majority vote (yes if >50% prefer)

### 13.3 Voting Mechanism

**Voting rules:**
- One vote per participant per voting session
- Vote cannot be changed once cast
- Voting session duration: configurable (default: 2 hours)
- Winner: venue with most votes
- Tie-breaking: highest score from shortlist generation

**Timeout handling:**
- If no votes cast: recommend top-scored venue, offer revote
- If voting ends with tie: recommend highest-scored tied venue

### 13.4 Ranking Formula (Search/List)

For general venue search/list endpoints:

**Base ranking:**
- **Distance** (if lat/lng provided): primary sort
- **Rating**: secondary sort (if no location)
- **Partner boost**: partner venues ranked higher (multiply score by 1.2)
- **Open now**: venues currently open ranked higher (if hours available)

**Formula:**
```
score = (distanceScore * 0.5) + (ratingScore * 0.3) + (partnerBoost * 0.2)
```

## Appendix: What is intentionally NOT specified here
- Exact Google Places API request strategy (grid/bounds/type list) — depends on cost/coverage decisions. See [`docs/TECH-STACK.md`](TECH-STACK.md) for implementation patterns.
- UI details for the Mini App — optional in Phase 1.

## References

- **[`docs/TZ-RU.md`](TZ-RU.md)** - Comprehensive Russian technical specification with detailed scenarios, risks, and requirements
- **[`docs/PRD-RU.md`](PRD-RU.md)** - Product requirements document (Russian)
- **[`docs/Backlog-M1-M2-RU.md`](Backlog-M1-M2-RU.md)** - Detailed backlog by months