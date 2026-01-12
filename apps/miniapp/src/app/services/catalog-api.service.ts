import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  CatalogService,
  CitiesResponse,
  VenueDetailsResponse,
  VenuesResponse,
  VenueResponse,
  City as ApiCity,
} from '@whereto/shared/api-client-angular';
import { ErrorHandlerService } from './error-handler.service';
import { City, Venue } from '../models/types';

/**
 * Centralized service for catalog API operations.
 * Wraps the generated CatalogService and provides clean, business-logic-focused methods.
 *
 * This mirrors the bot's ApiService pattern: single source of truth for all catalog calls,
 * with consistent error handling and response shape management.
 */
@Injectable({
  providedIn: 'root',
})
export class CatalogApiService {
  private readonly catalog = inject(CatalogService);
  private readonly errorHandler = inject(ErrorHandlerService);

  /**
   * Get all cities
   */
  getCities(): Observable<City[]> {
    return this.catalog.citiesFindAll().pipe(
      map((response: CitiesResponse) => {
        const cities = response.data || [];
        // Convert ApiCity[] to City[]
        return cities
          .filter((city: ApiCity) => city.id && city.name) // Filter out incomplete cities
          .map((city: ApiCity) => ({
            id: city.id!,
            name: city.name!,
          }));
      }),
      catchError((error) => this.errorHandler.createCatchError('Ошибка загрузки городов')(error)),
    );
  }

  /**
   * Get venue by ID
   */
  getVenue(venueId: string): Observable<Venue> {
    return this.catalog.venuesFindOne(venueId).pipe(
      map((response: VenueDetailsResponse) => {
        const venueDto = response.data;
        if (!venueDto) {
          throw new Error('Venue not found');
        }
        // Convert VenueResponse to Venue
        return {
          id: venueDto.id,
          name: venueDto.name,
          address: venueDto.address,
          rating: venueDto.rating,
          ratingCount: venueDto.ratingCount,
          categories: venueDto.categories,
          location:
            venueDto.lat && venueDto.lng
              ? {
                  type: 'Point',
                  coordinates: [venueDto.lng, venueDto.lat] as [number, number],
                }
              : undefined,
          photoUrls: venueDto.photoUrls,
          phone: venueDto.phone,
          website: venueDto.website,
        };
      }),
      catchError((error) => this.errorHandler.createCatchError('Ошибка загрузки заведения')(error)),
    );
  }

  /**
   * Search venues with filters
   */
  searchVenues(params: {
    q?: string;
    category?: string;
    cityId?: string;
    limit?: number;
    offset?: number;
    minRating?: number;
    lat?: number;
    lng?: number;
    radius?: number;
  }): Observable<Venue[]> {
    return this.catalog
      .venuesFindAll(
        params.q,
        params.cityId,
        params.category,
        params.lat,
        params.lng,
        params.radius, // radiusMeters parameter
        undefined, // bbox
        params.minRating,
        undefined, // openNow
        params.limit,
        params.offset,
        undefined, // cursor
        undefined, // sort
      )
      .pipe(
        map((response: VenuesResponse) => {
          const venues = response.data || [];
          // Convert VenueResponse[] to Venue[]
          return venues.map((venueDto: VenueResponse) => ({
            id: venueDto.id,
            name: venueDto.name,
            address: venueDto.address,
            rating: venueDto.rating,
            ratingCount: venueDto.ratingCount,
            categories: venueDto.categories,
            location:
              venueDto.lat && venueDto.lng
                ? {
                    type: 'Point',
                    coordinates: [venueDto.lng, venueDto.lat] as [number, number],
                  }
                : undefined,
            photoUrls: venueDto.photoUrls,
            phone: venueDto.phone,
            website: venueDto.website,
          }));
        }),
        catchError((error) => this.errorHandler.createCatchError('Ошибка поиска заведений')(error)),
      );
  }
}
