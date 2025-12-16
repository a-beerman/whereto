import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingRequest } from '../entities/booking-request.entity';

export interface BookingRequestFilters {
  merchantUserId?: string;
  venueId?: string;
  status?: 'pending' | 'confirmed' | 'rejected' | 'proposed' | 'cancelled';
  limit?: number;
  offset?: number;
}

@Injectable()
export class BookingRequestRepository {
  constructor(
    @InjectRepository(BookingRequest)
    private readonly repository: Repository<BookingRequest>,
  ) {}

  async findById(id: string): Promise<BookingRequest | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['plan', 'venue'],
    });
  }

  async findByMerchant(
    merchantUserId: string,
    filters: BookingRequestFilters = {},
  ): Promise<{ requests: BookingRequest[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('br')
      .leftJoinAndSelect('br.plan', 'plan')
      .leftJoinAndSelect('br.venue', 'venue')
      .leftJoin('venue.partners', 'partner')
      .where('partner.merchantUserId = :merchantUserId', { merchantUserId })
      .andWhere('partner.isActive = :isActive', { isActive: true });

    if (filters.status) {
      queryBuilder.andWhere('br.status = :status', { status: filters.status });
    }

    if (filters.venueId) {
      queryBuilder.andWhere('br.venueId = :venueId', { venueId: filters.venueId });
    }

    const total = await queryBuilder.getCount();

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    queryBuilder.take(limit).skip(offset).orderBy('br.createdAt', 'DESC');

    const requests = await queryBuilder.getMany();

    return { requests, total };
  }

  async findByVenue(venueId: string): Promise<BookingRequest[]> {
    return this.repository.find({
      where: { venueId },
      relations: ['plan', 'venue'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByPlan(planId: string): Promise<BookingRequest[]> {
    return this.repository.find({
      where: { planId },
      relations: ['venue'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<BookingRequest>): Promise<BookingRequest> {
    const bookingRequest = this.repository.create(data);
    return this.repository.save(bookingRequest);
  }

  async update(id: string, updates: Partial<BookingRequest>): Promise<BookingRequest> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Booking request ${id} not found after update`);
    }
    return updated;
  }

  async countByStatus(merchantUserId: string, status: string): Promise<number> {
    return this.repository
      .createQueryBuilder('br')
      .leftJoin('br.venue', 'venue')
      .leftJoin('venue.partners', 'partner')
      .where('partner.merchantUserId = :merchantUserId', { merchantUserId })
      .andWhere('partner.isActive = :isActive', { isActive: true })
      .andWhere('br.status = :status', { status })
      .getCount();
  }
}
