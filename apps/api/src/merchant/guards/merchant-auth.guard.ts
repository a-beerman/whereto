import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { VenuePartnerRepository } from '../repositories/venue-partner.repository';

@Injectable()
export class MerchantAuthGuard implements CanActivate {
  constructor(private readonly venuePartnerRepository: VenuePartnerRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const merchantUserId = request.headers['x-merchant-user-id'] as string;

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
