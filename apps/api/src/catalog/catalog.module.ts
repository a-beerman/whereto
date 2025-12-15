import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City, Venue, VenueSource, VenueOverrides, VenuePartner, UserSavedVenue } from './entities';
import { CityRepository } from './repositories/city.repository';
import { VenueRepository } from './repositories/venue.repository';
import { UserSavedVenueRepository } from './repositories/user-saved-venue.repository';
import { CitiesService } from './services/cities.service';
import { VenuesService } from './services/venues.service';
import { UserSavedVenuesService } from './services/user-saved-venues.service';
import { CitiesController } from './controllers/cities.controller';
import { VenuesController } from './controllers/venues.controller';
import { UserSavedVenuesController } from './controllers/user-saved-venues.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      City,
      Venue,
      VenueSource,
      VenueOverrides,
      VenuePartner,
      UserSavedVenue,
    ]),
  ],
  controllers: [CitiesController, VenuesController, UserSavedVenuesController],
  providers: [
    CityRepository,
    VenueRepository,
    UserSavedVenueRepository,
    CitiesService,
    VenuesService,
    UserSavedVenuesService,
  ],
  exports: [
    CityRepository,
    VenueRepository,
    UserSavedVenueRepository,
    CitiesService,
    VenuesService,
    UserSavedVenuesService,
  ],
})
export class CatalogModule {}
