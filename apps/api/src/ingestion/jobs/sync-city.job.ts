import { Injectable, Logger } from '@nestjs/common';
import { PlaceType1 } from '@googlemaps/google-maps-services-js';
import { CityRepository } from '../../catalog/repositories/city.repository';
import { VenueRepository } from '../../catalog/repositories/venue.repository';
import { VenueSourceRepository } from '../../catalog/repositories/venue-source.repository';
import { GooglePlacesService } from '../services/google-places.service';
import { NormalizationService } from '../services/normalization.service';
import { DeduplicationService } from '../services/deduplication.service';
import { City } from '../../catalog/entities/city.entity';
import {
  generateSearchGrid,
  calculateOptimalGridSize,
  parseCityBounds,
  SearchArea,
} from '../utils/grid-generator.util';

export interface SyncMetrics {
  cityId: string;
  cityName: string;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  placesFetched: number;
  venuesCreated: number;
  venuesUpdated: number;
  duplicatesFound: number;
  errors: number;
  errorDetails: string[];
}

@Injectable()
export class SyncCityJob {
  private readonly logger = new Logger(SyncCityJob.name);

  constructor(
    private readonly cityRepository: CityRepository,
    private readonly venueRepository: VenueRepository,
    private readonly venueSourceRepository: VenueSourceRepository,
    private readonly googlePlacesService: GooglePlacesService,
    private readonly normalizationService: NormalizationService,
    private readonly deduplicationService: DeduplicationService,
  ) {}

  /**
   * Sync venues for a city from Google Places
   */
  async syncCity(cityId: string): Promise<SyncMetrics> {
    const metrics: SyncMetrics = {
      cityId,
      cityName: '',
      startTime: new Date(),
      placesFetched: 0,
      venuesCreated: 0,
      venuesUpdated: 0,
      duplicatesFound: 0,
      errors: 0,
      errorDetails: [],
    };

    try {
      // Get city
      const city = await this.cityRepository.findById(cityId);
      if (!city) {
        throw new Error(`City with id ${cityId} not found`);
      }
      metrics.cityName = city.name;

      this.logger.log(`Starting sync for city: ${city.name} (${cityId})`);

      // Ensure coordinates are numbers (TypeORM decimal columns might return strings)
      const centerLat =
        typeof city.centerLat === 'string' ? parseFloat(city.centerLat) : city.centerLat;
      const centerLng =
        typeof city.centerLng === 'string' ? parseFloat(city.centerLng) : city.centerLng;

      if (isNaN(centerLat) || isNaN(centerLng)) {
        throw new Error(`Invalid city coordinates: lat=${city.centerLat}, lng=${city.centerLng}`);
      }

      this.logger.log(`City coordinates: ${centerLat}, ${centerLng}`);

      // Determine search strategy: grid for large cities, single center for small cities
      const cityBounds = parseCityBounds(
        city.bounds as
          | {
              north?: number;
              south?: number;
              east?: number;
              west?: number;
              minLat?: number;
              minLng?: number;
              maxLat?: number;
              maxLng?: number;
            }
          | null
          | undefined,
      );
      const useGrid = cityBounds !== null; // Use grid if bounds are defined

      let searchAreas: SearchArea[];

      if (useGrid) {
        // Calculate optimal grid size based on city size
        const gridSize = calculateOptimalGridSize(cityBounds);
        searchAreas = generateSearchGrid(cityBounds, gridSize, 8000, 20); // 8km radius, 20% overlap
        this.logger.log(
          `Using grid search: ${gridSize}x${gridSize} = ${searchAreas.length} search areas for ${city.name}`,
        );
      } else {
        // Single center search for cities without bounds
        searchAreas = [
          {
            center: { lat: centerLat, lng: centerLng },
            radius: 10000, // 10km radius
          },
        ];
        this.logger.log(`Using single center search for ${city.name}`);
      }

      // Search for restaurants, cafes, and bars using Legacy Places API
      // Legacy API supports pagination with next_page_token
      const placeTypes: PlaceType1[] = [PlaceType1.restaurant, PlaceType1.cafe, PlaceType1.bar];
      const allPlaces: Set<string> = new Set(); // Track unique place_ids

      this.logger.log(`Searching for ${placeTypes.join(', ')} in ${city.name}...`);

      // Search each area in the grid
      for (let areaIndex = 0; areaIndex < searchAreas.length; areaIndex++) {
        const area = searchAreas[areaIndex];
        this.logger.log(
          `Search area ${areaIndex + 1}/${searchAreas.length}: center (${area.center.lat}, ${area.center.lng}), radius ${area.radius}m`,
        );

        // Search each type separately with pagination support
        for (const placeType of placeTypes) {
          let nextPageToken: string | undefined;
          let pageCount = 0;
          const maxPages = 3; // Limit pages per type (3 pages × 20 results = 60 per type max)

          do {
            const searchResult = await this.googlePlacesService.searchPlaces({
              location: area.center,
              radius: area.radius,
              type: placeType,
              pageToken: nextPageToken,
            });

            for (const place of searchResult.results) {
              // Filter by rating >= 3 at search level to avoid unnecessary place details API calls
              // Skip places without ratings or with rating < 3
              if (place.rating !== undefined && place.rating >= 3) {
                // Deduplication: only add if not already seen
                if (!allPlaces.has(place.place_id)) {
                  allPlaces.add(place.place_id);
                  metrics.placesFetched++;
                }
              } else {
                this.logger.debug(
                  `Skipping place ${place.name} (${place.place_id}) - rating ${place.rating || 'N/A'} < 3 or missing`,
                );
              }
            }

            this.logger.log(
              `Area ${areaIndex + 1}, ${placeType}, Page ${pageCount + 1}: Found ${searchResult.results.length} places (${allPlaces.size} total unique places)`,
            );

            nextPageToken = searchResult.nextPageToken;
            pageCount++;

            // Google requires ~2 second delay between pagination requests
            if (nextPageToken && pageCount < maxPages) {
              await this.delay(2000);
            }
          } while (nextPageToken && pageCount < maxPages);

          // Small delay between different type searches
          await this.delay(500);
        }

        // Delay between search areas to avoid rate limiting
        if (areaIndex < searchAreas.length - 1) {
          await this.delay(1000);
        }
      }

      this.logger.log(`Found ${allPlaces.size} unique places. Processing...`);

      // Process all places (no limit for production)
      const placesToProcess = Array.from(allPlaces);

      // Process each place
      for (const placeId of placesToProcess) {
        try {
          await this.processPlace(placeId, city, metrics);
          // Rate limiting: delay between place details requests
          await this.delay(100); // 100ms delay
        } catch (error) {
          metrics.errors++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          metrics.errorDetails.push(`Place ${placeId}: ${errorMessage}`);
          this.logger.error(`Error processing place ${placeId}`, error);
        }
      }

      metrics.endTime = new Date();
      metrics.durationMs = metrics.endTime.getTime() - metrics.startTime.getTime();

      // Log structured metrics for observability
      this.logger.log({
        message: `Sync completed for ${city.name}`,
        cityId: metrics.cityId,
        cityName: metrics.cityName,
        placesFetched: metrics.placesFetched,
        venuesCreated: metrics.venuesCreated,
        venuesUpdated: metrics.venuesUpdated,
        duplicatesFound: metrics.duplicatesFound,
        errors: metrics.errors,
        durationMs: metrics.durationMs,
        successRate:
          metrics.placesFetched > 0
            ? (
                ((metrics.venuesCreated + metrics.venuesUpdated) / metrics.placesFetched) *
                100
              ).toFixed(2) + '%'
            : '0%',
        timestamp: metrics.endTime?.toISOString(),
      });

      return metrics;
    } catch (error) {
      metrics.endTime = new Date();
      metrics.durationMs = metrics.endTime.getTime() - metrics.startTime.getTime();
      metrics.errors++;
      metrics.errorDetails.push(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.logger.error(`Sync failed for city ${cityId}`, error);
      throw error;
    }
  }

  /**
   * Process a single place
   */
  private async processPlace(placeId: string, city: City, metrics: SyncMetrics): Promise<void> {
    // Get place details
    const googlePlace = await this.googlePlacesService.getPlaceDetails(placeId);
    if (!googlePlace) {
      metrics.errors++;
      metrics.errorDetails.push(`Place ${placeId}: Failed to fetch place details`);
      return;
    }

    // Filter by rating >= 3 (safety check - also filtered at search level)
    // Skip places without ratings (undefined) or with rating < 3
    // Note: This is a double-check since ratings might differ between search and details
    if (googlePlace.rating === undefined || googlePlace.rating < 3) {
      this.logger.debug(
        `Skipping place ${googlePlace.name} (${placeId}) - rating ${googlePlace.rating || 'N/A'} < 3 or missing`,
      );
      return;
    }

    // Exclude places that are primarily gas stations, convenience stores, hotels, gyms, etc.
    // Even if they have a cafe/restaurant attached, we want standalone food venues
    const excludedTypes = [
      'gas_station',
      'convenience_store',
      'car_wash',
      'car_repair',
      'atm',
      'bank',
      'hospital',
      'pharmacy',
      'supermarket',
      'grocery_or_supermarket',
      'lodging', // Exclude hotels (they often have restaurants but we want standalone venues)
      'gym', // Exclude gyms (some have cafes but they're not primary food venues)
    ];
    const hasExcludedType = googlePlace.types.some((type) => excludedTypes.includes(type));
    if (hasExcludedType) {
      this.logger.debug(
        `Skipping place ${googlePlace.name} (${placeId}) - excluded type: ${googlePlace.types.filter((t) => excludedTypes.includes(t)).join(', ')}`,
      );
      return;
    }

    // Check for existing venue by source ID
    const existingVenue = await this.deduplicationService.findBySourceId('google_places', placeId);

    if (existingVenue) {
      // Update existing venue
      const normalized = this.normalizationService.normalizeVenue(googlePlace, city);
      const hash = this.normalizationService.calculateHash(normalized);

      // Check if data changed
      const existingSource = await this.venueSourceRepository.findBySourceAndExternalId(
        'google_places',
        placeId,
      );
      if (existingSource?.rawHash !== hash) {
        await this.venueRepository.update(existingVenue.id, normalized);
        await this.venueSourceRepository.update(existingSource!.id, {
          lastSyncedAt: new Date(),
          rawHash: hash,
        });
        metrics.venuesUpdated++;
      }
    } else {
      // Check for potential duplicates
      const duplicates = await this.deduplicationService.findPotentialDuplicates(
        googlePlace.name,
        googlePlace.geometry.location.lat,
        googlePlace.geometry.location.lng,
      );

      if (duplicates.length > 0) {
        // Mark as potential duplicate (manual review needed)
        metrics.duplicatesFound++;
        this.logger.warn(`Potential duplicate found: ${googlePlace.name} (${placeId})`);
        // Still create the venue but mark for review
      }

      // Create new venue
      const normalized = this.normalizationService.normalizeVenue(googlePlace, city);
      const venue = await this.venueRepository.create(normalized);

      // Create venue source
      const hash = this.normalizationService.calculateHash(normalized);
      await this.venueSourceRepository.create({
        venueId: venue.id,
        source: 'google_places',
        externalId: placeId,
        lastSyncedAt: new Date(),
        rawHash: hash,
      });

      metrics.venuesCreated++;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
