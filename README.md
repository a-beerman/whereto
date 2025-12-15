# TG Jammy MVP (Kishinev)  	

## 

- `apps/api`  tg-platform-api (BFF + TG domain)
- `apps/bot`  Telegram bot (groups, plans, voting, notifications)
- `apps/miniapp`  Angular/Ionic Telegram WebApp (two zones: B2C `/c/*` and B2B `/m/*`)
- `libs/shared`  shared types/constants/utils

## Quickstart
1) Install Node LTS
2) Install deps:
```bash
npm i
```
3) Create `.env` from example:
```bash
cp .env.example .env
```
4) Run (placeholders for now):
```bash
npm run dev
```

## MVP decisions
- Join is required to participate in voting
- Voting: creator selects duration (16h), one-shot vote, cannot change
- Closing: manual by initiator, auto-close when all joined voted, timeout
- Timeout with 0 votes: soft recommendation (top-1) + revote button (initiator only)
- Single miniapp with `/c/*` and `/m/*`, merchant defaults to B2B
- Invite code: reusable + rotation

See `docs/PRD-RU.md` and `libs/shared/src/constants/mvp-settings.ts`.
