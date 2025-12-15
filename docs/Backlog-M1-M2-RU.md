# Бэклог M1–M2 (RU)

> Цель: **B2C-first** продукт с **офлайн‑каталогом мест** (синк Google Places → наша БД по городам). Фокус: discovery/search → карточка места → сохранить/поделиться.  
> **B2B, бронирования, меню/товары** — **Phase 2**.

## Принципы релиза
- **Оффлайн по умолчанию**: чтение каталога из нашей БД; в приложении/боте — кэш и быстрые ответы.
- **Скорость и простота**: минимум экранов/состояний.
- **Каталог как истина**: единая модель Venue + источники + overrides.

---

## Month 1 (M1): офлайн‑каталог + B2C ядро + /plan

### Epic A: Catalog (offline sync + read API)
- A1: Модель `City/Venue/VenueSource/VenueOverrides` (см. `docs/CATALOG-RU.md`).
- A2: Ingestion job: синк 1 города (start: Кишинёв) из Google Places в БД.
- A3: Дедуп (минимальный): по `place_id` + geo+name эвристика.
- A4: Read API:
  - `GET /venues` (поиск/фильтры: q, category, bbox/radius, minRating)
  - `GET /venues/:id` (карточка)
- A5: Фото: хранение refs + отдача URL (или прокси) + базовый кэш.
- A6: Overrides: скрыть/поправить поля без пересинка.

### Epic B: B2C discovery (Bot-first; miniapp опционально)
- B1: Bot: выбор города + категории + поиск.
- B2: Bot: список результатов (пагинация) + открыть карточку.
- B3: Bot: действия в карточке: “Сохранить”, “Поделиться”, “Маршрут/Позвонить/Сайт” (если есть).
- B4: Saved (минимум): избранное пользователя.

> Miniapp B2C (`/c/*`) — только если нужно для UX; иначе оставить на M2.

### Epic C: Plan + Join + Vote (оставляем)
- C1: `/plan` создаёт план.
- C2: Join required (POST /plans/:id/join).
- C3: Prefs (минимально: формат/бюджет/район/время).
- C4: Generate shortlist из каталога (top N по скорингу).
- C5: Vote create с 1/2/3/6h duration.
- C6: Cast one-shot.
- C7: Close: manual / auto_all_voted / timeout + tie-break.
- C8: Timeout no votes: soft-reco (top-1) + revote (initiator only).

### Epic D: Observability & UX quality
- D1: Метрики: search→open card, save, share, plans created.
- D2: p95 latency для поиска/карточки.

---

## Month 2 (M2): качество каталога + B2C polish

### Epic E: Catalog quality
- E1: Улучшить дедуп + инструмент “mark duplicate/hidden”.
- E2: Scheduled refresh (cadence) + ручной resync.
- E3: Админ-команды (минимум): hide/unhide, edit overrides, resync.

### Epic F: Discovery improvements
- F1: Ранжирование (distance/openNow/ratingCount).
- F2: Подборки/категории (простые коллекции).
- F3: Улучшенный поиск (синонимы/опечатки — минимально).

### Epic G: Miniapp B2C (если нужно)
- G1: `/c/discover` (категории + поиск).
- G2: `/c/venues/:id` (карточка)
- G3: `/c/saved`

---

## Phase 2: B2B + availability/booking + меню

- Claim/merchant onboarding + кабинет.
- “Уточнить наличие мест” (availability requests) для подключённых заведений.
- Бронирование/заказы/меню — отдельные итерации.
