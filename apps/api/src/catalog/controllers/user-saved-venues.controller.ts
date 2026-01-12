import { Controller, Get, Post, Delete, Param, Body, Query, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiHeader,
  ApiExtraModels,
} from '@nestjs/swagger';
import { VenueResponse } from '../dto/venue-response';
import { UserSavedVenuesService } from '../services/user-saved-venues.service';
import { SaveVenue } from '../dto/save-venue';
import { MetricsService } from '../../common/services/metrics.service';
import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginatedResponse, Meta } from '../../common/dto/response';
import {
  GetSavedVenuesResponse,
  SaveVenueResponse,
  RemoveSavedVenueResponse,
} from '../dto/user-saved-venues-responses';

// TODO: Implement Telegram auth guard
// For now, we'll use a simple user ID from headers/query
class PaginationDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

@ApiTags('catalog')
@ApiExtraModels(
  VenueResponse,
  PaginatedResponse,
  Meta,
  GetSavedVenuesResponse,
  SaveVenueResponse,
  RemoveSavedVenueResponse,
)
@Controller('me/saved')
export class UserSavedVenuesController {
  constructor(
    private readonly savedVenuesService: UserSavedVenuesService,
    private readonly metricsService: MetricsService,
  ) {}

  // TODO: Extract user ID from Telegram auth token
  private getUserId(req: Request): string {
    // For now, use a header or query param
    // In production, extract from Telegram initData
    const headers = req.headers as unknown as Record<string, string | string[] | undefined>;
    const userId = headers['x-user-id'];
    if (Array.isArray(userId)) {
      return userId[0] || 'default-user-id';
    }
    return userId || 'default-user-id';
  }

  @Get()
  @ApiOperation({ summary: 'Get user saved venues', operationId: 'UserSavedVenues_getSavedVenues' })
  @ApiHeader({ name: 'X-User-Id', description: 'User ID from Telegram', required: false })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @ApiOkResponse({
    description: 'List of saved venues',
    type: GetSavedVenuesResponse,
  })
  async getSavedVenues(@Request() req: Request, @Query() query: PaginationDto) {
    const userId = this.getUserId(req);
    return this.savedVenuesService.getSavedVenues(userId, query.limit || 20, query.offset || 0);
  }

  @Post()
  @ApiOperation({ summary: 'Save a venue for user', operationId: 'UserSavedVenues_saveVenue' })
  @ApiHeader({ name: 'X-User-Id', description: 'User ID from Telegram', required: false })
  @ApiBody({ type: SaveVenue })
  @ApiOkResponse({
    description: 'Venue saved successfully',
    type: SaveVenueResponse,
  })
  async saveVenue(@Request() req: Request, @Body() dto: SaveVenue) {
    const userId = this.getUserId(req);
    await this.savedVenuesService.saveVenue(userId, dto.venueId);

    // Track save_place event
    this.metricsService.trackProductEvent({
      event: 'save_place',
      userId,
      venueId: dto.venueId,
      timestamp: new Date(),
    });

    return { message: 'Venue saved successfully' };
  }

  @Delete(':venueId')
  @ApiOperation({ summary: 'Remove saved venue', operationId: 'UserSavedVenues_removeSavedVenue' })
  @ApiHeader({ name: 'X-User-Id', description: 'User ID from Telegram', required: false })
  @ApiParam({ name: 'venueId', description: 'Venue ID (UUID)' })
  @ApiOkResponse({
    description: 'Venue removed successfully',
    type: RemoveSavedVenueResponse,
  })
  async removeSavedVenue(@Request() req: Request, @Param('venueId') venueId: string) {
    const userId = this.getUserId(req);
    return this.savedVenuesService.removeSavedVenue(userId, venueId);
  }
}
