import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingRequest } from './entities/booking-request.entity';
import { VenuePartner } from '../catalog/entities/venue-partner.entity';
import { BookingRequestRepository } from './repositories/booking-request.repository';
import { VenuePartnerRepository } from './repositories/venue-partner.repository';
import { BookingRequestService } from './services/booking-request.service';
import { MerchantStatsService } from './services/merchant-stats.service';
import { MerchantController } from './controllers/merchant.controller';
import { MerchantAuthGuard } from './guards/merchant-auth.guard';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingRequest, VenuePartner]),
    CatalogModule, // Import CatalogModule to access VenueRepository if needed
  ],
  controllers: [MerchantController],
  providers: [
    BookingRequestRepository,
    VenuePartnerRepository,
    BookingRequestService,
    MerchantStatsService,
    MerchantAuthGuard,
  ],
  exports: [BookingRequestService, BookingRequestRepository, VenuePartnerRepository],
})
export class MerchantModule {}
