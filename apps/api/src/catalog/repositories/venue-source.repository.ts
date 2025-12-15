import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VenueSource } from '../entities/venue-source.entity';

@Injectable()
export class VenueSourceRepository {
  constructor(
    @InjectRepository(VenueSource)
    private readonly repository: Repository<VenueSource>,
  ) {}

  async findBySourceAndExternalId(source: string, externalId: string): Promise<VenueSource | null> {
    return this.repository.findOne({
      where: { source, externalId },
      relations: ['venue'],
    });
  }

  async findByVenueId(venueId: string): Promise<VenueSource[]> {
    return this.repository.find({
      where: { venueId },
    });
  }

  async create(venueSource: Partial<VenueSource>): Promise<VenueSource> {
    const newSource = this.repository.create(venueSource);
    return this.repository.save(newSource);
  }

  async update(id: string, updates: Partial<VenueSource>): Promise<VenueSource> {
    await this.repository.update(id, updates);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`VenueSource with id ${id} not found`);
    }
    return updated;
  }

  async upsert(
    venueId: string,
    source: string,
    externalId: string,
    data: Partial<VenueSource>,
  ): Promise<VenueSource> {
    const existing = await this.findBySourceAndExternalId(source, externalId);
    if (existing) {
      return this.update(existing.id, { ...data, lastSyncedAt: new Date() });
    }
    return this.create({ venueId, source, externalId, ...data, lastSyncedAt: new Date() });
  }
}
