import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  PlaceType1,
  PlacesNearbySearchRequest,
  PlaceDetailsRequest,
} from '@googlemaps/google-maps-services-js';

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{ photo_reference: string }>;
  opening_hours?: {
    weekday_text?: string[];
    periods?: any[];
  };
  business_status?: string;
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly client: Client;

  constructor() {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY not set. Google Places integration will not work.');
    }
    this.client = new Client({});
  }

  /**
   * Search for places in a geographic area
   */
  async searchPlaces(params: {
    location: { lat: number; lng: number };
    radius: number; // in meters
    type?: PlaceType1;
    keyword?: string;
    pagetoken?: string;
  }): Promise<{ results: GooglePlace[]; nextPageToken?: string }> {
    try {
      const request: PlacesNearbySearchRequest = {
        params: {
          location: [params.location.lat, params.location.lng],
          radius: params.radius,
          type: params.type,
          keyword: params.keyword,
          pagetoken: params.pagetoken,
          key: process.env.GOOGLE_PLACES_API_KEY || '',
        },
      };

      const response = await this.client.placesNearby(request);

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        this.logger.error(
          `Google Places API error: ${response.data.status}`,
          response.data.error_message,
        );
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const results = (response.data.results || []).map((place) => this.normalizePlace(place));
      const nextPageToken = response.data.next_page_token;

      return { results, nextPageToken };
    } catch (error) {
      this.logger.error('Error searching Google Places', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a place
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    try {
      const request: PlaceDetailsRequest = {
        params: {
          place_id: placeId,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'types',
            'rating',
            'user_ratings_total',
            'photos',
            'opening_hours',
            'business_status',
          ],
          key: process.env.GOOGLE_PLACES_API_KEY || '',
        },
      };

      const response = await this.client.placeDetails(request);

      if (response.data.status !== 'OK') {
        this.logger.error(`Google Places Details API error: ${response.data.status}`);
        return null;
      }

      return this.normalizePlace(response.data.result);
    } catch (error) {
      this.logger.error(`Error getting place details for ${placeId}`, error);
      return null;
    }
  }

  /**
   * Normalize Google Places API response to our format
   */
  private normalizePlace(place: any): GooglePlace {
    return {
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address || '',
      geometry: {
        location: {
          lat: place.geometry?.location?.lat || 0,
          lng: place.geometry?.location?.lng || 0,
        },
      },
      types: place.types || [],
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      photos: place.photos?.map((p: any) => ({ photo_reference: p.photo_reference })) || [],
      opening_hours: place.opening_hours
        ? {
            weekday_text: place.opening_hours.weekday_text,
            periods: place.opening_hours.periods,
          }
        : undefined,
      business_status: place.business_status,
    };
  }

  /**
   * Map Google Places types to our categories
   */
  mapGoogleTypeToCategory(types: string[]): string[] {
    const categoryMap: Record<string, string> = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      bar: 'bar',
      night_club: 'bar',
      meal_takeaway: 'restaurant',
      meal_delivery: 'restaurant',
      bakery: 'cafe',
      food: 'restaurant',
    };

    const categories: string[] = [];
    for (const type of types) {
      const category = categoryMap[type];
      if (category && !categories.includes(category)) {
        categories.push(category);
      }
    }

    // Default to 'restaurant' if no match
    if (categories.length === 0) {
      categories.push('restaurant');
    }

    return categories;
  }
}
