import { Injectable } from '@nestjs/common';
import { VenueRepository, VenueFilters } from '../repositories/venue.repository';
import { VenueResponseDto } from '../dto/venue-response.dto';
import { PhotoService } from './photo.service';
import { HoursService } from './hours.service';

@Injectable()
export class VenuesService {
  constructor(
    private readonly venueRepository: VenueRepository,
    private readonly photoService: PhotoService,
    private readonly hoursService: HoursService,
  ) {}

  async search(filters: VenueFilters): Promise<{
    venues: VenueResponseDto[];
    total: number;
    nextCursor?: string;
  }> {
    // Remove openNow from repository search (will filter in service layer)
    const { openNow, ...repoFilters } = filters;
    const result = await this.venueRepository.search(repoFilters);

    // Apply overrides to each venue
    let venuesWithOverrides = result.venues.map((venue) => {
      const overrides = venue.overrides?.[0]; // Get first override if exists
      return this.venueRepository.applyOverrides(venue, overrides);
    });

    // Filter by openNow if requested
    if (openNow) {
      const now = new Date();
      venuesWithOverrides = venuesWithOverrides.filter((venue) => {
        return this.hoursService.isOpenAt(venue.hours, now);
      });
    }

    return {
      venues: venuesWithOverrides.map((venue) => this.toResponseDto(venue)),
      total: venuesWithOverrides.length, // Update total after filtering
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

    // Convert photo references to URLs
    const photoUrls = venue.photoRefs ? this.photoService.getPhotoUrls(venue.photoRefs) : [];

    // Format hours for display
    const formattedHours = venue.hours ? this.hoursService.formatHours(venue.hours) : undefined;

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
      photoRefs: photoUrls.length > 0 ? photoUrls : venue.photoRefs, // Return URLs if available, fallback to refs
      photoUrls, // Also include separate photoUrls field
      hours: formattedHours || venue.hours, // Return formatted hours if available
      status: venue.status,
      createdAt: venue.createdAt,
      updatedAt: venue.updatedAt,
    };
  }
}
