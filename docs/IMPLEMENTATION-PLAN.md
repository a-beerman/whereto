# MVP Implementation Plan

This document tracks the technical implementation progress for the WhereTo MVP.

> **Reference**: This plan aligns with the business phases in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 12 and the backlog in [`docs/Backlog-M1-M2-RU.md`](Backlog-M1-M2-RU.md).

## Implementation Phases

### Phase 0: Foundation & Infrastructure ✅ COMPLETED

**Status**: ✅ Complete

**Deliverables**:

- [x] NX monorepo structure
- [x] TypeScript configuration (strict mode)
- [x] ESLint and Prettier setup
- [x] Husky Git hooks (v9 format)
- [x] Docker Compose for PostgreSQL with PostGIS
- [x] TypeORM configuration
- [x] i18n structure and translation files (ru, en, ro)
- [x] Global error handling filter
- [x] Global logging interceptor
- [x] Health check endpoint
- [x] Database seeding script

**Files Created**:

- Project structure (`apps/api`, `apps/bot`, `apps/miniapp`, `libs/shared`)
- Configuration files (`.eslintrc.json`, `eslint.config.js`, `.prettierrc`, `nx.json`, `tsconfig.base.json`)
- Docker Compose setup
- Shared i18n library

---

### Phase 1: Catalog Domain & Database ✅ COMPLETED

**Status**: ✅ Complete

**Deliverables**:

- [x] TypeORM entities (City, Venue, VenueSource, VenueOverrides, VenuePartner, UserSavedVenue)
- [x] Initial database migration
- [x] Repository layer (CityRepository, VenueRepository, UserSavedVenueRepository)
- [x] Services (CitiesService, VenuesService, UserSavedVenuesService)
- [x] Controllers (CitiesController, VenuesController, UserSavedVenuesController)
- [x] DTOs (VenueFiltersDto, VenueResponseDto, SaveVenueDto)
- [x] User saved venues endpoints (`GET /api/v1/me/saved`, `POST /api/v1/me/saved`, `DELETE /api/v1/me/saved/:venueId`)

**Files Created**:

- `apps/api/src/catalog/entities/*`
- `apps/api/src/catalog/repositories/*`
- `apps/api/src/catalog/services/*`
- `apps/api/src/catalog/controllers/*`
- `apps/api/src/catalog/dto/*`
- `apps/api/src/catalog/catalog.module.ts`
- `apps/api/src/migrations/1700000000000-InitialSchema.ts`

**Remaining**:

- [ ] Test catalog endpoints
- [ ] Add pagination improvements
- [ ] Add caching layer (optional)

---

### Phase 2: Ingestion Worker ✅ COMPLETED

**Status**: ✅ Complete

**Deliverables**:

- [x] Google Places API integration
- [x] City-based sync job
- [x] Data normalization
- [x] Deduplication logic
- [x] Upsert logic (create/update venues)
- [x] Metrics tracking
- [ ] Scheduled job support (can be added with cron or task scheduler)
- [x] Manual re-sync capability (via API endpoint)
- [x] Error handling and retry logic

**Epic**: A2 (from Backlog-M1-M2-RU.md)

**Dependencies**: Phase 1 (database schema)

**Files Created**:

- `apps/api/src/ingestion/services/google-places.service.ts`
- `apps/api/src/ingestion/services/normalization.service.ts`
- `apps/api/src/ingestion/services/deduplication.service.ts`
- `apps/api/src/ingestion/jobs/sync-city.job.ts`
- `apps/api/src/ingestion/controllers/ingestion.controller.ts`
- `apps/api/src/ingestion/ingestion.module.ts`
- `apps/api/src/catalog/repositories/venue-source.repository.ts`

---

### Phase 3: Catalog API Completion ✅ COMPLETED

**Status**: ✅ Complete

**Deliverables**:

- [x] `GET /api/v1/venues` - Search and filter venues
- [x] `GET /api/v1/venues/:id` - Venue details
- [x] `GET /api/v1/cities` - List cities
- [x] `GET /api/v1/cities/:id` - City details
- [x] User saved venues endpoints
- [x] Photo URL generation/proxy
- [x] Open hours parsing and filtering
- [x] Advanced ranking (distance, openNow, ratingCount)
- [ ] Caching layer (optional, can be added later with Redis)
- [x] Rate limiting

**Epic**: A4 (from Backlog-M1-M2-RU.md)

**Files Created**:

- `apps/api/src/catalog/services/photo.service.ts` - Photo reference to URL conversion
- `apps/api/src/catalog/services/hours.service.ts` - Opening hours parsing and filtering
- `apps/api/src/common/guards/throttle.guard.ts` - Rate limiting guard

**Files Modified**:

- `apps/api/src/catalog/services/venues.service.ts` - Added photo URL conversion and openNow filtering
- `apps/api/src/catalog/dto/venue-response.dto.ts` - Added photoUrls field
- `apps/api/src/app.module.ts` - Added ThrottlerModule for rate limiting

---

### Phase 4: Group Planning Domain ✅ COMPLETED

**Status**: ✅ Complete

**Deliverables**:

- [x] TypeORM entities (Plan, Participant, Vote, VoteCast)
- [x] Repository layer (PlanRepository, ParticipantRepository, VoteRepository, VoteCastRepository)
- [x] Shortlist generation service (algorithm implementation)
- [x] Plans service (orchestration)
- [x] Plans controllers (endpoints)
- [x] Plans module
- [x] Database migration for plans tables
- [x] Voting mechanism
- [x] Plan closing logic

**Epic**: C (from Backlog-M1-M2-RU.md)

**Files Created**:

- `apps/api/src/plans/entities/*`
- `apps/api/src/plans/repositories/*`
- `apps/api/src/plans/services/shortlist.service.ts`

**Files Created**:

- `apps/api/src/plans/services/plans.service.ts`
- `apps/api/src/plans/controllers/plans.controller.ts`
- `apps/api/src/plans/dto/*` (create-plan.dto.ts, join-plan.dto.ts, vote.dto.ts, close-plan.dto.ts)
- `apps/api/src/plans/plans.module.ts`
- `apps/api/src/migrations/1700000001000-PlansSchema.ts`

**Endpoints to Implement**:

- `POST /api/v1/plans` - Create plan
- `POST /api/v1/plans/:id/join` - Join plan
- `GET /api/v1/plans/:id/options` - Get shortlist
- `POST /api/v1/plans/:id/vote` - Cast vote
- `POST /api/v1/plans/:id/close` - Close plan
- `GET /api/v1/plans/:id` - Get plan details
- `POST /api/v1/plans/:id/booking-request` - Request booking

---

### Phase 5: Telegram Bot - Discovery Flow ⏸️ NOT STARTED

**Status**: ⏸️ Not Started

**Deliverables**:

- [ ] Bot setup and configuration
- [ ] City selection flow
- [ ] Category browsing
- [ ] Search functionality
- [ ] Results list with pagination
- [ ] Venue card display
- [ ] Save/share actions
- [ ] Route/call/website CTAs

**Epic**: B (from Backlog-M1-M2-RU.md)

**Files to Create**:

- `apps/bot/src/main.ts`
- `apps/bot/src/handlers/*`
- `apps/bot/src/services/*`
- `apps/bot/src/keyboards/*`

---

### Phase 6: Telegram Bot - Group Planning Flow ⏸️ NOT STARTED

**Status**: ⏸️ Not Started

**Deliverables**:

- [ ] `/plan` command handler
- [ ] Plan creation flow
- [ ] Preference collection
- [ ] Shortlist display
- [ ] Voting interface
- [ ] Results display
- [ ] Booking request flow

**Epic**: C (from Backlog-M1-M2-RU.md)

---

### Phase 7: Merchant Bot & Booking System ⏸️ NOT STARTED

**Status**: ⏸️ Not Started

**Deliverables**:

- [ ] Merchant bot setup
- [ ] Booking request endpoints
- [ ] Merchant authentication
- [ ] Booking confirmation/rejection flow
- [ ] Alternative time proposal
- [ ] SLA tracking
- [ ] Merchant statistics

**Epic**: Partner system (from FINAL-SPEC.md)

**Files to Create**:

- `apps/api/src/merchant/services/*`
- `apps/api/src/merchant/controllers/*`
- `apps/api/src/merchant/repositories/*`
- `apps/merchant-bot/` (or separate bot)

---

### Phase 8: Observability & Quality ⏸️ NOT STARTED

**Status**: ⏸️ Not Started

**Deliverables**:

- [ ] Product metrics (search→open, save, share, plans created)
- [ ] Ingestion metrics (sync duration, records processed, duplicates, errors)
- [ ] API latency metrics (p95, p99)
- [ ] Structured logging
- [ ] Error tracking
- [ ] Health checks (already done in Phase 0)
- [ ] Alerting setup

**Epic**: D1, D2 (from Backlog-M1-M2-RU.md)

---

### Phase 9: Testing & Polish ⏸️ NOT STARTED

**Status**: ⏸️ Not Started

**Deliverables**:

- [ ] Unit tests for services
- [ ] Integration tests for API endpoints
- [ ] E2E tests for bot flows
- [ ] Performance testing
- [ ] Load testing
- [ ] Code coverage reporting

---

### Phase 10: Deployment Preparation ⏸️ NOT STARTED

**Status**: ⏸️ Not Started

**Deliverables**:

- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker images for services
- [ ] Production environment configuration
- [ ] Database migration strategy
- [ ] Monitoring setup
- [ ] Backup strategy

---

## Current Progress Summary

**Completed**: 5 phases (Phase 0, Phase 1, Phase 2, Phase 3, Phase 4)
**In Progress**: 0 phases
**Not Started**: 5 phases (Phase 5, 6, 7, 8, 9, 10)

**Overall Progress**: ~50% complete

## Next Steps

1. **Complete Phase 3**: Add missing catalog API features (photo URLs, open hours filtering, caching)
2. **Start Phase 5**: Begin Telegram bot implementation (Discovery Flow)
3. **Start Phase 6**: Implement Telegram bot group planning flow
4. **Start Phase 7**: Merchant bot and booking system

## Notes

- Phase 2 (Ingestion Worker) is critical and should be prioritized as it's needed to populate the database
- Phase 3 (Catalog API) is mostly complete but missing some polish features
- Phase 4 (Group Planning) was started early because entities were already created, but it depends on Phase 2 for venue data
