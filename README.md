# whereto

MVP for **WhereTo** — a city guide / "where to go" assistant.

This repository is structured as a small monorepo:

- **api/** — backend API (serves catalog + search + places details, auth-lite for MVP).
- **bot/** — Telegram bot (primary B2C entry point for phase 1).
- **miniapp/** — Telegram Mini App / web UI (optional UI layer for phase 1, grows later).
- **libs/** — shared libraries (domain models, clients, utilities).

Documentation lives in **docs/**.

## MVP plan (current)

### Chosen direction

- **B2C-first**: we build for end users first (bot + API). UX: find places, save/share, get curated picks.
- **Offline catalog**: we **sync venues from Google Places into our own DB** (city-by-city) and serve reads from our DB.
- **B2B** (venues/cabinet, promos, campaigns, analytics for businesses) is **phase 2**.

Why offline:

- predictable latency and cost
- consistent ranking/search behavior
- ability to enrich and override data
- resilience to upstream API limits/outages

### Phase 1 scope (MVP)

In scope:

- city catalog: venues (places) + categories/tags
- search & discovery: by query, category, distance, rating
- basic venue card: name, address, geo, photos (links), opening hours (if available)
- editorial/override layer for curation (see catalog doc)
- Telegram bot flows: onboarding → city → browse/search → place details → save/share

Out of scope for phase 1 (explicit):

- menus / products
- table booking
- orders / payments
- delivery
- B2B cabinet for venue owners

## Quickstart

> The repo evolves быстро; commands may differ slightly per module.

1) Clone:

```bash
git clone https://github.com/a-beerman/whereto.git
cd whereto
```

2) Create environment files (per service). Typical pattern:

- `api/.env`
- `bot/.env`

3) Run locally (examples):

```bash
# API
cd api
make dev   # or: docker compose up

# Bot
cd ../bot
make dev
```

If your setup differs, check each module’s README or `Makefile`.

## Key decisions (MVP)

- **One canonical catalog DB** owned by us.
- **Ingestion job** runs per city and refreshes changed venues on a cadence.
- **Dedup + source tracking**: each venue keeps references to upstream sources (Google Places now; others later).
- **Overrides** allow manual fixes/curation without fighting the next sync.

## Docs

- PRD (RU): [`docs/PRD-RU.md`](docs/PRD-RU.md)
- Catalog ingestion & model (RU): [`docs/CATALOG-RU.md`](docs/CATALOG-RU.md)

