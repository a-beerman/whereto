# Code Style & Conventions

This document defines coding standards, style guidelines, and best practices for the WhereTo project.

> **Reference**: Code style guidelines support implementation of [`docs/FINAL-SPEC.md`](FINAL-SPEC.md). For the canonical implementation-ready specification, see FINAL-SPEC.md.

## TypeScript Configuration

### Strict Mode

Always use strict TypeScript:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Type Safety

- **Avoid `any`**: Use `unknown` or proper types
- **Use type inference**: Let TypeScript infer types where possible
- **Explicit return types**: For public APIs and complex functions

```typescript
// Good
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // ...
}

// Bad
function calculateDistance(lat1: any, lng1: any, lat2: any, lng2: any): any {
  // ...
}
```

## Naming Conventions

### Files and Directories

- **Files**: kebab-case for utilities, match entity names for models
  - `venue.service.ts`
  - `geo-utils.ts`
  - `venue.entity.ts`

- **Directories**: kebab-case
  - `venue-services/`
  - `shared-utils/`

### Variables and Functions

- **camelCase** for variables and functions
- **PascalCase** for classes, interfaces, types, enums
- **UPPER_SNAKE_CASE** for constants
- **Descriptive names**: Avoid abbreviations

```typescript
// Good
const venueCount = 10;
function findVenuesByCity(cityId: string): Promise<Venue[]> {}
class VenueService {}
const MAX_RADIUS_METERS = 50000;

// Bad
const vc = 10;
function findV(cid: string) {}
class VS {}
const maxR = 50000;
```

### Database

- **Tables**: snake_case, plural
  - `venues`, `venue_sources`, `venue_overrides`

- **Columns**: snake_case
  - `city_id`, `created_at`, `rating_count`

- **Indexes**: `idx_<table>_<column>`
  - `idx_venues_city`, `idx_venues_location`

## Code Organization

### Import Order

1. External dependencies
2. Internal modules (from `@whereto/...`)
3. Relative imports
4. Type imports (with `type` keyword)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Venue } from '@whereto/shared/types';
import { VenueRepository } from '../repositories/venue.repository';

import type { VenueFilters } from '../dto/venue-filters.dto';
```

### File Structure

Organize files by feature/domain:

```
catalog/
├── entities/
│   └── venue.entity.ts
├── dto/
│   └── venue-filters.dto.ts
├── services/
│   └── venues.service.ts
├── controllers/
│   └── venues.controller.ts
├── repositories/
│   └── venue.repository.ts
└── catalog.module.ts
```

### Class Organization

1. Properties
2. Constructor
3. Public methods
4. Private methods

```typescript
export class VenuesService {
  // Properties
  private readonly logger = new Logger(VenuesService.name);

  // Constructor
  constructor(
    private readonly venueRepository: VenueRepository,
    private readonly overridesService: VenueOverridesService,
  ) {}

  // Public methods
  async findVenues(filters: VenueFilters): Promise<Venue[]> {
    // ...
  }

  // Private methods
  private applyOverrides(venue: Venue): Venue {
    // ...
  }
}
```

## Formatting

### Prettier Configuration

Use Prettier for consistent formatting:

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

### Line Length

- Maximum 100 characters per line
- Break long lines at logical points

### Indentation

- Use 2 spaces (no tabs)
- Consistent indentation for nested structures

## Comments and Documentation

### JSDoc for Public APIs

```typescript
/**
 * Finds venues matching the provided filters.
 *
 * @param filters - Search and filter criteria
 * @returns Array of venues matching the filters
 * @throws {NotFoundException} When city is not found
 */
async findVenues(filters: VenueFiltersDto): Promise<Venue[]> {
  // ...
}
```

### Inline Comments

- Explain **why**, not **what**
- Use comments for complex logic or business rules
- Keep comments up-to-date with code

```typescript
// Good - explains why
// Apply overrides after fetching to ensure manual edits survive syncs
const venue = await this.applyOverrides(rawVenue);

// Bad - explains what (obvious from code)
// Get venue from repository
const venue = await this.venueRepository.findOne(id);
```

## Error Handling

### Use Custom Exceptions

```typescript
// common/exceptions/venue-not-found.exception.ts
export class VenueNotFoundException extends NotFoundException {
  constructor(venueId: string) {
    super(`Venue with id '${venueId}' not found`);
  }
}
```

### Error Messages

- Clear and actionable
- Include relevant context (IDs, values)
- User-friendly for client-facing errors

```typescript
// Good
throw new VenueNotFoundException(venueId);

// Bad
throw new Error('Not found');
```

## Async/Await

### Prefer async/await over Promises

```typescript
// Good
async function getVenue(id: string): Promise<Venue> {
  const venue = await this.repository.findOne(id);
  return venue;
}

// Avoid
function getVenue(id: string): Promise<Venue> {
  return this.repository.findOne(id).then(venue => venue);
}
```

### Error Handling in Async Functions

```typescript
// Good
try {
  const venue = await this.repository.findOne(id);
  if (!venue) {
    throw new VenueNotFoundException(id);
  }
  return venue;
} catch (error) {
  this.logger.error(`Failed to find venue ${id}`, error);
  throw error;
}
```

## Type Definitions

### Interfaces vs Types

- **Interfaces**: For object shapes that may be extended
- **Types**: For unions, intersections, computed types

```typescript
// Interface - can be extended
interface Venue {
  id: string;
  name: string;
}

interface VenueWithDistance extends Venue {
  distance: number;
}

// Type - for unions, etc.
type VenueStatus = 'active' | 'hidden' | 'duplicate';
type VenueWithOptionalDistance = Venue & { distance?: number };
```

### Use const assertions

```typescript
// Good
export const CATEGORIES = ['cafe', 'restaurant', 'bar'] as const;
export type Category = typeof CATEGORIES[number];

// Bad
export const CATEGORIES = ['cafe', 'restaurant', 'bar'];
```

## Database Queries

### Use Query Builder for Complex Queries

```typescript
// Good - readable, type-safe
const venues = await this.repository
  .createQueryBuilder('venue')
  .where('venue.status = :status', { status: 'active' })
  .andWhere('venue.cityId = :cityId', { cityId })
  .getMany();

// Avoid - raw SQL unless necessary
const venues = await this.repository.query(
  `SELECT * FROM venues WHERE status = $1 AND city_id = $2`,
  ['active', cityId],
);
```

### Parameterized Queries

Always use parameters to prevent SQL injection:

```typescript
// Good
.where('venue.name = :name', { name: searchQuery })

// Bad - SQL injection risk
.where(`venue.name = '${searchQuery}'`)
```

## Testing

### Test File Naming

- `*.spec.ts` for unit tests
- `*.e2e-spec.ts` for E2E tests

### Test Organization

```typescript
describe('VenuesService', () => {
  describe('findVenues', () => {
    it('should return venues matching filters', () => {});
    it('should apply overrides', () => {});
  });

  describe('getVenueById', () => {
    it('should return venue when found', () => {});
    it('should throw when not found', () => {});
  });
});
```

## Linting

### ESLint Configuration

Use ESLint with TypeScript rules:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### Run Linting

```bash
npm run lint
# Or
nx lint api
```

## Git Commit Messages

Follow conventional commits:

```
feat: add venue search by category
fix: correct distance calculation in geo queries
docs: update API documentation
refactor: extract venue filtering logic
test: add unit tests for VenuesService
chore: update dependencies
```

## References

- [TypeScript Style Guide](https://github.com/basarat/typescript-book/blob/master/docs/styleguide/styleguide.md)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Prettier](https://prettier.io/)
- [ESLint](https://eslint.org/)

