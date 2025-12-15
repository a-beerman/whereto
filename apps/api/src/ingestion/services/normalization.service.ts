import { Injectable } from '@nestjs/common';
import { GooglePlacesService, GooglePlace } from './google-places.service';
import { Venue } from '../../catalog/entities/venue.entity';
import { City } from '../../catalog/entities/city.entity';

@Injectable()
export class NormalizationService {
  constructor(private readonly googlePlacesService: GooglePlacesService) {}

  /**
   * Normalize Google Place to Venue entity
   */
  normalizeVenue(googlePlace: GooglePlace, city: City): Partial<Venue> {
    const categories = this.googlePlacesService.mapGoogleTypeToCategory(googlePlace.types);

    // Create PostGIS Point from lat/lng
    const location = {
      type: 'Point',
      coordinates: [googlePlace.geometry.location.lng, googlePlace.geometry.location.lat],
    };

    // Normalize opening hours
    const hours = this.normalizeHours(googlePlace.opening_hours);

    // Extract photo references
    const photoRefs = googlePlace.photos?.map((p) => p.photo_reference) || [];

    return {
      cityId: city.id,
      name: googlePlace.name,
      address: googlePlace.formatted_address,
      location: location as any,
      categories,
      rating: googlePlace.rating ? parseFloat(googlePlace.rating.toFixed(2)) : null,
      ratingCount: googlePlace.user_ratings_total || null,
      photoRefs,
      hours,
      status: googlePlace.business_status === 'OPERATIONAL' ? 'active' : 'hidden',
    };
  }

  /**
   * Normalize Google Places opening hours to our format
   */
  private normalizeHours(openingHours?: { weekday_text?: string[]; periods?: any[] }): any {
    if (!openingHours) {
      return null;
    }

    // Use periods if available (more structured)
    if (openingHours.periods) {
      return {
        periods: openingHours.periods,
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
    const crypto = require('crypto');
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
