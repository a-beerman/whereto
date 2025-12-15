# Development Setup Guide

This guide covers the complete setup process for local development of the WhereTo project.

> **Reference**: This setup guide supports implementation of [`docs/FINAL-SPEC.md`](FINAL-SPEC.md). For the canonical implementation-ready specification, see FINAL-SPEC.md.

## Prerequisites

### Required Software

- **Node.js**: LTS version (v20.x or later recommended)
- **npm** or **yarn**: Package manager
- **PostgreSQL**: v14+ with PostGIS extension
- **Git**: Version control
- **NX CLI**: `npm install -g nx` (optional, for direct CLI usage)

### Recommended Tools

- **Docker & Docker Compose**: For local database setup
- **VS Code** or **Cursor IDE**: Recommended editors
- **Postman** or **Insomnia**: API testing
- **pgAdmin** or **DBeaver**: Database management

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd whereto
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create environment files for each service:

```bash
# API
cp apps/api/.env.example apps/api/.env

# Bot
cp apps/bot/.env.example apps/bot/.env

# Mini App (if applicable)
cp apps/miniapp/.env.example apps/miniapp/.env
```

See `docs/ENVIRONMENT.md` for detailed environment variable documentation.

### 4. Database Setup

#### Option A: Docker Compose (Recommended)

```bash
docker compose up -d postgres
```

This starts PostgreSQL with PostGIS extension.

#### Option B: Local PostgreSQL

1. Install PostgreSQL with PostGIS extension
2. Create database:
```sql
CREATE DATABASE whereto_catalog;
CREATE EXTENSION postgis;
```

3. Update connection string in `apps/api/.env`

### 5. Run Database Migrations

```bash
# From API directory
npm run migration:run
# Or using NX
nx run api:migration:run
```

### 6. Seed Data (Optional)

```bash
npm run seed
# Or
nx run api:seed
```

## Running the Application

### Development Mode

Run all services concurrently:

```bash
npm run dev
```

Or run services individually:

```bash
# API only
npm run dev:api
# Or
nx serve api

# Bot only
npm run dev:bot
# Or
nx serve bot

# Mini App only
npm run dev:miniapp
# Or
nx serve miniapp
```

### Service URLs

- **API**: http://localhost:3000
- **Bot**: Runs as Telegram bot (requires bot token)
- **Mini App**: http://localhost:4200 (Angular/Ionic)

## Project Structure

```
whereto/
├── apps/
│   ├── api/              # NestJS backend API
│   ├── bot/              # Telegram bot (TypeScript)
│   └── miniapp/          # Angular + Ionic frontend
├── libs/
│   └── shared/           # Shared TypeScript libraries
│       ├── constants/    # Shared constants
│       ├── types/        # Shared TypeScript types
│       └── utils/        # Shared utilities
├── docs/                 # Documentation
└── package.json          # Root package.json
```

## NX Workspace Commands

### Build

```bash
# Build all
nx run-many --target=build --all

# Build specific app
nx build api
nx build bot
nx build miniapp
```

### Test

```bash
# Test all
nx run-many --target=test --all

# Test specific app/lib
nx test api
nx test shared
```

### Lint

```bash
# Lint all
nx run-many --target=lint --all

# Lint specific app/lib
nx lint api
```

## Common Development Tasks

### Adding a New Library

```bash
nx generate @nx/node:library my-lib --directory=libs/my-lib
```

### Adding a New Service

```bash
# For NestJS API module
nx generate @nx/nest:library my-module --directory=libs/api/my-module

# For shared library
nx generate @nx/node:library my-shared --directory=libs/shared/my-shared
```

### Database Migrations

```bash
# Generate migration
npm run migration:generate -- --name=MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## Troubleshooting

### Port Already in Use

If port 3000 (API) or 4200 (Mini App) is already in use:

```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>
```

Or change port in environment configuration.

### Database Connection Issues

1. Verify PostgreSQL is running: `docker ps` or `pg_isready`
2. Check connection string in `.env` file
3. Verify PostGIS extension: `SELECT PostGIS_version();`

### Module Resolution Issues

Clear NX cache:

```bash
nx reset
rm -rf node_modules
npm install
```

### TypeScript Errors

```bash
# Rebuild TypeScript project references
nx run-many --target=build --all
```

## Next Steps

- Read `docs/TECH-STACK.md` for framework-specific patterns
- Review `docs/CODE-STYLE.md` for coding conventions
- Check `docs/API.md` for API development guidelines
- See `docs/TESTING.md` for testing practices

