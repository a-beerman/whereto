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
    return this.repository
      .createQueryBuilder('vote')
      .where('vote.plan_id = :planId', { planId })
      .orderBy('vote.started_at', 'DESC')
      .getOne();
  }

  async findActiveByPlanId(planId: string): Promise<Vote | null> {
    return this.repository
      .createQueryBuilder('vote')
      .where('vote.plan_id = :planId', { planId })
      .andWhere('vote.status = :status', { status: 'open' })
      .getOne();
  }

  async create(vote: Partial<Vote>): Promise<Vote> {
    const newVote = this.repository.create(vote);
    return this.repository.save(newVote);
  }

  async close(id: string, winnerVenueId: string): Promise<Vote> {
    await this.repository
      .createQueryBuilder()
      .update(Vote)
      .set({
        status: 'closed',
        endedAt: new Date(),
        winnerVenueId,
      })
      .where('id = :id', { id })
      .execute();
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`Vote with id ${id} not found`);
    }
    return updated;
  }
}
