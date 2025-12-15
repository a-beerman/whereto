# Architecture: High-level overview

## Components
- API (`apps/api`): `tg-platform-api`
  - facade for internal restaurants API (read)
  - owns TG domain (write): plans, participants, votes, vote casts, booking requests, merchant links
- Bot (`apps/bot`): Telegram bot
  - group flows: /plan, join, voting, notifications
- Mini App (`apps/miniapp`): Angular/Ionic WebApp
  - `/c/*` consumer zone
  - `/m/*` merchant zone

## Data
- Internal API (WCF): restaurants, menus (read-only)
- New DB (Postgres recommended): TG domain (write)

## Auth
- Telegram WebApp initData is verified server-side
- `GET /me` returns roles and merchantIds
- `POST /merchant/link` links user to merchant via reusable invite code
