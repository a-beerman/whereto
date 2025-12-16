import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VenuePartner } from '../../catalog/entities/venue-partner.entity';

@Injectable()
export class VenuePartnerRepository {
  constructor(
    @InjectRepository(VenuePartner)
    private readonly repository: Repository<VenuePartner>,
  ) {}

  async findByMerchantUserId(merchantUserId: string): Promise<VenuePartner[]> {
    return this.repository.find({
      where: { merchantUserId, isActive: true },
      relations: ['venue'],
    });
  }

  async findByVenueId(venueId: string): Promise<VenuePartner | null> {
    return this.repository.findOne({
      where: { venueId, isActive: true },
      relations: ['venue'],
    });
  }

  async hasAccess(merchantUserId: string, venueId: string): Promise<boolean> {
    const partner = await this.repository.findOne({
      where: { merchantUserId, venueId, isActive: true },
    });
    return !!partner;
  }
}
