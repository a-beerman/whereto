import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote } from '../entities/vote.entity';

@Injectable()
export class VoteRepository {
  constructor(
    @InjectRepository(Vote)
    private readonly repository: Repository<Vote>,
  ) {}

  async findByPlanId(planId: string): Promise<Vote | null> {
    return this.repository.findOne({
      where: { planId },
      relations: ['voteCasts', 'voteCasts.venue', 'winnerVenue'],
      order: { startedAt: 'DESC' },
    });
  }

  async findActiveByPlanId(planId: string): Promise<Vote | null> {
    return this.repository.findOne({
      where: { planId, status: 'open' },
      relations: ['voteCasts', 'voteCasts.venue', 'voteCasts.userId'],
    });
  }

  async create(vote: Partial<Vote>): Promise<Vote> {
    const newVote = this.repository.create(vote);
    return this.repository.save(newVote);
  }

  async close(id: string, winnerVenueId: string): Promise<Vote> {
    await this.repository.update(id, {
      status: 'closed',
      endedAt: new Date(),
      winnerVenueId,
    });
    const updated = await this.repository.findOne({ where: { id }, relations: ['winnerVenue'] });
    if (!updated) {
      throw new Error(`Vote with id ${id} not found`);
    }
    return updated;
  }
}
