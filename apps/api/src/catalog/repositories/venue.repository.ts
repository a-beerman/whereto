import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Venue } from '../entities/venue.entity';
import { VenueOverrides } from '../entities/venue-overrides.entity';

export interface VenueFilters {
  cityId?: string;
  q?: string;
  category?: string | string[];
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  bbox?: string; // "minLat,minLng,maxLat,maxLng"
  minRating?: number;
  openNow?: boolean;
  limit?: number;
  offset?: number;
  cursor?: string;
  sort?: 'distance' | 'rating' | 'name';
}

@Injectable()
export class VenueRepository {
  constructor(
    @InjectRepository(Venue)
    private readonly repository: Repository<Venue>,
    @InjectRepository(VenueOverrides)
    private readonly overridesRepository: Repository<VenueOverrides>,
  ) {}

  async findById(id: string): Promise<Venue | null> {
    const venue = await this.repository.findOne({
      where: { id, status: 'active' },
      relations: ['city', 'sources'],
    });

    if (!venue) {
      return null;
    }

    // Load overrides separately
    const overrides = await this.overridesRepository.findOne({
      where: { venueId: id },
    });

    if (overrides) {
      venue.overrides = [overrides];
    }

    return venue;
  }

  async findByCity(cityId: string): Promise<Venue[]> {
    return this.repository.find({
      where: { cityId, status: 'active' },
    });
  }

  async search(
    filters: VenueFilters,
  ): Promise<{ venues: Venue[]; total: number; nextCursor?: string }> {
    const queryBuilder = this.repository
      .createQueryBuilder('venue')
      .where('venue.status = :status', { status: 'active' })
      .leftJoinAndSelect('venue.city', 'city')
      .leftJoinAndSelect('venue.sources', 'sources')
      .leftJoinAndSelect('venue.overrides', 'overrides');

    // City filter
    if (filters.cityId) {
      queryBuilder.andWhere('venue.cityId = :cityId', { cityId: filters.cityId });
    }

    // Text search
    if (filters.q) {
      queryBuilder.andWhere('(venue.name ILIKE :q OR venue.address ILIKE :q)', {
        q: `%${filters.q}%`,
      });
    }

    // Category filter
    if (filters.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      queryBuilder.andWhere('venue.categories && :categories', {
        categories,
      });
    }

    // Geo filter - bbox
    if (filters.bbox) {
      const [minLat, minLng, maxLat, maxLng] = filters.bbox.split(',').map(Number);
      queryBuilder.andWhere(
        'ST_Within(venue.location, ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326))',
        { minLng, minLat, maxLng, maxLat },
      );
    }

    // Geo filter - radius
    if (filters.lat && filters.lng && filters.radiusMeters) {
      queryBuilder.andWhere(
        'ST_DWithin(venue.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)',
        { lat: filters.lat, lng: filters.lng, radius: filters.radiusMeters },
      );
    }

    // Rating filter
    if (filters.minRating) {
      queryBuilder.andWhere('venue.rating >= :minRating', { minRating: filters.minRating });
    }

    // Open now filter (if hours available)
    if (filters.openNow) {
      // This would require parsing hours JSONB - implement based on hours structure
      // For now, skip this filter
    }

    // Sorting
    if (filters.sort === 'distance' && filters.lat && filters.lng) {
      queryBuilder
        .addSelect(
          'ST_Distance(venue.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)',
          'distance',
        )
        .setParameter('lat', filters.lat)
        .setParameter('lng', filters.lng)
        .orderBy('distance', 'ASC');
    } else if (filters.sort === 'rating') {
      queryBuilder.orderBy('venue.rating', 'DESC', 'NULLS LAST');
    } else if (filters.sort === 'name') {
      queryBuilder.orderBy('venue.name', 'ASC');
    } else {
      // Default: by rating or created date
      queryBuilder
        .orderBy('venue.rating', 'DESC', 'NULLS LAST')
        .addOrderBy('venue.createdAt', 'DESC');
    }

    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Cursor-based pagination (if cursor provided)
    if (filters.cursor) {
      // Decode cursor and add where clause
      // For now, use offset-based
    }

    queryBuilder.take(limit).skip(offset);

    const [venues, total] = await queryBuilder.getManyAndCount();

    // Generate next cursor if needed
    let nextCursor: string | undefined;
    if (offset + limit < total) {
      nextCursor = Buffer.from(JSON.stringify({ offset: offset + limit })).toString('base64');
    }

    return { venues, total, nextCursor };
  }

  async create(venue: Partial<Venue>): Promise<Venue> {
    const newVenue = this.repository.create(venue);
    return this.repository.save(newVenue);
  }

  async update(id: string, updates: Partial<Venue>): Promise<Venue> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Venue with id ${id} not found`);
    }
    return updated;
  }

  async upsert(venue: Partial<Venue>): Promise<Venue> {
    // For now, simple create - can be enhanced with conflict resolution
    return this.create(venue);
  }

  /**
   * Apply overrides to venue at read time
   */
  applyOverrides(venue: Venue, overrides?: VenueOverrides): Venue {
    if (!overrides) {
      return venue;
    }

    return {
      ...venue,
      name: overrides.nameOverride || venue.name,
      address: overrides.addressOverride || venue.address,
      location: overrides.pinOverride || venue.location,
      categories: overrides.categoryOverrides || venue.categories,
      status: overrides.hidden ? 'hidden' : venue.status,
    };
  }
}
