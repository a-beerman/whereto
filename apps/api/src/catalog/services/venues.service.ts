import { Injectable } from '@nestjs/common';
import { VenueRepository, VenueFilters } from '../repositories/venue.repository';
import { VenueResponseDto } from '../dto/venue-response.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly venueRepository: VenueRepository) {}

  async search(filters: VenueFilters): Promise<{
    venues: VenueResponseDto[];
    total: number;
    nextCursor?: string;
  }> {
    const result = await this.venueRepository.search(filters);

    // Apply overrides to each venue
    const venuesWithOverrides = result.venues.map((venue) => {
      const overrides = venue.overrides?.[0]; // Get first override if exists
      return this.venueRepository.applyOverrides(venue, overrides);
    });

    return {
      venues: venuesWithOverrides.map(this.toResponseDto),
      total: result.total,
      nextCursor: result.nextCursor,
    };
  }

  async findById(id: string): Promise<VenueResponseDto | null> {
    const venue = await this.venueRepository.findById(id);
    if (!venue) {
      return null;
    }

    const overrides = venue.overrides?.[0];
    const venueWithOverrides = this.venueRepository.applyOverrides(venue, overrides);
    return this.toResponseDto(venueWithOverrides);
  }

  private toResponseDto(venue: any): VenueResponseDto {
    // Extract lat/lng from PostGIS location if needed
    let lat: number | undefined;
    let lng: number | undefined;

    if (venue.location) {
      // If location is a PostGIS Point, extract coordinates
      // This depends on how TypeORM returns PostGIS data
      // For now, assume it's stored as { x: lng, y: lat } or similar
      if (typeof venue.location === 'object') {
        lng = venue.location.x || venue.location.lng;
        lat = venue.location.y || venue.location.lat;
      }
    }

    return {
      id: venue.id,
      cityId: venue.cityId,
      name: venue.name,
      address: venue.address,
      lat,
      lng,
      categories: venue.categories,
      rating: venue.rating ? Number(venue.rating) : undefined,
      ratingCount: venue.ratingCount,
      photoRefs: venue.photoRefs,
      hours: venue.hours,
      status: venue.status,
      createdAt: venue.createdAt,
      updatedAt: venue.updatedAt,
    };
  }
}
