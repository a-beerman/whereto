import { Injectable } from '@nestjs/common';
import { VenueRepository, VenueFilters } from '../repositories/venue.repository';
import { VenueResponseDto } from '../dto/venue-response.dto';
import { PhotoService } from './photo.service';
import { HoursService } from './hours.service';
import { haversineDistance } from '../../utils/geo';
import { extractLatLng } from '../types/coordinates.type';

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
    // Remove openNow and sort from repository search (will handle in service layer)
    const { openNow, sort, ...repoFilters } = filters;
    const result = await this.venueRepository.search(repoFilters);

    // Apply overrides to each venue
    let venuesWithOverrides = result.venues.map((venue) => {
      const overrides = venue.overrides?.[0]; // Get first override if exists
      return this.venueRepository.applyOverrides(venue, overrides);
    });

    // Filter by radius using Haversine distance (if radius filter was used)
    if (filters.lat && filters.lng && filters.radiusMeters) {
      venuesWithOverrides = venuesWithOverrides.filter((venue) => {
        const coords = extractLatLng(venue.location);
        if (!coords) return false;
        const distance = haversineDistance(filters.lat!, filters.lng!, coords.lat, coords.lng);
        return distance <= filters.radiusMeters!;
      });
    }

    // Sort by distance if requested
    if (sort === 'distance' && filters.lat && filters.lng) {
      venuesWithOverrides = venuesWithOverrides
        .map((venue) => {
          const coords = extractLatLng(venue.location);
          if (!coords) return { venue, distance: Infinity };
          const distance = haversineDistance(filters.lat!, filters.lng!, coords.lat, coords.lng);
          return { venue, distance };
        })
        .sort((a, b) => a.distance - b.distance)
        .map((item) => item.venue);
    }

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
    // Extract lat/lng from Coordinates
    const coords = extractLatLng(venue.location);
    const lat = coords?.lat;
    const lng = coords?.lng;

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
