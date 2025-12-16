import { Injectable, Logger } from '@nestjs/common';
import { PlaceType1 } from '@googlemaps/google-maps-services-js';
import { CityRepository } from '../../catalog/repositories/city.repository';
import { VenueRepository } from '../../catalog/repositories/venue.repository';
import { VenueSourceRepository } from '../../catalog/repositories/venue-source.repository';
import { GooglePlacesService } from '../services/google-places.service';
import { NormalizationService } from '../services/normalization.service';
import { DeduplicationService } from '../services/deduplication.service';
import { City } from '../../catalog/entities/city.entity';

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

      // Search for restaurants, cafes, and bars using Legacy Places API
      // Legacy API supports pagination with next_page_token
      const placeTypes: PlaceType1[] = [PlaceType1.restaurant, PlaceType1.cafe, PlaceType1.bar];
      const allPlaces: Set<string> = new Set(); // Track unique place_ids

      this.logger.log(`Searching for ${placeTypes.join(', ')} in ${city.name}...`);

      // Search each type separately with pagination support
      for (const placeType of placeTypes) {
        let nextPageToken: string | undefined;
        let pageCount = 0;
        const maxPages = 3; // Limit pages per type (3 pages × 20 results = 60 per type max)

        do {
          const searchResult = await this.googlePlacesService.searchPlaces({
            location: { lat: centerLat, lng: centerLng },
            radius: 10000, // 10km radius
            type: placeType,
            pageToken: nextPageToken,
          });

          for (const place of searchResult.results) {
            // Filter by rating >= 3 at search level to avoid unnecessary place details API calls
            // Skip places without ratings or with rating < 3
            if (place.rating !== undefined && place.rating >= 3) {
              allPlaces.add(place.place_id);
              metrics.placesFetched++;
            } else {
              this.logger.debug(
                `Skipping place ${place.name} (${place.place_id}) - rating ${place.rating || 'N/A'} < 3 or missing`,
              );
            }
          }

          this.logger.log(
            `Page ${pageCount + 1}: Found ${searchResult.results.length} ${placeType}s (${allPlaces.size} total unique places)`,
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

      this.logger.log(`Found ${allPlaces.size} unique places. Processing...`);

      // Limit places for debugging (set to 0 or remove to sync all)
      const MAX_PLACES = 100;
      const placesToProcess =
        MAX_PLACES > 0 ? Array.from(allPlaces).slice(0, MAX_PLACES) : Array.from(allPlaces);

      if (MAX_PLACES > 0 && allPlaces.size > MAX_PLACES) {
        this.logger.log(
          `Limiting to ${MAX_PLACES} places for debugging (found ${allPlaces.size} total)`,
        );
      }

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

    // Exclude places that are primarily gas stations, convenience stores, etc.
    // Even if they have a cafe/restaurant attached, we don't want them
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
