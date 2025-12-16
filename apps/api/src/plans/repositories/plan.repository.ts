import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../entities/plan.entity';

@Injectable()
export class PlanRepository {
  constructor(
    @InjectRepository(Plan)
    private readonly repository: Repository<Plan>,
  ) {}

  async findById(id: string): Promise<Plan | null> {
    return this.repository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.participants', 'participants')
      .leftJoinAndSelect('plan.votes', 'votes')
      .leftJoinAndSelect('plan.winningVenue', 'winningVenue')
      .where('plan.id = :id', { id })
      .getOne();
  }

  async findByTelegramChatId(chatId: number): Promise<Plan[]> {
    return this.repository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.participants', 'participants')
      .leftJoinAndSelect('plan.votes', 'votes')
      .leftJoinAndSelect('plan.winningVenue', 'winningVenue')
      .where('plan.telegram_chat_id = :chatId', { chatId })
      .orderBy('plan.created_at', 'DESC')
      .getMany();
  }

  async create(plan: Partial<Plan>): Promise<Plan> {
    const newPlan = this.repository.create(plan);
    return this.repository.save(newPlan);
  }

  async update(id: string, updates: Partial<Plan>): Promise<Plan> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Plan with id ${id} not found`);
    }
    return updated;
  }

  async close(id: string, winningVenueId: string): Promise<Plan> {
    return this.update(id, {
      status: 'closed',
      winningVenueId,
    });
  }
}
