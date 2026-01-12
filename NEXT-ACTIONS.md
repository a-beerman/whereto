# WhereTo MVP - Next Actions

## Critical: OpenAPI Client Sync Required ⚠️

The OpenAPI client is out of sync with the API. Run these commands to regenerate:

```bash
# From project root
npm run swagger:export
npm run generate:api-client
```

This will:

1. Export latest API schema to `openapi.json`
2. Generate fresh Angular client → `libs/shared/src/api-client-angular`
3. Generate fresh Axios client → `libs/shared/src/api-client-axios`

After sync, rebuild bot and miniapp:

```bash
nx build shared
nx build bot
nx build miniapp
```

## Type Errors to Fix After Sync

The following interfaces need index signatures for product events:

**File:** `libs/shared/src/constants/events.ts`

Add to both `PlanCreateProperties` and `VoteProperties`:

```typescript
export interface PlanCreateProperties {
  planId: string;
  chatId: string;
  format?: string;
  budget?: string;
  area?: string;
  date?: string;
  time?: string;
  [key: string]: unknown; // <-- ADD THIS
}

export interface VoteProperties {
  planId: string;
  venueId: string;
  userId: string;
  source: 'poll' | 'miniapp' | 'bot';
  [key: string]: unknown; // <-- ADD THIS
}
```

## Integration Checklist

After OpenAPI sync, integrate new services into bot flow:

### 1. Hero Message in Plan Handler

**File:** `apps/bot/src/handlers/plan.handler.ts` around line 400

After plan creation, BEFORE sending announcement:

```typescript
// After: const plan = planResponse.data;

// Import HeroService at top
import { HeroService } from '../services/hero.service';

// In PlanHandler constructor, add heroService parameter
constructor(
  private readonly apiClient: ApiClientService,
  private readonly stateService: StateService,
  private readonly heroService: HeroService // <-- ADD
) {}

// Replace announcement message with hero message
const heroMessage = this.heroService.buildHeroMessage(
  plan.id,
  planContext.format,
  true, // fairness mode = neutral hero
  process.env.MINIAPP_URL
);

await bot.telegram.sendPhoto(
  groupChatId,
  heroMessage.photo,
  {
    caption: heroMessage.caption,
    reply_markup: heroMessage.replyMarkup,
  }
);

// THEN send poll (existing code)
```

### 2. Schedule Results

**File:** `apps/bot/src/handlers/plan.handler.ts` around line 400

After sending poll:

```typescript
// After: this.stateService.setPollContext(...)

// Schedule results if deadline exists
if (plan.votingEndsAt) {
  this.scheduledResults.scheduleResults(plan.id, groupChatId, new Date(plan.votingEndsAt));
}
```

### 3. Pass Services to PlanHandler

**File:** `apps/bot/src/bot.module.ts` constructor

```typescript
this.planHandler = new PlanHandler(
  this.apiClient,
  this.stateService,
  this.heroService, // <-- ADD
  this.scheduledResults, // <-- ADD
);
```

Update PlanHandler constructor signature accordingly.

## Testing Steps

1. **OpenAPI Sync**

   ```bash
   npm run swagger:export
   npm run generate:api-client
   nx build shared
   nx build bot
   nx build miniapp
   ```

2. **Type Fixes**
   - Add index signatures to event interfaces
   - Rebuild all

3. **Integration**
   - Add hero message to plan flow
   - Add scheduled results call
   - Update PlanHandler constructor
   - Rebuild bot

4. **Manual Tests**
   - Create plan in group → verify hero image + poll appear
   - Vote in poll → check API state mirrors votes
   - Close plan manually → verify winner message
   - Set short deadline (2 min) → verify auto-publish
   - Use inline query `@bot создать план` → verify card

5. **Event Logging**
   - Check console for `[ProductEvent]` logs
   - Verify events fired: plan create, vote cast, miniapp page view, card view

## Hero Images

Replace placeholders in `apps/miniapp/public/assets/hero/`:

- hero-neutral-1.jpg (default)
- hero-neutral-2.jpg
- hero-neutral-3.jpg
- hero-dinner-1.jpg
- hero-dinner-2.jpg
- hero-cafe-1.jpg
- hero-bar-1.jpg
- hero-winter-1.jpg
- hero-spring-1.jpg
- hero-summer-1.jpg
- hero-fall-1.jpg

Spec: 1200x600px JPEG, optimized for web, neutral/category themes per README.

## BotFather Setup

Enable inline mode:

```
/setinline @YourBot
Inline placeholder: создать план, ужин, кофе...
```

## Production Considerations

1. **Event Persistence:** Replace `console.log` in `logEvent()` with DB insert or analytics SDK
2. **Job Queue:** Replace `setTimeout` in ScheduledResultsService with Bull/Agenda for persistence
3. **Hero CDN:** Host hero images on CDN, update `MINIAPP_URL` env var
4. **Rate Limiting:** Already configured in API (100 req/min), monitor in production
5. **Error Monitoring:** Add Sentry or similar for bot/API/miniapp

## Documentation

- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Final Spec:** [docs/FINAL-SPEC.md](docs/FINAL-SPEC.md)
- **Implementation Summary:** [docs/MVP-IMPLEMENTATION-SUMMARY.md](docs/MVP-IMPLEMENTATION-SUMMARY.md)
- **Delivery Plan:** [docs/docs_AGENT-DELIVERY-PLAN-RU_Version2.md](docs/docs_AGENT-DELIVERY-PLAN-RU_Version2.md)

---

**Estimated Time to Complete:** 2-3 hours for OpenAPI sync, integration, and testing.
