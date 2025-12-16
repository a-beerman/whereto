import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Venue } from '../entities/venue.entity';
import { VenueOverrides } from '../entities/venue-overrides.entity';
import { calculateBoundingBox, haversineDistance } from '../../utils/geo';
import { extractLatLng } from '../types/coordinates.type';

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

    // Geo filter - bbox (using PostgreSQL POINT type)
    if (filters.bbox) {
      const [minLat, minLng, maxLat, maxLng] = filters.bbox.split(',').map(Number);
      // PostgreSQL native POINT format: (x, y) = (lng, lat)
      // Access coordinates using point[0] for lng (x) and point[1] for lat (y)
      queryBuilder.andWhere(
        'venue.location IS NOT NULL AND (venue.location)[0] BETWEEN :minLng AND :maxLng AND (venue.location)[1] BETWEEN :minLat AND :maxLat',
        { minLng, maxLng, minLat, maxLat },
      );
    }

    // Geo filter - radius (using PostgreSQL distance operator <@>)
    // PostgreSQL <@> operator calculates distance in degrees (1 degree ≈ 111km)
    // We'll do final filtering in service layer for accuracy
    if (filters.lat && filters.lng && filters.radiusMeters) {
      const bbox = calculateBoundingBox(filters.lat, filters.lng, filters.radiusMeters);
      // Pre-filter with bounding box using POINT coordinates
      // Access coordinates using point[0] for lng (x) and point[1] for lat (y)
      queryBuilder.andWhere(
        'venue.location IS NOT NULL AND (venue.location)[0] BETWEEN :minLng AND :maxLng AND (venue.location)[1] BETWEEN :minLat AND :maxLat',
        { minLng: bbox.minLng, maxLng: bbox.maxLng, minLat: bbox.minLat, maxLat: bbox.maxLat },
      );
    }

    // Rating filter
    if (filters.minRating) {
      queryBuilder.andWhere('venue.rating >= :minRating', { minRating: filters.minRating });
    }

    // Open now filter (if hours available)
    // Note: This is a simplified check - full implementation would require
    // parsing hours JSONB in SQL or filtering in application layer
    // For MVP, we'll filter in the service layer after fetching

    // Sorting
    // Note: Distance sorting will be done in service layer after calculating Haversine distances
    if (filters.sort === 'rating') {
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
