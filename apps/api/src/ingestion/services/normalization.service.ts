import { Injectable } from '@nestjs/common';
import { GooglePlacesService, GooglePlace } from './google-places.service';
import { Venue } from '../../catalog/entities/venue.entity';
import { City } from '../../catalog/entities/city.entity';
import { createCoordinates } from '../../catalog/types/coordinates.type';

@Injectable()
export class NormalizationService {
  constructor(private readonly googlePlacesService: GooglePlacesService) {}

  /**
   * Normalize Google Place to Venue entity
   */
  normalizeVenue(googlePlace: GooglePlace, city: City): Partial<Venue> {
    const categories = this.googlePlacesService.mapGoogleTypeToCategory(googlePlace.types);

    // Extract lat/lng from Google Place geometry and create Coordinates
    const lat = googlePlace.geometry.location.lat;
    const lng = googlePlace.geometry.location.lng;
    const location = createCoordinates(lat, lng);

    // Normalize opening hours
    const hours = this.normalizeHours(
      googlePlace.opening_hours as
        | {
            weekday_text?: string[];
            periods?: Array<{
              open?: { day: number; time: string };
              close?: { day: number; time: string };
            }>;
          }
        | undefined,
    );

    // Extract photo references
    const photoRefs = googlePlace.photos?.map((p) => p.photo_reference) || [];

    return {
      cityId: city.id,
      name: googlePlace.name,
      address: googlePlace.formatted_address,
      location,
      categories,
      rating:
        typeof googlePlace.rating === 'number'
          ? parseFloat(googlePlace.rating.toFixed(2))
          : undefined,
      ratingCount:
        typeof googlePlace.user_ratings_total === 'number'
          ? googlePlace.user_ratings_total
          : undefined,
      photoRefs,
      hours: hours ?? undefined,
      phone: googlePlace.phone,
      website: googlePlace.website,
      socialMedia: googlePlace.socialMedia,
      status: googlePlace.business_status === 'OPERATIONAL' ? 'active' : 'hidden',
    };
  }

  /**
   * Normalize Google Places opening hours to our format
   */
  private normalizeHours(openingHours?: {
    weekday_text?: string[];
    periods?: Array<{
      open?: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  }): {
    periods?: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }>;
    weekday_text?: string[];
  } | null {
    if (!openingHours) {
      return null;
    }

    // Use periods if available (more structured)
    // Filter out periods without 'open' to match venue entity type
    if (openingHours.periods) {
      const validPeriods = openingHours.periods
        .filter(
          (
            p,
          ): p is { open: { day: number; time: string }; close?: { day: number; time: string } } =>
            p.open !== undefined,
        )
        .map((p) => ({
          open: p.open,
          close: p.close,
        }));

      return {
        periods: validPeriods.length > 0 ? validPeriods : undefined,
        weekday_text: openingHours.weekday_text,
      };
    }

    // Fallback to weekday_text
    if (openingHours.weekday_text) {
      return {
        weekday_text: openingHours.weekday_text,
      };
    }

    return null;
  }

  /**
   * Calculate hash of normalized data for change detection
   */
  calculateHash(venue: Partial<Venue>): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto');
    const data = JSON.stringify({
      name: venue.name,
      address: venue.address,
      categories: venue.categories,
      rating: venue.rating,
      ratingCount: venue.ratingCount,
    });
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 64);
  }
}
