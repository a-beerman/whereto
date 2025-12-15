import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoteCast } from '../entities/vote-cast.entity';

@Injectable()
export class VoteCastRepository {
  constructor(
    @InjectRepository(VoteCast)
    private readonly repository: Repository<VoteCast>,
  ) {}

  async findByVoteId(voteId: string): Promise<VoteCast[]> {
    return this.repository.find({
      where: { voteId },
      relations: ['venue'],
      order: { castAt: 'DESC' },
    });
  }

  async findByVoteIdAndUserId(voteId: string, userId: string): Promise<VoteCast | null> {
    return this.repository.findOne({
      where: { voteId, userId },
      relations: ['venue'],
    });
  }

  async create(voteCast: Partial<VoteCast>): Promise<VoteCast> {
    const newVoteCast = this.repository.create(voteCast);
    return this.repository.save(newVoteCast);
  }

  async update(id: string, updates: Partial<VoteCast>): Promise<VoteCast> {
    await this.repository.update(id, updates);
    const updated = await this.repository.findOne({ where: { id }, relations: ['venue'] });
    if (!updated) {
      throw new Error(`VoteCast with id ${id} not found`);
    }
    return updated;
  }

  async upsert(voteId: string, planId: string, userId: string, venueId: string): Promise<VoteCast> {
    const existing = await this.findByVoteIdAndUserId(voteId, userId);
    if (existing) {
      return this.update(existing.id, { venueId });
    }
    return this.create({ voteId, planId, userId, venueId });
  }

  async getVoteCounts(voteId: string): Promise<Map<string, number>> {
    const voteCasts = await this.findByVoteId(voteId);
    const counts = new Map<string, number>();

    for (const cast of voteCasts) {
      const current = counts.get(cast.venueId) || 0;
      counts.set(cast.venueId, current + 1);
    }

    return counts;
  }
}
