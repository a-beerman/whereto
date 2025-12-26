# Miniapp API Alignment Implementation

**Status**: ✅ Complete (Phase 1)  
**Date**: 26 December 2025

## Overview

The miniapp has been successfully aligned with the bot's API calling patterns. Both services now use auto-generated API clients with centralized service wrappers, following consistent architectural principles while respecting their platform-specific async models (Observable vs Promise).

## Changes Implemented

### 1. Created Telegram Auth Interceptor

**File**: [apps/miniapp/src/app/interceptors/telegram-auth.interceptor.ts](../apps/miniapp/src/app/interceptors/telegram-auth.interceptor.ts)

- Globally injects `X-Telegram-Init-Data` header into all HTTP requests
- Mirrors bot's authentication approach (bot uses `X-Service-Token`, miniapp uses `X-Telegram-Init-Data`)
- Eliminates need for manual header injection in each API call

### 2. Created Error Handler Service

**File**: [apps/miniapp/src/app/services/error-handler.service.ts](../apps/miniapp/src/app/services/error-handler.service.ts)

- Centralized error handling with Telegram alerts
- Provides `catchError` operators for RxJS chains
- Matches bot's try-catch + Telegram message pattern
- User-friendly error messages in Russian

### 3. Created Catalog API Service

**File**: [apps/miniapp/src/app/services/catalog-api.service.ts](../apps/miniapp/src/app/services/catalog-api.service.ts)

- Wraps generated `CatalogService` from `@whereto/shared/api-client-angular`
- Clean methods: `getCities()`, `getVenue()`, `searchVenues()`
- Consistent error handling and response shape management
- Maps API responses to clean business objects

### 4. Created Plan API Service

**File**: [apps/miniapp/src/app/services/plan-api.service.ts](../apps/miniapp/src/app/services/plan-api.service.ts)

- Wraps generated `PlansService` from `@whereto/shared/api-client-angular`
- Methods: `createPlan()`, `getPlanDetails()`, `joinPlan()`, `startVoting()`, `castVote()`, `removeVote()`, `getUserVotes()`, `closePlan()`
- Mirrors bot's centralized service pattern
- Single source of truth for plan operations

### 5. Updated App Configuration

**File**: [apps/miniapp/src/app/app.config.ts](../apps/miniapp/src/app/app.config.ts)

- Registered `TelegramAuthInterceptor` via `HTTP_INTERCEPTORS`
- Ensures all HTTP calls carry authentication automatically

### 6. Updated All Components

- **[plan-create.component.ts](../apps/miniapp/src/app/components/plan-create/plan-create.component.ts)**: Uses `CatalogApiService` and `PlanApiService`
- **[voting.component.ts](../apps/miniapp/src/app/components/voting/voting.component.ts)**: Uses `PlanApiService` with fallback join logic
- **[result.component.ts](../apps/miniapp/src/app/components/result/result.component.ts)**: Uses `PlanApiService`

### 7. Removed Legacy Code

- Deleted custom `apps/miniapp/src/app/services/api.service.ts` (was duplicating generated client functionality)
- Removed manual header injection code from components
- Eliminated TODO comments about replacing custom service

## Architecture Alignment

### Bot Pattern (Promise-based)

```typescript
// Centralized service in apps/bot/src/services/api.service.ts
const city = await this.apiClient.getCity(cityId);
```

### Miniapp Pattern (Observable-based)

```typescript
// Centralized services in apps/miniapp/src/app/services/
this.catalogApi.getCities().subscribe((cities) => {
  /* use */
});
this.planApi.createPlan(data).subscribe((plan) => {
  /* use */
});
```

### Shared Principles

1. ✅ Auto-generated API clients from OpenAPI spec
2. ✅ Centralized wrapper services for business logic
3. ✅ Global authentication (interceptor for miniapp, headers in bot)
4. ✅ Consistent error handling with user-friendly alerts
5. ✅ Components/handlers remain lean, inject services only

### Key Differences (By Design)

| Aspect               | Bot                        | Miniapp                                   | Rationale               |
| -------------------- | -------------------------- | ----------------------------------------- | ----------------------- |
| **Async Model**      | Promise (async/await)      | Observable (RxJS)                         | Platform idioms         |
| **Auth Header**      | `X-Service-Token`          | `X-Telegram-Init-Data`                    | Different auth contexts |
| **Client**           | Axios (`api-client-axios`) | Angular HttpClient (`api-client-angular`) | Platform HTTP libraries |
| **State Management** | In-memory Map              | Signals (component-scoped)                | Different UI patterns   |

## Verification

- ✅ All TypeScript files compile without errors
- ✅ No imports of old `api.service.ts` remain
- ✅ All components use new service wrappers
- ✅ Interceptor properly registered in app config
- ✅ Error handling consistent across all services

---

## Next Steps

### Phase 2: Rich UI Implementation

#### 1. Enhanced Venue Display

**Priority**: High  
**Estimate**: 3-5 days

- [ ] Create venue card component with photos, ratings, pricing
- [ ] Implement Google Maps integration for venue location preview
- [ ] Add venue detail modal/page with full information
- [ ] Display working hours, phone, website links
- [ ] Show distance from user location (if available)

**Files to create/update:**

- `apps/miniapp/src/app/components/venue-card/`
- `apps/miniapp/src/app/components/venue-detail/`
- Update voting component to use venue cards

#### 2. Improved Plan Creation Flow

**Priority**: High  
**Estimate**: 2-3 days

- [ ] Add calendar date picker (instead of preset options)
- [ ] Add time slider/picker for more flexible time selection
- [ ] Add map view for area selection (interactive)
- [ ] Add venue type filter chips (multiple selection)
- [ ] Add participant count input
- [ ] Show preview of plan parameters before creation

**Files to update:**

- `apps/miniapp/src/app/components/plan-create/`
- May need additional UI libraries (calendar, map)

#### 3. Voting Experience Enhancements

**Priority**: High  
**Estimate**: 2-3 days

- [ ] Add swipe gestures for voting (Tinder-style)
- [ ] Show real-time vote counts and percentages
- [ ] Add animations for vote actions
- [ ] Display participant avatars/names who voted
- [ ] Add "compare" mode to view venues side-by-side
- [ ] Implement undo/change vote with animation

**Files to update:**

- `apps/miniapp/src/app/components/voting/`

#### 4. Results and Sharing

**Priority**: Medium  
**Estimate**: 1-2 days

- [ ] Enhanced result page with winner highlight
- [ ] Show route/directions to winning venue
- [ ] Add "add to calendar" functionality
- [ ] Improve sharing with custom Telegram message format
- [ ] Show runner-up venues
- [ ] Add booking/reservation button (if integration available)

**Files to update:**

- `apps/miniapp/src/app/components/result/`

#### 5. Search and Browse

**Priority**: Medium  
**Estimate**: 3-4 days

- [ ] Implement venue search page
- [ ] Add category filters (restaurant, cafe, bar, etc.)
- [ ] Add price range filter
- [ ] Add rating filter
- [ ] Add "near me" functionality
- [ ] Implement infinite scroll for results
- [ ] Add saved venues list view

**Files to create:**

- `apps/miniapp/src/app/components/venue-search/`
- `apps/miniapp/src/app/components/venue-list/`
- `apps/miniapp/src/app/components/saved-venues/`

#### 6. User Profile and History

**Priority**: Low  
**Estimate**: 2-3 days

- [ ] Create user profile page
- [ ] Show past plans and results
- [ ] Display favorite venues
- [ ] Show user statistics (plans created, votes cast)
- [ ] Add settings (language, notifications)

**Files to create:**

- `apps/miniapp/src/app/components/profile/`
- `apps/miniapp/src/app/components/plan-history/`

#### 7. Polish and UX

**Priority**: Medium  
**Estimate**: 2-3 days

- [ ] Add loading skeletons instead of spinners
- [ ] Implement pull-to-refresh on lists
- [ ] Add haptic feedback for interactions
- [ ] Improve mobile responsiveness
- [ ] Add dark mode support (respect Telegram theme)
- [ ] Optimize animations and transitions
- [ ] Add empty states for all lists
- [ ] Implement offline detection and messaging

**Files to update:**

- Global styles, theme configuration
- All component stylesheets

### Phase 3: Advanced Features

#### 8. Real-time Updates

**Priority**: Low  
**Estimate**: 5-7 days

- [ ] Implement WebSocket connection for live updates
- [ ] Show real-time participant joins
- [ ] Update vote counts live without refresh
- [ ] Show "user is typing" for comments (if adding chat)
- [ ] Push notifications for plan status changes

**Technical notes:**

- May require API changes for WebSocket support
- Consider using Socket.io or native WebSockets

#### 9. Performance Optimization

**Priority**: Medium  
**Estimate**: 2-3 days

- [ ] Implement response caching (HttpClient interceptor)
- [ ] Add service worker for offline support
- [ ] Optimize bundle size (lazy loading, code splitting)
- [ ] Add image lazy loading
- [ ] Implement virtual scrolling for long lists
- [ ] Profile and optimize render performance

#### 10. Analytics and Monitoring

**Priority**: Low  
**Estimate**: 1-2 days

- [ ] Add analytics tracking (user actions, flows)
- [ ] Implement error logging service
- [ ] Add performance monitoring
- [ ] Track conversion metrics (plan creation → completion)

### Technical Debt Items

1. **Response Type Safety**
   - Audit all response mappings from generated clients
   - Ensure type assertions are safe
   - Add runtime validation where needed

2. **Error Handling Improvements**
   - Add retry logic for transient failures
   - Implement exponential backoff
   - Add network error detection
   - Better offline mode handling

3. **Testing**
   - Add unit tests for new services
   - Add integration tests for components
   - Mock API calls in tests
   - Add E2E tests for critical flows

4. **Documentation**
   - Document service APIs
   - Add component usage examples
   - Create style guide for new components
   - Update README with miniapp setup

### Dependencies to Consider

**UI Libraries:**

- `@angular/material` or `@ng-zorro/ng-mobile` - UI components
- `ngx-swiper-wrapper` - Swipe gestures
- `leaflet` or `@angular/google-maps` - Map integration
- `date-fns` - Date manipulation

**Utilities:**

- `rxjs` operators (already available)
- `@ngrx/component-store` - Advanced state management (if needed)

### Rollout Strategy

1. **Week 1-2**: Enhanced venue display + improved plan creation
2. **Week 3**: Voting experience enhancements
3. **Week 4**: Results, search, and browse
4. **Week 5**: Polish, testing, bug fixes
5. **Week 6+**: Advanced features (real-time, analytics)

### Success Metrics

- User completes plan creation flow (conversion rate)
- Average time to create plan
- Vote participation rate
- Plan completion rate (voting → result)
- User retention (repeat usage)
- App performance (load time, interaction latency)

---

## Notes

- Keep bot functionality as reference implementation for business logic
- Miniapp should enhance, not replace, bot experience
- Maintain API compatibility as both services share the same backend
- Consider A/B testing for new UI patterns
- Gather user feedback early and iterate
