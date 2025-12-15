# Cursor IDE Guide for WhereTo Project

This guide explains how to effectively use Cursor IDE with the WhereTo project.

## Quick Start

1. Open the repository root in Cursor IDE
2. The `.cursorrules` file will automatically provide context to AI assistants
3. Use Cmd/Ctrl + K for inline edits, Cmd/Ctrl + L for chat

## Project Context

Cursor IDE uses the `.cursorrules` file in the project root to understand:
- Project architecture and principles
- Domain model (City, Venue, VenueSource, VenueOverrides)
- Code style and conventions
- Key patterns and anti-patterns

## Key Features for This Project

### AI Context Awareness

The AI assistant understands:
- **Offline-first architecture**: All user reads from our DB, not external APIs
- **City-based ingestion**: Venues synced per city via batch jobs
- **Override system**: Manual edits survive syncs
- **B2C-first focus**: Phase 1 is end-user focused

### Recommended Workflows

#### When Adding New Features

1. Reference domain model in `docs/CATALOG-RU.md`
2. Check `docs/ARCHITECTURE.md` for component responsibilities
3. Follow NX monorepo patterns for app/library structure
4. Ensure offline-first principle (no external API calls in request handlers)

#### When Working with Catalog/Ingestion

1. Review `docs/CATALOG-RU.md` for data model
2. Remember: ingestion jobs only, never in API handlers
3. Apply deduplication rules (Source ID → Geo+name → Address)
4. Always apply overrides when reading venue data

#### When Working with API

1. All reads from Catalog DB only
2. Use PostGIS for geo queries
3. Apply venue overrides at read time
4. Cache popular queries with short TTL

## Code Generation Tips

When asking AI to generate code:

- **Be specific about domain**: Mention "Venue", "City", "VenueSource" explicitly
- **Reference patterns**: "Follow the ingestion job pattern from docs"
- **Specify scope**: "This is for the API app, not ingestion worker"
- **Mention constraints**: "Remember: no external API calls in this handler"

## Common Commands

- `@docs` - Reference documentation files
- `@libs/shared` - Reference shared libraries
- `@apps/api` - Reference API app code
- `@apps/bot` - Reference bot app code

## Troubleshooting

### AI doesn't understand architecture

- Check that `.cursorrules` file exists in project root
- Reference specific docs: `@docs/ARCHITECTURE.md`
- Explicitly mention key principles in your request

### Generated code violates offline-first

- Remind AI: "Remember, this is a read handler - use Catalog DB only"
- Reference `.cursorrules` section on "When Writing Code"

### Missing domain context

- Reference `@docs/CATALOG-RU.md` for domain model
- Mention specific entities: "Create a Venue entity with these fields..."

## Best Practices

1. **Always reference docs** when working on new features
2. **Explicitly state constraints** in AI requests (offline-first, B2C-only, etc.)
3. **Use domain terminology** (Venue, City, VenueSource, Overrides)
4. **Follow NX patterns** for monorepo structure
5. **Test offline-first** - verify no external API calls in user paths

## Additional Resources

- Project README: `README.md`
- Architecture: `docs/ARCHITECTURE.md`
- Catalog Model: `docs/CATALOG-RU.md`
- PRD: `docs/PRD-RU.md`
- Backlog: `docs/Backlog-M1-M2-RU.md`
