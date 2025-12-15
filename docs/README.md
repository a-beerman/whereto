# WhereTo Documentation Index

This directory contains all documentation for the WhereTo project. Documentation is organized by category for easy navigation.

## Product & Architecture Documentation

### Core Documents

- **[FINAL-SPEC.md](FINAL-SPEC.md)** - **Implementation-ready specification** (English, concise) - **Start here for implementation**
- **[TZ-RU.md](TZ-RU.md)** - **Comprehensive Russian technical specification** (most detailed, includes scenarios, risks, requirements)
- **[BUSINESS-STRATEGY.md](BUSINESS-STRATEGY.md)** - **Business model, pricing, go-to-market plan, and financial projections**
- **[PRD-RU.md](PRD-RU.md)** - Product Requirements Document (Russian)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - High-level architecture overview
- **[CATALOG-RU.md](CATALOG-RU.md)** - Catalog data model and ingestion architecture
- **[Backlog-M1-M2-RU.md](Backlog-M1-M2-RU.md)** - M1/M2 backlog and milestones
- **[Bot-Copy-RU.md](Bot-Copy-RU.md)** - Telegram bot copy and user flows
- **[DECISIONS-RU.md](DECISIONS-RU.md)** - Architecture and product decisions log
- **[ESTIMATES-RU.md](ESTIMATES-RU.md)** - Cost, load, and time estimates

## Development Documentation

### Getting Started

- **[DEVELOPMENT-SETUP.md](DEVELOPMENT-SETUP.md)** - Complete setup guide for local development
  - Prerequisites and installation
  - Database setup
  - Running services
  - Common development tasks

- **[ENVIRONMENT.md](ENVIRONMENT.md)** - Environment variables and configuration
  - API, Bot, and Mini App configuration
  - Environment-specific settings
  - Secrets management
  - Validation

### Technical Documentation

- **[TECH-STACK.md](TECH-STACK.md)** - Technology stack and framework patterns
  - NestJS backend patterns
  - Angular + Ionic frontend patterns
  - Telegram Bot implementation
  - Shared libraries

- **[DATABASE.md](DATABASE.md)** - Database schema and migrations
  - Entity definitions (catalog, group planning, merchant/booking)
  - Migration strategy
  - PostGIS usage and geo queries
  - Performance considerations

- **[ALGORITHMS.md](ALGORITHMS.md)** - Algorithm specifications
  - Shortlist generation for group plans
  - Preference matching and aggregation
  - Voting mechanism and tie-breaking
  - Ranking formulas for search/list

- **[API.md](API.md)** - REST API documentation
  - Endpoint specifications
  - Request/response formats
  - DTOs and validation
  - Error codes

- **[ALGORITHMS.md](ALGORITHMS.md)** - Algorithm specifications
  - Shortlist generation for group plans
  - Preference matching and aggregation
  - Voting mechanism and tie-breaking
  - Ranking formulas for search/list

- **[I18N.md](I18N.md)** - Internationalization (i18n) implementation guide
  - Multi-language support (Russian, English, Romanian)
  - Bot i18n patterns (Telegraf)
  - Mini App i18n patterns (Angular/Ionic)
  - Translation file structure and best practices

### Code Quality

- **[CODE-STYLE.md](CODE-STYLE.md)** - Coding standards and conventions
  - TypeScript best practices
  - Naming conventions
  - Code organization
  - Formatting and linting

- **[TESTING.md](TESTING.md)** - Testing guidelines and best practices
  - Unit, integration, and E2E tests
  - Test utilities and fixtures
  - Coverage goals
  - Testing tools

### Workflow & Operations

- **[GIT-WORKFLOW.md](GIT-WORKFLOW.md)** - Git workflow and contributing guidelines
  - Branching strategy
  - Commit message conventions
  - Pull request process
  - Code review guidelines

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment and CI/CD
  - Docker configuration
  - CI/CD pipelines
  - Deployment strategies
  - Monitoring and rollback

### Cursor IDE

- **[README-Cursor-RU.md](README-Cursor-RU.md)** - Cursor IDE setup and usage guide (Russian)

## Quick Navigation by Task

### I want to...

**Set up my development environment**
→ Start with [DEVELOPMENT-SETUP.md](DEVELOPMENT-SETUP.md) and [ENVIRONMENT.md](ENVIRONMENT.md)

**Understand the architecture and requirements**
→ Start with [FINAL-SPEC.md](FINAL-SPEC.md) for implementation spec, [TZ-RU.md](TZ-RU.md) for detailed Russian spec, [BUSINESS-STRATEGY.md](BUSINESS-STRATEGY.md) for business model, then [ARCHITECTURE.md](ARCHITECTURE.md) and [CATALOG-RU.md](CATALOG-RU.md)

**Add a new API endpoint**
→ See [API.md](API.md) for conventions, [TECH-STACK.md](TECH-STACK.md) for NestJS patterns

**Work with the database**
→ Check [DATABASE.md](DATABASE.md) for schema and migrations

**Write tests**
→ Follow [TESTING.md](TESTING.md) for guidelines

**Follow coding standards**
→ Reference [CODE-STYLE.md](CODE-STYLE.md)

**Deploy to production**
→ See [DEPLOYMENT.md](DEPLOYMENT.md)

**Contribute code**
→ Read [GIT-WORKFLOW.md](GIT-WORKFLOW.md)

**Use Cursor IDE effectively**
→ See [README-Cursor-RU.md](README-Cursor-RU.md) and `.cursorrules` in project root

## MVP Definition of Done Checklist

Use this checklist to verify MVP completion (from [`FINAL-SPEC.md`](FINAL-SPEC.md)):

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
- [ ] **Group Planning**: `/plan` works end-to-end:
  - [ ] Create plan in group chat
  - [ ] Participants join and set preferences
  - [ ] Shortlist generation
  - [ ] Voting in chat
  - [ ] Booking request (partner venues) or call-to-book (mass venues)
- [ ] **Partner System**: 20 restaurants can receive and confirm booking requests:
  - [ ] Merchant bot/cabinet functional
  - [ ] Booking request flow works
  - [ ] Confirm/reject/propose-time actions
  - [ ] SLA tracking (<5 min response time)
- [ ] **Data Quality**: 
  - [ ] Deduplication implemented (minimal: by external_id + geo+name heuristic)
  - [ ] Overrides system exists and survives re-sync
- [ ] **Observability**:
  - [ ] Ingestion metrics visible (duration, counts, errors)
  - [ ] API latency metrics visible (p95 for search/details)
- [ ] **Scope Compliance**: Phase 2 features (full B2B cabinet, menus/orders, marketplace offers) are NOT implemented

For detailed scenarios and requirements, see [`TZ-RU.md`](TZ-RU.md) Section 12.

## Documentation Standards

- **English**: All development documentation is in English
- **Russian**: Product documentation (PRD, ТЗ, backlog, bot copy) is in Russian
- **Markdown**: All documentation uses Markdown format
- **Code Examples**: Include practical, runnable examples
- **Cross-References**: Documents reference each other where relevant

## Keeping Documentation Updated

- Update documentation when making architectural changes
- Add examples when introducing new patterns
- Keep API documentation in sync with code
- Update setup guides when dependencies change

## Contributing to Documentation

When adding or updating documentation:

1. Follow existing structure and style
2. Include code examples where helpful
3. Cross-reference related documents
4. Keep language consistent (English for dev docs, Russian for product docs)
5. Update this index if adding new documents

