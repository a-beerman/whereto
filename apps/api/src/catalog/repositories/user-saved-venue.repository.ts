import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSavedVenue } from '../entities/user-saved-venue.entity';

@Injectable()
export class UserSavedVenueRepository {
  constructor(
    @InjectRepository(UserSavedVenue)
    private readonly repository: Repository<UserSavedVenue>,
  ) {}

  async findByUserId(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ items: UserSavedVenue[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { userId },
      relations: ['venue', 'venue.city'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { items, total };
  }

  async save(userId: string, venueId: string): Promise<UserSavedVenue> {
    const existing = await this.repository.findOne({
      where: { userId, venueId },
    });

    if (existing) {
      return existing;
    }

    const saved = this.repository.create({ userId, venueId });
    return this.repository.save(saved);
  }

  async remove(userId: string, venueId: string): Promise<boolean> {
    const result = await this.repository.delete({ userId, venueId });
    return (result.affected || 0) > 0;
  }

  async isSaved(userId: string, venueId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { userId, venueId },
    });
    return count > 0;
  }
}
