import { Injectable, NotFoundException } from '@nestjs/common';
import { UserSavedVenueRepository } from '../repositories/user-saved-venue.repository';
import { VenueRepository } from '../repositories/venue.repository';
import { VenueResponse } from '../dto/venue-response';
import { Venue } from '../entities/venue.entity';

@Injectable()
export class UserSavedVenuesService {
  constructor(
    private readonly savedVenueRepository: UserSavedVenueRepository,
    private readonly venueRepository: VenueRepository,
  ) {}

  async getSavedVenues(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ data: VenueResponse[]; meta: { total: number; limit: number; offset: number } }> {
    const result = await this.savedVenueRepository.findByUserId(userId, limit, offset);

    const venues = result.items.map((saved) => {
      const venue = saved.venue;
      // Load overrides if needed
      return venue;
    });

    // Apply overrides to each venue
    const venuesWithOverrides = await Promise.all(
      venues.map(async (venue) => {
        const fullVenue = await this.venueRepository.findById(venue.id);
        if (!fullVenue) return venue;
        const overrides = fullVenue.overrides?.[0];
        return this.venueRepository.applyOverrides(fullVenue, overrides);
      }),
    );

    return {
      data: venuesWithOverrides.map((venue) => this.toResponseDto(venue)),
      meta: {
        total: result.total,
        limit,
        offset,
      },
    };
  }

  async saveVenue(userId: string, venueId: string): Promise<{ data: { saved: boolean } }> {
    // Verify venue exists
    const venue = await this.venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundException(`Venue with id ${venueId} not found`);
    }

    await this.savedVenueRepository.save(userId, venueId);
    return { data: { saved: true } };
  }

  async removeSavedVenue(userId: string, venueId: string): Promise<{ data: { removed: boolean } }> {
    const removed = await this.savedVenueRepository.remove(userId, venueId);
    if (!removed) {
      throw new NotFoundException(`Saved venue with id ${venueId} not found`);
    }
    return { data: { removed: true } };
  }

  private toResponseDto(venue: Venue): VenueResponse {
    let lat: number | undefined;
    let lng: number | undefined;

    if (venue.location && venue.location.coordinates) {
      // Coordinates type: { type: 'Point', coordinates: [lng, lat] }
      lng = venue.location.coordinates[0];
      lat = venue.location.coordinates[1];
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
