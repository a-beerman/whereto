import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserSavedVenuesService } from '../services/user-saved-venues.service';
import { SaveVenueDto } from '../dto/save-venue.dto';
import { MetricsService } from '../../common/services/metrics.service';
import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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
    return (req.headers['x-user-id'] as string) || 'default-user-id';
  }

  @Get()
  async getSavedVenues(@Request() req: Request, @Query() query: PaginationDto) {
    const userId = this.getUserId(req);
    return this.savedVenuesService.getSavedVenues(userId, query.limit || 20, query.offset || 0);
  }

  @Post()
  async saveVenue(@Request() req: Request, @Body() dto: SaveVenueDto) {
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
  async removeSavedVenue(@Request() req: Request, @Param('venueId') venueId: string) {
    const userId = this.getUserId(req);
    return this.savedVenuesService.removeSavedVenue(userId, venueId);
  }
}
