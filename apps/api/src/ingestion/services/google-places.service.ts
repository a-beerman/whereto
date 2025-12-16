import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  PlaceType1,
  PlacesNearbyResponse,
  PlaceDetailsResponse,
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
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY not set. Google Places integration will not work.');
    }
    this.apiKey = apiKey || '';

    // Initialize the Google Maps Services client
    this.client = new Client({});

    this.logger.log(
      `GooglePlacesService initialized with API key: ${this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NOT SET'}`,
    );
  }

  /**
   * Search for places in a geographic area using Legacy Places API
   * Supports pagination with next_page_token
   *
   * Note: The `type` parameter filters results at the API level (e.g., only restaurants)
   */
  async searchPlaces(params: {
    location: { lat: number; lng: number };
    radius: number; // in meters
    type: PlaceType1; // Required - filters by type (e.g., PlaceType1.restaurant)
    keyword?: string;
    pageToken?: string;
  }): Promise<{ results: GooglePlace[]; nextPageToken?: string }> {
    try {
      const response: PlacesNearbyResponse = await this.client.placesNearby({
        params: {
          location: params.location,
          radius: params.radius,
          type: params.type,
          keyword: params.keyword,
          pagetoken: params.pageToken,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        this.logger.error(`Google Places API error: ${response.data.status}`);
        if (response.data.error_message) {
          this.logger.error(`Error message: ${response.data.error_message}`);
        }
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const results: GooglePlace[] = (response.data.results || []).map((place) => ({
        place_id: place.place_id || '',
        name: place.name || '',
        formatted_address: place.vicinity || '',
        geometry: {
          location: {
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0,
          },
        },
        types: place.types || [],
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        photos: place.photos?.map((p) => ({ photo_reference: p.photo_reference })),
        opening_hours: place.opening_hours
          ? {
              weekday_text: [],
              periods: [],
            }
          : undefined,
        business_status: place.business_status,
      }));

      this.logger.log(`SearchNearby returned ${results.length} places`);

      return {
        results,
        nextPageToken: response.data.next_page_token,
      };
    } catch (error) {
      this.logger.error('Error searching Google Places', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a place using Legacy Places API
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    try {
      const response: PlaceDetailsResponse = await this.client.placeDetails({
        params: {
          place_id: placeId,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'type',
            'rating',
            'user_ratings_total',
            'photo',
            'opening_hours',
            'business_status',
          ],
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        if (response.data.status === 'NOT_FOUND') {
          return null;
        }
        this.logger.error(`Google Places Details API error: ${response.data.status}`);
        return null;
      }

      const place = response.data.result;
      if (!place) {
        return null;
      }

      return {
        place_id: place.place_id || placeId,
        name: place.name || '',
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
        photos: place.photos?.map((p) => ({ photo_reference: p.photo_reference })),
        opening_hours: place.opening_hours
          ? {
              weekday_text: place.opening_hours.weekday_text || [],
              periods: place.opening_hours.periods || [],
            }
          : undefined,
        business_status: place.business_status,
      };
    } catch (error) {
      this.logger.error(`Error getting place details for ${placeId}`, error);
      return null;
    }
  }

  /**
   * Map Google Places types to our categories
   * Returns empty array if no matching types found (caller should skip such places)
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

    // No default - return empty array if no relevant types found
    // The caller (processPlace) should skip places without relevant types
    return categories;
  }
}
