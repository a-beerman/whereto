import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { SyncCityJob } from '../jobs/sync-city.job';

// TODO: Add authentication guard for admin/operator access
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly syncCityJob: SyncCityJob) {}

  @Post('sync/:cityId')
  async syncCity(@Param('cityId') cityId: string) {
    const metrics = await this.syncCityJob.syncCity(cityId);
    return {
      data: {
        success: true,
        metrics,
      },
    };
  }
}
