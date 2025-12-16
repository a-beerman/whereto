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
    return this.repository
      .createQueryBuilder('vote_cast')
      .where('vote_cast.vote_id = :voteId', { voteId })
      .orderBy('vote_cast.cast_at', 'DESC')
      .getMany();
  }

  async findByVoteIdAndUserId(voteId: string, userId: string): Promise<VoteCast | null> {
    return this.repository
      .createQueryBuilder('vote_cast')
      .where('vote_cast.vote_id = :voteId', { voteId })
      .andWhere('vote_cast.user_id = :userId', { userId })
      .getOne();
  }

  async findByVoteIdAndUserIdAll(voteId: string, userId: string): Promise<VoteCast[]> {
    return this.repository
      .createQueryBuilder('vote_cast')
      .where('vote_cast.vote_id = :voteId', { voteId })
      .andWhere('vote_cast.user_id = :userId', { userId })
      .getMany();
  }

  async delete(voteId: string, userId: string, venueId: string): Promise<void> {
    await this.repository.delete({ voteId, userId, venueId });
  }

  async create(voteCast: Partial<VoteCast>): Promise<VoteCast> {
    const newVoteCast = this.repository.create(voteCast);
    return this.repository.save(newVoteCast);
  }

  async update(id: string, updates: Partial<VoteCast>): Promise<VoteCast> {
    await this.repository.update(id, updates);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`VoteCast with id ${id} not found`);
    }
    return updated;
  }

  async upsert(voteId: string, planId: string, userId: string, venueId: string): Promise<VoteCast> {
    // Check if this specific vote (voteId + userId + venueId) already exists
    const existing = await this.repository.findOne({
      where: { voteId, userId, venueId },
    });

    if (existing) {
      // Vote already exists, return it
      return existing;
    }

    // Create new vote cast (supports multiple choice - user can vote for multiple venues)
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
