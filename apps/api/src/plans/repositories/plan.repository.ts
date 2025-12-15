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
    return this.repository.findOne({
      where: { id },
      relations: ['participants', 'votes', 'winningVenue'],
    });
  }

  async findByTelegramChatId(chatId: number): Promise<Plan[]> {
    return this.repository.find({
      where: { telegramChatId: chatId },
      relations: ['participants', 'votes', 'winningVenue'],
      order: { createdAt: 'DESC' },
    });
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
