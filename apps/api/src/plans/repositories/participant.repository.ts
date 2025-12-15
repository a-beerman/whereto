import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '../entities/participant.entity';

@Injectable()
export class ParticipantRepository {
  constructor(
    @InjectRepository(Participant)
    private readonly repository: Repository<Participant>,
  ) {}

  async findByPlanId(planId: string): Promise<Participant[]> {
    return this.repository.find({
      where: { planId },
      order: { joinedAt: 'ASC' },
    });
  }

  async findByPlanIdAndUserId(planId: string, userId: string): Promise<Participant | null> {
    return this.repository.findOne({
      where: { planId, userId },
    });
  }

  async create(participant: Partial<Participant>): Promise<Participant> {
    const newParticipant = this.repository.create(participant);
    return this.repository.save(newParticipant);
  }

  async update(id: string, updates: Partial<Participant>): Promise<Participant> {
    await this.repository.update(id, updates);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`Participant with id ${id} not found`);
    }
    return updated;
  }

  async upsert(planId: string, userId: string, data: Partial<Participant>): Promise<Participant> {
    const existing = await this.findByPlanIdAndUserId(planId, userId);
    if (existing) {
      return this.update(existing.id, data);
    }
    return this.create({ planId, userId, ...data });
  }
}
