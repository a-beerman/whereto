import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { VenuePartnerRepository } from '../repositories/venue-partner.repository';

@Injectable()
export class MerchantAuthGuard implements CanActivate {
  constructor(private readonly venuePartnerRepository: VenuePartnerRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { merchantUserId?: string }>();
    const headers = request.headers as unknown as Record<string, string | string[] | undefined>;
    const merchantUserId = Array.isArray(headers['x-merchant-user-id'])
      ? headers['x-merchant-user-id'][0]
      : headers['x-merchant-user-id'];

    if (!merchantUserId) {
      throw new UnauthorizedException('Merchant user ID is required');
    }

    // Verify merchant has at least one active venue
    const venues = await this.venuePartnerRepository.findByMerchantUserId(merchantUserId);
    if (venues.length === 0) {
      throw new UnauthorizedException('Merchant has no active venues');
    }

    // Attach merchantUserId to request for use in controllers
    request.merchantUserId = merchantUserId;

    return true;
  }
}
