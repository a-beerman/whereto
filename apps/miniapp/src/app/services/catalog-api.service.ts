import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CatalogService } from '@whereto/shared/api-client-angular';
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
    return this.catalog.catalogControllerFindAllCities().pipe(
      map((response) => response.data || []),
      catchError((error) => this.errorHandler.createCatchError('Ошибка загрузки городов')(error)),
    );
  }

  /**
   * Get venue by ID
   */
  getVenue(venueId: string): Observable<Venue> {
    return this.catalog.catalogControllerGetVenueDetails(venueId).pipe(
      map((response) => response.data),
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
  }): Observable<Venue[]> {
    return this.catalog.catalogControllerSearchVenues(params).pipe(
      map((response) => response.data || []),
      catchError((error) => this.errorHandler.createCatchError('Ошибка поиска заведений')(error)),
    );
  }
}
