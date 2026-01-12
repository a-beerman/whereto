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
    periods?: Array<{
      open?: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  business_status?: string;
  phone?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    telegram?: string;
    whatsapp?: string;
    viber?: string;
    messenger?: string;
  };
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

      const status = response.data.status as string;
      if (status !== 'OK' && status !== 'ZERO_RESULTS') {
        this.logger.error(`Google Places API error: ${status}`);
        if (response.data.error_message) {
          this.logger.error(`Error message: ${response.data.error_message}`);
        }
        throw new Error(`Google Places API error: ${status}`);
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
            'international_phone_number',
            'website',
          ],
          key: this.apiKey,
        },
      });

      const status = response.data.status as string;
      if (status !== 'OK') {
        if (status === 'NOT_FOUND') {
          return null;
        }
        this.logger.error(`Google Places Details API error: ${status}`);
        return null;
      }

      const place = response.data.result;
      if (!place) {
        return null;
      }

      // Extract social media links from website if available
      // Note: Google Places API doesn't provide direct social media links,
      // but we can try to extract them from website or other sources if needed
      const socialMedia = this.extractSocialMedia();

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
              periods: (place.opening_hours.periods || [])
                .filter(
                  (
                    p,
                  ): p is {
                    open: { day: number; time: string };
                    close?: { day: number; time: string };
                  } =>
                    p.open !== undefined &&
                    p.open.time !== undefined &&
                    typeof p.open.time === 'string',
                )
                .map((p) => ({
                  open: { day: p.open.day, time: p.open.time },
                  close:
                    p.close && p.close.time ? { day: p.close.day, time: p.close.time } : undefined,
                })),
            }
          : undefined,
        business_status: place.business_status,
        phone: place.international_phone_number || undefined,
        website: place.website || undefined,
        socialMedia: socialMedia || undefined,
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

  /**
   * Extract social media links from website URL
   * Note: Google Places API doesn't provide direct social media links
   * This is a placeholder for future enhancement (could parse website HTML or use other sources)
   */
  private extractSocialMedia():
    | {
        facebook?: string;
        instagram?: string;
        twitter?: string;
      }
    | undefined {
    // For now, return undefined as Google Places API doesn't provide social media links directly
    // Future: could parse website HTML or use other APIs to find social media links
    return undefined;
  }
}
