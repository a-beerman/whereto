# WhereTo MVP Implementation Summary

**Date:** 27 December 2025
**Status:** Core features implemented, ready for testing and OpenAPI sync

## ✅ Completed Features

### 1. Bot: Plans & Voting Infrastructure (Already Existed)

- **Location:** `apps/bot/src/handlers/plan.handler.ts` (1817 lines)
- **Features:**
  - `/plan` command with quick-button wizard (date/time/area/budget/format)
  - Native Telegram Poll creation with 5-10 venue options
  - Poll answer mirroring to API (vote sync with 1-2s debounce)
  - Venue rotation (show more options)
  - Plan closure and winner announcement
- **API Integration:** Full CRUD for plans, participants, votes via `ApiClientService`

### 2. Hero Images & Copy Templates (NEW ✨)

- **Hero Service:** `apps/bot/src/services/hero.service.ts`
  - Neutral-first selection (fairness mode for groups)
  - Category-specific images (dinner, cafe, bar)
  - Seasonal images (winter, spring, summer, fall)
  - `buildHeroMessage()` returns photo + caption + web_app CTA
- **Copy Templates:** `libs/shared/src/constants/copy.ts`
  - Neutral messages (no venue bias): "🎉 Время собраться вместе!"
  - Category templates: dinner, cafe, bar
  - Seasonal templates
  - `selectHeroCopy()` helper with fairness mode
- **Assets:** Placeholders documented in `apps/miniapp/public/assets/hero/README.md`
  - Need 11 images (1200x600): 3 neutral, 2 dinner, 1 cafe, 1 bar, 4 seasonal
  - Guidelines: clean, inviting, not overly branded

### 3. Scheduled Results Publishing (NEW ✨)

- **Service:** `apps/bot/src/services/scheduled-results.service.ts`
- **Features:**
  - `scheduleResults(planId, chatId, deadline, format)` — schedule job
  - `cancelScheduled(planId)` — cancel if closed early
  - Auto-publish winner message with venue card link
  - Handles ties (pick first leader), no-votes scenario
  - Updates plan status to `closed`

### 4. Inline Mode (NEW ✨)

- **Handler:** `apps/bot/src/handlers/inline.handler.ts`
- **Integration:** Registered in `apps/bot/src/bot.module.ts`
- **Features:**
  - Generic "create plan" card
  - Format-specific cards (dinner, cafe) based on query
  - Generates `t.me/<bot>?start=<plan_type>` links
  - Allows sharing without adding bot to group

### 5. Product Events Schema (NEW ✨)

- **Schema:** `libs/shared/src/constants/events.ts`
- **Event Types:**
  - Bot: `BOT_PLAN_CREATE_COMPLETE`, `BOT_PLAN_VOTE`, `BOT_PLAN_VOTE_REMOVE`
  - API: `API_PLAN_CREATE`, `API_VOTE_CAST`, `API_VOTE_REMOVE`
  - Miniapp: `MINIAPP_VOTE_PAGE_VIEW`, `MINIAPP_VOTE_CAST`, `MINIAPP_CARD_VIEW`, `MINIAPP_MAP_OPEN`
- **Helpers:** `createEvent()`, `logEvent()` (currently logs to console, ready for DB/analytics)

### 6. Miniapp Product Event Logging (NEW ✨)

- **VotingComponent:** `apps/miniapp/src/app/components/voting/voting.component.ts`
  - Logs `MINIAPP_VOTE_PAGE_VIEW` on init
  - Logs `MINIAPP_VOTE_CAST` on successful vote
- **VenueDetailComponent:** `apps/miniapp/src/app/components/venue-detail/venue-detail.component.ts`
  - Logs `MINIAPP_CARD_VIEW` on init (with source param)
  - Logs `MINIAPP_MAP_OPEN` when opening Google Maps

### 7. Bot Product Event Logging (NEW ✨)

- **Plan Handler:** `apps/bot/src/handlers/plan.handler.ts`
  - Logs `BOT_PLAN_CREATE_COMPLETE` after plan creation
  - Logs `BOT_PLAN_VOTE` on successful poll vote

## 📋 Next Steps (Prioritized)

### Critical (Blocking Launch)

1. **OpenAPI Client Sync** (Task #9)

   ```bash
   npm run swagger:export
   npm run generate:api-client
   ```

   - Verify PlanService and VoteService in Angular client
   - Test miniapp → API calls

2. **Hero Image Assets**
   - Replace placeholders in `apps/miniapp/public/assets/hero/`
   - 11 images @ 1200x600px (JPEG, optimized)
   - Follow guidelines in README.md

3. **Integrate Hero into Plan Flow**
   - Update `plan.handler.ts` to call `heroService.buildHeroMessage()`
   - Send hero message BEFORE poll message
   - Test in group chat

4. **Test Scheduled Results**
   - Call `scheduledResults.scheduleResults()` after plan creation
   - Test with short deadline (e.g., 2 minutes)
   - Verify winner message and plan closure

5. **Enable Inline Mode in BotFather**
   - Set inline mode enabled
   - Set inline placeholder: "создать план, ужин, кофе..."
   - Test `@WhereTo_City_Bot создать план`

### High Priority

6. **API Product Event Logging**
   - Add logging in `apps/api/src/plans/services/plans.service.ts`:
     - `API_PLAN_CREATE` in `createPlan()`
     - `API_VOTE_CAST` in `castVote()`
     - `API_VOTE_REMOVE` in `removeVote()`
   - Consider adding `ProductEventsService` in API

7. **Event Persistence**
   - Decide: Postgres table or analytics service (Amplitude, Mixpanel)?
   - Update `logEvent()` in `events.ts` to persist
   - Create migration for `product_events` table if needed

8. **Testing Checklist**
   - [ ] `/plan` in group → hero + poll → votes → winner
   - [ ] Poll mirroring (Telegram vote → API state)
   - [ ] Inline query → share card → group access without bot
   - [ ] Miniapp vote page → vote → leader display
   - [ ] Venue card → details → map → events logged
   - [ ] Scheduled results at deadline
   - [ ] Tie-break logic (first leader)

### Medium Priority

9. **Save/Share Buttons in VenueDetailComponent**
   - Add "❤️ Сохранить" button (call API `/saved`)
   - Add "📤 Поделиться" button (Telegram share sheet)
   - Log `MINIAPP_VENUE_SAVE` and `MINIAPP_VENUE_SHARE` events

10. **Metrics Dashboard**
    - Pull events from DB
    - KPIs: plans created, votes cast, CTR (poll → miniapp), time to decision
    - Weekly report for pilot

## 🗂️ File Structure Reference

```
apps/
  bot/src/
    handlers/
      plan.handler.ts          # 1817 lines, full plan flow + poll + voting
      inline.handler.ts         # NEW: inline query handler
    services/
      hero.service.ts          # NEW: hero image selection
      scheduled-results.service.ts  # NEW: auto-publish results
      api-client.service.ts    # API wrapper (plans, votes, venues)
      state.service.ts         # In-memory state (plan context, poll context)
    bot.module.ts              # UPDATED: registered inline handler + services

  miniapp/src/app/components/
    voting/
      voting.component.ts      # UPDATED: added vote event logging
    venue-detail/
      venue-detail.component.ts  # UPDATED: added card view + map event logging

  miniapp/public/assets/hero/
    README.md                  # Hero image guidelines
    hero-neutral-1.jpg         # Placeholder (need real image)
    ... (10 more)

  api/src/plans/
    entities/
      plan.entity.ts           # Plan with telegramChatId, date, time, area, budget, format
      vote.entity.ts           # Vote session
      vote-cast.entity.ts      # Individual votes (userId, venueId, castAt)
      participant.entity.ts    # Plan participants
    services/
      plans.service.ts         # CRUD + castVote/removeVote
    controllers/
      plans.controller.ts      # REST endpoints

libs/shared/src/
  constants/
    copy.ts                    # NEW: hero copy templates
    events.ts                  # NEW: product events schema
  index.ts                     # UPDATED: export copy + events
```

## 🔧 Environment Variables

Ensure these are set:

- `BOT_TOKEN` — Telegram bot token
- `MINIAPP_URL` — Miniapp public URL (e.g., `https://whereto.app`)
- `API_URL` — API base URL (for bot/miniapp)

## 🚀 Run Commands

Development:

```bash
npm run dev              # all services
nx serve api             # API only
nx serve bot             # bot only
nx serve miniapp         # miniapp only
```

OpenAPI sync:

```bash
npm run swagger:export          # export openapi.json
npm run generate:api-client     # generate Angular + Axios clients
```

## 🧪 Testing Notes

1. **Poll Mirroring:** Check `apps/bot/src/handlers/plan.handler.ts` lines 1086-1220 for poll answer handlers. Logs should show "✅ Vote recorded" when Telegram poll answer arrives.

2. **Product Events:** Currently log to console. Search for `[ProductEvent]` in logs. Before production, implement persistence.

3. **Hero Fairness Mode:** Default `fairnessMode=true` for groups. Pass `fairnessMode=false` to use category-specific images (use with caution to avoid bias).

4. **Scheduled Results:** `scheduledResults.scheduleResults()` uses `setTimeout()`. For production, consider persistent job queue (Bull, Agenda) to survive bot restarts.

## ⚠️ Known Limitations

1. **Hero Images:** Placeholders only. Need design assets.
2. **Event Persistence:** Console logging only. Need DB/analytics integration.
3. **Scheduled Results:** In-memory timers (lost on restart). Consider job queue for production.
4. **Inline Mode:** Not enabled in BotFather yet.
5. **Save/Share Buttons:** UI exists in VenueDetail, but buttons not added yet.

## ✨ Acceptance Criteria Status

From `docs/docs_AGENT-DELIVERY-PLAN-RU_Version2.md`:

### Epic 1: Гибридный групповой сценарий

- ✅ `/plan` с быстрыми кнопками (дата/район/бюджет/формат)
- ⏳ Сообщение 1: hero + CTA (need to integrate hero into flow)
- ✅ Сообщение 2: нативный Poll (3-10 вариантов)
- ⏳ Итоги по дедлайну (service created, need to call in plan flow)

### Epic 2: Миниапп Vote + Card

- ✅ VotePage: рендер вариантов, голос в один тап, показ лидера
- ✅ CardPage: фото, теги, рейтинг, часы, телефон, сайт, маршрут
- ✅ Контекст planId через web_app/startapp

### Epic 3: Личный поиск (бот)

- ✅ Пресеты и свободный текст (existing search.handler.ts)
- ✅ Выдача списка карточек
- ✅ Навигация к карточке и миниаппу

### Epic 4: Hero-image и копирайт

- ✅ Набор шаблонов (6-9 вариантов)
- ✅ Правила выбора (neutral-first)
- ⏳ Ассеты (placeholders)

### Epic 5: Inline-режим и шэр без добавления бота

- ✅ Inline карточка плана с CTA миниаппа
- ⏳ Включить в BotFather
- ✅ Форвард карточки из лички в группу

### Epic 6: Метрики и события

- ✅ Единая схема событий
- ✅ Логирование в боте/миниаппе
- ⏳ Дашборд (need event persistence + dashboard)

---

**Overall Status:** 80% complete. Core infrastructure done. Need: hero integration, OpenAPI sync, real hero images, event persistence, testing.
