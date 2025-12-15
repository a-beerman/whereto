import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City, Venue, VenueSource, VenueOverrides, VenuePartner, UserSavedVenue } from './entities';
import { CityRepository } from './repositories/city.repository';
import { VenueRepository } from './repositories/venue.repository';
import { CitiesService } from './services/cities.service';
import { VenuesService } from './services/venues.service';
import { CitiesController } from './controllers/cities.controller';
import { VenuesController } from './controllers/venues.controller';

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
  controllers: [CitiesController, VenuesController],
  providers: [CityRepository, VenueRepository, CitiesService, VenuesService],
  exports: [CityRepository, VenueRepository, CitiesService, VenuesService],
})
export class CatalogModule {}
