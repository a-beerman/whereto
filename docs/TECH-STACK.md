# Tech Stack Documentation

This document describes the technologies, frameworks, and patterns used in the WhereTo project.

## Overview

- **Backend API**: NestJS (TypeScript)
- **Frontend**: Angular + Ionic Framework (TypeScript)
- **Telegram Bot**: TypeScript (using `telegraf` or similar)
- **Database**: PostgreSQL with PostGIS extension
- **Monorepo**: NX Workspace
- **Language**: TypeScript (strict mode)

## NestJS Backend (API)

### Project Structure

```
apps/api/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── config/              # Configuration modules
│   ├── catalog/             # Catalog domain module
│   │   ├── entities/        # TypeORM entities
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── services/        # Business logic
│   │   └── controllers/     # REST controllers
│   ├── venues/              # Venues module
│   ├── cities/              # Cities module
│   ├── ingestion/           # Ingestion jobs module
│   └── common/              # Shared utilities, guards, interceptors
├── test/                    # E2E tests
└── migrations/              # Database migrations
```

### Key Patterns

#### Module Organization

Follow domain-driven design principles:

```typescript
// catalog/catalog.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Venue, VenueSource, VenueOverrides])],
  controllers: [VenuesController],
  providers: [VenuesService, VenueRepository],
  exports: [VenuesService],
})
export class CatalogModule {}
```

#### Service Layer

Services contain business logic:

```typescript
// catalog/services/venues.service.ts
@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
    private overridesService: VenueOverridesService,
  ) {}

  async findVenues(filters: VenueFiltersDto): Promise<Venue[]> {
    // Apply filters, apply overrides, return results
  }
}
```

#### DTOs for Validation

Use class-validator for request validation:

```typescript
// catalog/dto/venue-filters.dto.ts
export class VenueFiltersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  radius?: number; // in meters
}
```

#### Repository Pattern

Use TypeORM repositories with custom query methods:

```typescript
// catalog/repositories/venue.repository.ts
@Injectable()
export class VenueRepository {
  constructor(
    @InjectRepository(Venue)
    private repository: Repository<Venue>,
  ) {}

  async findByGeoBounds(bounds: GeoBounds): Promise<Venue[]> {
    return this.repository
      .createQueryBuilder('venue')
      .where('ST_Within(venue.location, ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326))', {
        minLng: bounds.minLng,
        minLat: bounds.minLat,
        maxLng: bounds.maxLng,
        maxLat: bounds.maxLat,
      })
      .andWhere('venue.status = :status', { status: 'active' })
      .getMany();
  }
}
```

### Configuration

Use ConfigModule for environment-based configuration:

```typescript
// config/database.config.ts
export default () => ({
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
});
```

### Error Handling

Use exception filters:

```typescript
// common/filters/http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // Format error response
  }
}
```

## Angular + Ionic (Mini App)

### Project Structure

```
apps/miniapp/
├── src/
│   ├── app/
│   │   ├── core/           # Core module (singletons)
│   │   ├── shared/         # Shared components, pipes, directives
│   │   ├── features/       # Feature modules
│   │   │   ├── discover/   # Discovery feature
│   │   │   ├── venue/      # Venue details
│   │   │   └── saved/      # Saved venues
│   │   └── app.component.ts
│   ├── assets/
│   └── environments/
├── ionic.config.json
└── angular.json
```

### Key Patterns

#### Feature Modules

Organize by feature, not by type:

```typescript
// features/discover/discover.module.ts
@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([{ path: '', component: DiscoverPage }]),
    SharedModule,
  ],
  declarations: [DiscoverPage, VenueListComponent],
})
export class DiscoverModule {}
```

#### Services for API Communication

```typescript
// core/services/venues.service.ts
@Injectable({ providedIn: 'root' })
export class VenuesService {
  constructor(private http: HttpClient) {}

  searchVenues(filters: VenueFilters): Observable<Venue[]> {
    return this.http.get<Venue[]>('/api/venues', { params: filters });
  }
}
```

#### State Management

Use services with RxJS for state:

```typescript
// core/services/venue-state.service.ts
@Injectable({ providedIn: 'root' })
export class VenueStateService {
  private selectedVenue$ = new BehaviorSubject<Venue | null>(null);
  
  getSelectedVenue(): Observable<Venue | null> {
    return this.selectedVenue$.asObservable();
  }
  
  setSelectedVenue(venue: Venue): void {
    this.selectedVenue$.next(venue);
  }
}
```

#### Ionic Components

Use Ionic components for UI:

```typescript
// features/discover/discover.page.ts
@Component({
  selector: 'app-discover',
  templateUrl: './discover.page.html',
})
export class DiscoverPage {
  venues$ = this.venuesService.searchVenues(this.filters);
  
  constructor(private venuesService: VenuesService) {}
}
```

```html
<!-- discover.page.html -->
<ion-content>
  <ion-list>
    <ion-item *ngFor="let venue of venues$ | async">
      <ion-label>
        <h2>{{ venue.name }}</h2>
        <p>{{ venue.address }}</p>
      </ion-label>
    </ion-item>
  </ion-list>
</ion-content>
```

## Telegram Bot

### Project Structure

```
apps/bot/
├── src/
│   ├── main.ts             # Bot entry point
│   ├── bot.module.ts       # Bot configuration
│   ├── handlers/           # Command and message handlers
│   │   ├── start.handler.ts
│   │   ├── search.handler.ts
│   │   └── venue.handler.ts
│   ├── services/           # Business logic
│   │   ├── api-client.service.ts
│   │   └── state.service.ts
│   └── utils/              # Utilities
└── types/                  # TypeScript types
```

### Key Patterns

#### Using Telegraf

```typescript
// main.ts
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Welcome to WhereTo! Choose your city:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Kishinev', callback_data: 'city:kishinev' }],
      ],
    },
  });
});

bot.launch();
```

#### Handler Organization

```typescript
// handlers/search.handler.ts
export class SearchHandler {
  constructor(private apiClient: ApiClientService) {}

  async handle(ctx: Context): Promise<void> {
    const query = ctx.message.text;
    const venues = await this.apiClient.searchVenues({ q: query });
    
    // Format and send results
    await ctx.reply(this.formatVenues(venues), {
      reply_markup: this.createVenueKeyboard(venues),
    });
  }
}
```

#### State Management

Use session middleware for user state:

```typescript
import { session } from 'telegraf';

bot.use(session());

bot.on('callback_query', (ctx) => {
  ctx.session.selectedCity = ctx.callbackQuery.data;
});
```

## Database (PostgreSQL)

**Geospatial Options:**
- **PostGIS Extension** (recommended for production): Accurate geographic distance, spatial indexing
- **Native Types** (simpler for MVP): Simple lat/lng columns with Haversine formula in application code

See [`docs/DATABASE.md`](DATABASE.md) for both approaches.

## Internationalization (i18n)

WhereTo supports multiple languages (Russian, English, Romanian) with automatic detection from Telegram user settings. Translations are stored as JSON files in the codebase.

> **Comprehensive Guide**: See [`docs/I18N.md`](I18N.md) for complete i18n implementation guide, including architecture, patterns, and examples.

### Supported Languages

- **Russian (ru)** - Default language
- **English (en)**
- **Romanian (ro)**
- **Extensible** - Architecture supports adding additional languages

### Translation File Structure

```
libs/shared/src/i18n/
├── translations/
│   ├── ru.json
│   ├── en.json
│   ├── ro.json
│   └── index.ts
├── types.ts
├── language-detector.ts
└── translation.service.ts
```

### Bot i18n Patterns (Telegraf)

Language detection from Telegram user settings:

```typescript
// libs/shared/src/i18n/language-detector.ts
import { SupportedLanguage } from './types';

export function detectLanguage(telegramLanguageCode?: string): SupportedLanguage {
  // Map Telegram language codes to supported languages
  // Fallback to 'ru' if not supported
}
```

Translation service usage in bot handlers:

```typescript
// apps/bot/src/handlers/start.handler.ts
import { Context } from 'telegraf';
import { translationService } from '@whereto/shared/i18n';

export class StartHandler {
  async handle(ctx: Context): Promise<void> {
    const lang = translationService.getLanguage(ctx);
    const welcome = translationService.t('bot.start.welcome', {}, lang);
    
    await ctx.reply(welcome, {
      reply_markup: {
        inline_keyboard: [
          [{ text: translationService.t('bot.start.selectCity', {}, lang), callback_data: 'city:select' }],
        ],
      },
    });
  }
}
```

Session-based language storage:

```typescript
// apps/bot/src/middleware/language.middleware.ts
import { MiddlewareFn } from 'telegraf';
import { translationService } from '@whereto/shared/i18n';

export const languageMiddleware: MiddlewareFn<any> = async (ctx, next) => {
  const detectedLang = translationService.getLanguage(ctx);
  ctx.session.language = ctx.session.language || detectedLang;
  
  // Make translation function available in context
  ctx.t = (key: string, params?: Record<string, string | number>) => {
    return translationService.t(key, params, ctx.session.language);
  };
  
  return next();
};
```

### Mini App i18n Patterns (Angular/Ionic)

Setup with @ngx-translate:

```typescript
// apps/miniapp/src/app/app.module.ts
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  imports: [
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'ru',
    }),
  ],
})
export class AppModule {}
```

Language detection from Telegram WebApp:

```typescript
// apps/miniapp/src/app/services/telegram-i18n.service.ts
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class TelegramI18nService {
  constructor(private translate: TranslateService) {}
  
  initialize(): void {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.language_code) {
      const mappedLang = this.mapTelegramLanguage(tg.initDataUnsafe.user.language_code);
      this.translate.use(mappedLang);
    } else {
      this.translate.use('ru');
    }
  }
}
```

Component usage:

```html
<!-- Template -->
<ion-card-title>
  {{ 'app.venue.card.title' | translate: { name: venue.name } }}
</ion-card-title>
<ion-button>
  {{ 'app.venue.card.save' | translate }}
</ion-button>
```

### Shared Translation Utilities

Translation key structure (namespaced):

```typescript
// Translation keys follow namespace pattern:
// bot.* - Bot messages
// app.* - Mini App UI
// merchant.* - Merchant bot/cabinet

// Example keys:
// bot.start.welcome
// bot.venue.card.save
// bot.plan.created
// app.venue.card.title
```

Type-safe translation keys:

```typescript
// libs/shared/src/i18n/types.ts
export type TranslationKey =
  | 'bot.start.welcome'
  | 'bot.start.selectCity'
  | 'bot.venue.card.title'
  // ... more keys
  ;

// Usage
translationService.t('bot.start.welcome' as TranslationKey, {}, lang);
```

Date and number formatting:

```typescript
// libs/shared/src/i18n/date-formatter.ts
export function formatDate(date: Date, lang: SupportedLanguage): string {
  const locale = LOCALE_MAP[lang];
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatDistance(meters: number, lang: SupportedLanguage): string {
  // Format distance with locale-appropriate units
}
```

### Best Practices

1. **Automatic Detection**: Language detected from Telegram user settings, no manual selection needed
2. **Fallback Strategy**: Falls back to Russian if language not supported or translation missing
3. **Versioned Translations**: All translations stored in JSON files in codebase
4. **Type Safety**: Use TypeScript types for translation keys
5. **Interpolation**: Use curly braces for dynamic content: `{name}`, `{count}`
6. **Pluralization**: Handle plural forms correctly for each language

For detailed implementation guide, examples, and migration strategy, see [`docs/I18N.md`](I18N.md).

### Entity Definition

```typescript
// catalog/entities/venue.entity.ts
@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cityId: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column('geography', {
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  @Column('jsonb', { nullable: true })
  categories: string[];

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  rating: number;

  @Column('int', { nullable: true })
  ratingCount: number;

  @Column('jsonb', { nullable: true })
  photoRefs: string[];

  @Column('jsonb', { nullable: true })
  hours: OpeningHours;

  @Column({ default: 'active' })
  status: 'active' | 'hidden' | 'duplicate';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Geo Queries

```typescript
// Find venues within radius
async findNearby(lat: number, lng: number, radiusMeters: number): Promise<Venue[]> {
  return this.repository
    .createQueryBuilder('venue')
    .where(
      'ST_DWithin(venue.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)',
      { lat, lng, radius: radiusMeters },
    )
    .getMany();
}
```

## Data Source Integration Patterns

The system supports multiple data sources via the `VenueSource` abstraction. See [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 2 and [`docs/TZ-RU.md`](TZ-RU.md) Section 3.2 for data source strategy.

### Source Abstraction

```typescript
// ingestion/interfaces/data-source.interface.ts
export interface DataSource {
  source: 'google_places' | 'delivery_site' | 'erp';
  fetchVenues(city: City, config: SourceConfig): Promise<RawVenueData[]>;
  normalize(rawData: RawVenueData): NormalizedVenue;
}

// ingestion/services/data-source-factory.service.ts
@Injectable()
export class DataSourceFactory {
  create(source: string): DataSource {
    switch (source) {
      case 'google_places':
        return new GooglePlacesSource();
      case 'delivery_site':
        return new DeliverySiteSource();
      case 'erp':
        return new ErpSource();
      default:
        throw new Error(`Unknown source: ${source}`);
    }
  }
}
```

### Google Places Integration

#### Category Mapping

Map Google Places types to our normalized categories:

```typescript
// ingestion/mappers/category-mapper.ts
const GOOGLE_TO_CATEGORY_MAP: Record<string, string[]> = {
  'restaurant': ['restaurant', 'food'],
  'cafe': ['cafe', 'coffee'],
  'bar': ['bar', 'nightlife'],
  'bakery': ['bakery', 'food'],
  'meal_takeaway': ['takeaway', 'food'],
  'meal_delivery': ['delivery', 'food'],
  // ... more mappings
};

export function mapGoogleTypesToCategories(googleTypes: string[]): string[] {
  const categories = new Set<string>();
  for (const type of googleTypes) {
    const mapped = GOOGLE_TO_CATEGORY_MAP[type] || [type];
    mapped.forEach(cat => categories.add(cat));
  }
  return Array.from(categories);
}
```

#### Pagination Strategy

Google Places API uses pagination tokens:

```typescript
// ingestion/sources/google-places.source.ts
@Injectable()
export class GooglePlacesSource implements DataSource {
  source = 'google_places' as const;

  async fetchVenues(city: City, config: GooglePlacesConfig): Promise<RawVenueData[]> {
    const allPlaces: RawVenueData[] = [];
    let nextPageToken: string | undefined;

    do {
      const response = await this.googlePlacesClient.searchNearby({
        location: { lat: city.centerLat, lng: city.centerLng },
        radius: config.radius,
        type: config.categories,
        pagetoken: nextPageToken,
      });

      allPlaces.push(...response.results.map(place => this.normalize(place)));
      nextPageToken = response.next_page_token;

      // Google requires delay between pagination requests
      if (nextPageToken) {
        await this.delay(2000); // 2 seconds
      }
    } while (nextPageToken);

    return allPlaces;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  normalize(raw: GooglePlace): NormalizedVenue {
    return {
      name: raw.name,
      address: raw.formatted_address,
      location: { lat: raw.geometry.location.lat, lng: raw.geometry.location.lng },
      categories: mapGoogleTypesToCategories(raw.types),
      rating: raw.rating,
      ratingCount: raw.user_ratings_total,
      photoRefs: raw.photos?.map(p => p.photo_reference) || [],
      hours: this.parseHours(raw.opening_hours),
    };
  }

  private parseHours(openingHours?: GoogleOpeningHours): any {
    // Parse opening hours structure
    // ...
  }
}
```

#### Rate Limiting

Implement rate limiting to stay within Google Places API quotas:

```typescript
// ingestion/services/rate-limiter.service.ts
@Injectable()
export class RateLimiterService {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private readonly MAX_REQUESTS_PER_SECOND = 10; // Adjust based on quota
  private readonly MAX_REQUESTS_PER_DAY = 100000; // Adjust based on quota

  async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    while (this.requestQueue.length > 0) {
      const fn = this.requestQueue.shift();
      if (fn) {
        await fn();
        await this.delay(1000 / this.MAX_REQUESTS_PER_SECOND);
      }
    }
    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Error Handling

Handle API errors gracefully:

```typescript
// ingestion/sources/google-places.source.ts
async fetchVenues(city: City, config: GooglePlacesConfig): Promise<RawVenueData[]> {
  try {
    // ... fetch logic
  } catch (error) {
    if (error.code === 'OVER_QUERY_LIMIT') {
      this.logger.error('Google Places API quota exceeded');
      throw new QuotaExceededError('API quota exceeded');
    }
    if (error.code === 'REQUEST_DENIED') {
      this.logger.error('Google Places API request denied', error.message);
      throw new ApiError('Request denied', error.message);
    }
    // Retry for transient errors
    if (this.isRetryableError(error)) {
      return this.retryWithBackoff(() => this.fetchVenues(city, config));
    }
    throw error;
  }
}

private isRetryableError(error: any): boolean {
  const retryableCodes = ['INTERNAL_ERROR', 'UNKNOWN_ERROR', 'TIMEOUT'];
  return retryableCodes.includes(error.code);
}

private async retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Delivery Site Parsing

```typescript
// ingestion/sources/delivery-site.source.ts
@Injectable()
export class DeliverySiteSource implements DataSource {
  source = 'delivery_site' as const;

  constructor(
    private httpService: HttpService,
    private parser: HtmlParser,
  ) {}

  async fetchVenues(city: City, config: DeliverySiteConfig): Promise<RawVenueData[]> {
    // Parse delivery site pages
    const venues: RawVenueData[] = [];
    
    for (const url of config.deliverySiteUrls) {
      const html = await this.httpService.get(url).toPromise();
      const parsed = this.parser.parse(html.data);
      
      // Extract venue data from HTML
      const venueData = this.extractVenueData(parsed);
      venues.push(...venueData);
    }
    
    return venues;
  }

  private extractVenueData(html: ParsedHtml): RawVenueData[] {
    // Implementation: parse HTML structure, extract venue info
    // Handle pagination, rate limiting, etc.
  }

  normalize(raw: DeliverySiteVenue): NormalizedVenue {
    return {
      name: raw.restaurantName,
      address: raw.address,
      location: this.geocodeAddress(raw.address), // Geocode if needed
      categories: raw.cuisineTypes,
      // Additional: menu items, prices, availability
    };
  }
}
```

### ERP Integration

```typescript
// ingestion/sources/erp.source.ts
@Injectable()
export class ErpSource implements DataSource {
  source = 'erp' as const;

  constructor(
    private erpClient: ErpApiClient,
  ) {}

  async fetchVenues(city: City, config: ErpConfig): Promise<RawVenueData[]> {
    // Call ERP API
    const venues = await this.erpClient.getVenues({
      cityId: city.id,
      includeMenu: config.includeMenu,
    });
    
    return venues.map(venue => this.normalize(venue));
  }

  normalize(raw: ErpVenue): NormalizedVenue {
    return {
      name: raw.name,
      address: raw.fullAddress,
      location: { lat: raw.latitude, lng: raw.longitude },
      categories: raw.categoryTags,
      // Additional: real-time availability, menu, prices
    };
  }
}
```

### Ingestion Service with Multiple Sources

```typescript
// ingestion/services/ingestion.service.ts
@Injectable()
export class IngestionService {
  constructor(
    private dataSourceFactory: DataSourceFactory,
    private venueRepository: VenueRepository,
    private venueSourceRepository: VenueSourceRepository,
  ) {}

  async syncCity(cityId: string): Promise<IngestionResult> {
    const city = await this.cityRepository.findOne(cityId);
    const sources = this.getActiveSources(city);
    
    const results: SourceResult[] = [];
    
    for (const sourceConfig of sources) {
      const source = this.dataSourceFactory.create(sourceConfig.type);
      const rawVenues = await source.fetchVenues(city, sourceConfig);
      
      for (const rawVenue of rawVenues) {
        const normalized = source.normalize(rawVenue);
        await this.upsertVenue(normalized, source.source, rawVenue.externalId);
      }
      
      results.push({
        source: source.source,
        fetched: rawVenues.length,
        // ...
      });
    }
    
    // Run deduplication across all sources
    await this.deduplicate(cityId);
    
    return { results, /* ... */ };
  }

  private async upsertVenue(
    normalized: NormalizedVenue,
    source: string,
    externalId: string,
  ): Promise<void> {
    // Find or create venue
    let venueSource = await this.venueSourceRepository.findOne({
      source,
      externalId,
    });
    
    if (venueSource) {
      // Update existing venue
      await this.venueRepository.update(venueSource.venueId, normalized);
    } else {
      // Create new venue
      const venue = await this.venueRepository.save(normalized);
      venueSource = await this.venueSourceRepository.save({
        venueId: venue.id,
        source,
        externalId,
      });
    }
    
    // Update sync timestamp
    venueSource.lastSyncedAt = new Date();
    await this.venueSourceRepository.save(venueSource);
  }
}
```

### Best Practices

1. **Normalization**: All sources should normalize to the same `NormalizedVenue` structure
2. **Error Handling**: Handle source-specific errors gracefully (rate limits, timeouts, parsing errors)
3. **Rate Limiting**: Respect rate limits for each source
4. **Deduplication**: Run deduplication after all sources are processed
5. **Metrics**: Track metrics per source (fetch time, success rate, venues fetched)

## Shared Libraries

### Constants

```typescript
// libs/shared/src/constants/mvp-settings.ts
export const MVP_SETTINGS = {
  voting: { /* ... */ },
  plan: { /* ... */ },
} as const;
```

### Types

```typescript
// libs/shared/src/types/venue.types.ts
export interface Venue {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  // ...
}
```

### Utilities

```typescript
// libs/shared/src/utils/geo.utils.ts
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  // Haversine formula
}
```

## Observability

### Logging

#### NestJS Logging

Use NestJS built-in logger:

```typescript
// services/venues.service.ts
import { Logger } from '@nestjs/common';

export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  async findVenues(filters: VenueFiltersDto): Promise<Venue[]> {
    this.logger.log(`Finding venues with filters: ${JSON.stringify(filters)}`);
    
    try {
      const venues = await this.repository.find(filters);
      this.logger.log(`Found ${venues.length} venues`);
      return venues;
    } catch (error) {
      this.logger.error(`Failed to find venues: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

#### Structured Logging

For production, use structured logging:

```typescript
this.logger.log({
  message: 'Venue search completed',
  filters,
  resultCount: venues.length,
  duration: Date.now() - startTime,
  userId: request.user?.id,
});
```

### Metrics

#### Product Events

Track key product events as specified in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 8.1:

```typescript
// services/analytics.service.ts
@Injectable()
export class AnalyticsService {
  trackSearch(query: string, cityId: string, resultCount: number): void {
    // Send to analytics service (e.g., Mixpanel, Amplitude, custom)
    this.analytics.track('search', {
      query,
      cityId,
      resultCount,
      timestamp: new Date().toISOString(),
    });
  }

  trackPlaceOpen(venueId: string, userId?: string): void {
    this.analytics.track('open_place', {
      venueId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  trackSavePlace(venueId: string, userId: string): void {
    this.analytics.track('save_place', {
      venueId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### Ingestion Metrics

Track ingestion job metrics:

```typescript
// ingestion/services/ingestion-metrics.service.ts
@Injectable()
export class IngestionMetricsService {
  async recordIngestionMetrics(cityId: string, metrics: {
    duration: number;
    fetched: number;
    created: number;
    updated: number;
    duplicates: number;
    errors: number;
  }): Promise<void> {
    // Store in database or send to metrics service
    await this.metricsRepository.save({
      cityId,
      ...metrics,
      timestamp: new Date(),
    });
  }
}
```

#### API Performance Metrics

Track API latency:

```typescript
// common/interceptors/metrics.interceptor.ts
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const { method, url } = request;
        
        // Track p95 latency
        this.metricsService.recordApiLatency({
          method,
          endpoint: url,
          duration,
          statusCode: context.switchToHttp().getResponse().statusCode,
        });
      }),
    );
  }
}
```

### Monitoring

#### Health Checks

Implement health check endpoints:

```typescript
// health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  async check() {
    const dbStatus = await this.checkDatabase();
    
    return {
      status: dbStatus ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'connected' : 'disconnected',
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
```

#### Error Tracking

Use error tracking service (e.g., Sentry):

```typescript
// main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// In exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    Sentry.captureException(exception);
    // ... handle exception
  }
}
```

### SLO Monitoring

Track SLOs as specified in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 8.3:

- **p95 latency** for `/venues` and `/venues/{id}`
- **Ingestion job success rate**

See [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) for production monitoring setup.

## Best Practices

1. **Type Safety**: Use strict TypeScript, avoid `any`
2. **Dependency Injection**: Use DI containers (NestJS, Angular)
3. **Error Handling**: Consistent error handling across layers
4. **Validation**: Validate inputs at API boundaries
5. **Testing**: Unit tests for services, E2E for critical flows
6. **Documentation**: JSDoc for public APIs
7. **Code Organization**: Domain-driven structure
8. **Observability**: Log all important events, track metrics, monitor SLOs

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [Angular Documentation](https://angular.io/docs)
- [Ionic Framework Documentation](https://ionicframework.com/docs)
- [Telegraf Documentation](https://telegraf.js.org/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [FINAL-SPEC.md](FINAL-SPEC.md) - Implementation-ready specification

