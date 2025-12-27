import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SyncCityJob } from '../jobs/sync-city.job';

@ApiTags('ingestion')
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly syncCityJob: SyncCityJob) {}

  @Post('sync/:cityId')
  @ApiOperation({
    summary: 'Sync venues for a city from Google Places',
    operationId: 'Ingestion_syncCity',
  })
  @ApiParam({ name: 'cityId', description: 'City ID (UUID)' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'City sync completed',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            metrics: {
              type: 'object',
              properties: {
                duration: { type: 'number' },
                venuesProcessed: { type: 'number' },
                duplicates: { type: 'number' },
                errors: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async syncCity(@Param('cityId') cityId: string) {
    try {
      const metrics = await this.syncCityJob.syncCity(cityId);
      return {
        data: {
          success: true,
          metrics,
        },
      };
    } catch (error) {
      // Log the full error for debugging
      console.error('Sync error details:', error);
      throw error;
    }
  }
}
