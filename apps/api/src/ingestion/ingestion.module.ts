import { Module } from '@nestjs/common';
import { GooglePlacesService } from './services/google-places.service';
import { NormalizationService } from './services/normalization.service';
import { DeduplicationService } from './services/deduplication.service';
import { SyncCityJob } from './jobs/sync-city.job';
import { CatalogModule } from '../catalog/catalog.module';
import { IngestionController } from './controllers/ingestion.controller';

@Module({
  imports: [CatalogModule],
  controllers: [IngestionController],
  providers: [GooglePlacesService, NormalizationService, DeduplicationService, SyncCityJob],
  exports: [SyncCityJob],
})
export class IngestionModule {}
