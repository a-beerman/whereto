# Testing Guidelines

This document describes testing strategies, best practices, and conventions for the WhereTo project.

> **Reference**: Testing requirements support the MVP Definition of Done in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 9. For the canonical implementation-ready specification, see FINAL-SPEC.md.

## Testing Philosophy

- **Test behavior, not implementation**: Focus on what the code does, not how
- **Test critical paths**: Prioritize business logic and user-facing features
- **Fast feedback**: Unit tests should run quickly
- **Maintainable tests**: Tests should be easy to read and update

## Testing Pyramid

```
        /\
       /E2E\        Few, critical user journeys
      /------\
     /Integration\  API endpoints, database interactions
    /------------\
   /   Unit Tests  \  Many, fast, isolated
  /----------------\
```

## Test Types

### Unit Tests

Test individual functions, methods, or classes in isolation.

**Location**: `*.spec.ts` files next to source files

**Example (NestJS Service):**

```typescript
// venues.service.spec.ts
describe('VenuesService', () => {
  let service: VenuesService;
  let repository: Repository<Venue>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VenuesService,
        {
          provide: getRepositoryToken(Venue),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VenuesService>(VenuesService);
    repository = module.get<Repository<Venue>>(getRepositoryToken(Venue));
  });

  describe('findVenues', () => {
    it('should return venues matching filters', async () => {
      const filters = { q: 'coffee', cityId: 'city-1' };
      const mockVenues = [/* ... */];
      
      jest.spyOn(repository, 'find').mockResolvedValue(mockVenues);

      const result = await service.findVenues(filters);

      expect(result).toEqual(mockVenues);
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.any(Object),
          }),
        }),
      );
    });
  });
});
```

**Example (Angular Component):**

```typescript
// discover.component.spec.ts
describe('DiscoverComponent', () => {
  let component: DiscoverComponent;
  let fixture: ComponentFixture<DiscoverComponent>;
  let venuesService: jasmine.SpyObj<VenuesService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('VenuesService', ['searchVenues']);

    await TestBed.configureTestingModule({
      declarations: [DiscoverComponent],
      providers: [{ provide: VenuesService, useValue: spy }],
    }).compileComponents();

    fixture = TestBed.createComponent(DiscoverComponent);
    component = fixture.componentInstance;
    venuesService = TestBed.inject(VenuesService) as jasmine.SpyObj<VenuesService>;
  });

  it('should load venues on init', () => {
    const mockVenues = [/* ... */];
    venuesService.searchVenues.and.returnValue(of(mockVenues));

    fixture.detectChanges();

    expect(venuesService.searchVenues).toHaveBeenCalled();
    expect(component.venues$).toBeDefined();
  });
});
```

### Integration Tests

Test interactions between components (e.g., API + Database).

**Location**: `apps/api/test/` for E2E tests

**Example (NestJS E2E):**

```typescript
// venues.e2e-spec.ts
describe('VenuesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(TypeOrmModule)
      .useModule(
        TypeOrmModule.forRoot({
          type: 'postgres',
          // Use test database
          database: 'whereto_test',
          // ...
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();
    dataSource = app.get(DataSource);
    await app.init();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await dataSource.synchronize(true);
  });

  describe('GET /api/v1/venues', () => {
    it('should return venues', async () => {
      // Seed test data
      const city = await dataSource.getRepository(City).save({
        name: 'Test City',
        // ...
      });

      const venue = await dataSource.getRepository(Venue).save({
        name: 'Test Venue',
        cityId: city.id,
        // ...
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/venues')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Venue');
    });
  });
});
```

### E2E Tests

Test complete user journeys across the system.

**Location**: `e2e/` directory

**Example (API E2E):**

```typescript
// e2e/venue-search.e2e-spec.ts
describe('Venue Search Flow', () => {
  it('should allow user to search and view venue details', async () => {
    // 1. Search venues
    const searchResponse = await request(app.getHttpServer())
      .get('/api/v1/venues?q=coffee')
      .expect(200);

    expect(searchResponse.body.data.length).toBeGreaterThan(0);

    // 2. Get venue details
    const venueId = searchResponse.body.data[0].id;
    const detailsResponse = await request(app.getHttpServer())
      .get(`/api/v1/venues/${venueId}`)
      .expect(200);

    expect(detailsResponse.body.data.id).toBe(venueId);
  });
});
```

## Test Utilities

### Test Database

Use a separate test database:

```typescript
// test/test-database.config.ts
export const testDatabaseConfig = {
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT, 10) || 5433,
  username: process.env.TEST_DB_USER || 'test',
  password: process.env.TEST_DB_PASSWORD || 'test',
  database: process.env.TEST_DB_NAME || 'whereto_test',
  // ...
};
```

### Test Fixtures

Create reusable test data:

```typescript
// test/fixtures/venue.fixtures.ts
export function createTestVenue(overrides?: Partial<Venue>): Venue {
  return {
    id: 'test-venue-id',
    name: 'Test Venue',
    address: '123 Test St',
    cityId: 'test-city-id',
    location: {
      type: 'Point',
      coordinates: [28.8638, 47.0104],
    },
    status: 'active',
    ...overrides,
  };
}
```

### Mock Factories

```typescript
// test/mocks/venue.repository.mock.ts
export function createMockVenueRepository(): Partial<Repository<Venue>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
}
```

## Running Tests

### Run All Tests

```bash
npm test
# Or
nx run-many --target=test --all
```

### Run Specific Test Suite

```bash
# Unit tests for specific app
nx test api

# E2E tests
nx e2e api-e2e
```

### Run Tests in Watch Mode

```bash
npm run test:watch
# Or
nx test api --watch
```

### Run Tests with Coverage

```bash
npm run test:cov
# Or
nx test api --coverage
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: Cover all API endpoints
- **E2E Tests**: Cover critical user journeys

## Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('should calculate distance correctly', () => {
  // Arrange
  const lat1 = 47.0104;
  const lng1 = 28.8638;
  const lat2 = 47.0204;
  const lng2 = 28.8738;

  // Act
  const distance = calculateDistance(lat1, lng1, lat2, lng2);

  // Assert
  expect(distance).toBeCloseTo(1414, 0); // ~1.4km
});
```

### 2. Descriptive Test Names

```typescript
// Good
it('should return empty array when no venues match filters', () => {});
it('should apply venue overrides when reading venue data', () => {});

// Bad
it('should work', () => {});
it('test 1', () => {});
```

### 3. Test One Thing

```typescript
// Good - one assertion per test
it('should filter by city', () => {});
it('should filter by category', () => {});

// Bad - multiple concerns
it('should filter by city and category and rating', () => {});
```

### 4. Use Mocks Appropriately

- **Mock external dependencies**: APIs, databases, file system
- **Don't mock what you're testing**: Test the actual implementation
- **Mock at boundaries**: Mock at service boundaries, not internal methods

### 5. Clean Up After Tests

```typescript
afterEach(async () => {
  // Clean up test data
  await repository.clear();
});

afterAll(async () => {
  // Close connections
  await dataSource.destroy();
});
```

## Testing Tools

- **Jest**: Unit and integration testing
- **Supertest**: HTTP assertion library for API testing
- **Jasmine**: Angular testing framework
- **Karma**: Test runner for Angular (if needed)
- **Testcontainers**: For integration tests with real databases (optional)

## Continuous Integration

Tests run automatically on:

- Pull requests
- Commits to main branch
- Scheduled nightly runs

See `docs/DEPLOYMENT.md` for CI/CD configuration.

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Angular Testing](https://angular.io/guide/testing)

