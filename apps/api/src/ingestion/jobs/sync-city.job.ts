import { Injectable, Logger } from '@nestjs/common';
import { CityRepository } from '../../catalog/repositories/city.repository';
import { VenueRepository } from '../../catalog/repositories/venue.repository';
import { VenueSourceRepository } from '../../catalog/repositories/venue-source.repository';
import { GooglePlacesService } from '../services/google-places.service';
import { NormalizationService } from '../services/normalization.service';
import { DeduplicationService } from '../services/deduplication.service';
import { City } from '../../catalog/entities/city.entity';
import { Venue } from '../../catalog/entities/venue.entity';

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

      // Search for restaurants, cafes, and bars
      const placeTypes: Array<'restaurant' | 'cafe' | 'bar'> = ['restaurant', 'cafe', 'bar'];
      const allPlaces: Set<string> = new Set(); // Track unique place_ids

      for (const type of placeTypes) {
        this.logger.log(`Searching for ${type} in ${city.name}...`);

        let nextPageToken: string | undefined;
        let pageCount = 0;
        const maxPages = 10; // Limit pages per type to avoid excessive API calls

        do {
          const searchResult = await this.googlePlacesService.searchPlaces({
            location: { lat: city.centerLat, lng: city.centerLng },
            radius: 10000, // 10km radius
            type,
            pagetoken: nextPageToken,
          });

          for (const place of searchResult.results) {
            allPlaces.add(place.place_id);
            metrics.placesFetched++;
          }

          nextPageToken = searchResult.nextPageToken;
          pageCount++;

          // Rate limiting: wait between pages
          if (nextPageToken && pageCount < maxPages) {
            await this.delay(2000); // 2 second delay between pages
          }
        } while (nextPageToken && pageCount < maxPages);
      }

      this.logger.log(`Found ${allPlaces.size} unique places. Processing...`);

      // Process each place
      for (const placeId of allPlaces) {
        try {
          await this.processPlace(placeId, city, metrics);
          // Rate limiting: delay between place details requests
          await this.delay(100); // 100ms delay
        } catch (error) {
          metrics.errors++;
          metrics.errorDetails.push(
            `Place ${placeId}: ${error instanceof Error ? error.message : String(error)}`,
          );
          this.logger.error(`Error processing place ${placeId}`, error);
        }
      }

      metrics.endTime = new Date();
      metrics.durationMs = metrics.endTime.getTime() - metrics.startTime.getTime();

      this.logger.log(
        `Sync completed for ${city.name}: ${metrics.venuesCreated} created, ${metrics.venuesUpdated} updated, ${metrics.duplicatesFound} duplicates, ${metrics.errors} errors`,
      );

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
