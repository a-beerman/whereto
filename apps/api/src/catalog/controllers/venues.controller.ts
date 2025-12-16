import { Controller, Get, Param, Query, NotFoundException, Req } from '@nestjs/common';
import { VenuesService } from '../services/venues.service';
import { VenueFiltersDto } from '../dto/venue-filters.dto';
import { VenueResponseDto } from '../dto/venue-response.dto';
import { MetricsService } from '../../common/services/metrics.service';

@Controller('venues')
export class VenuesController {
  constructor(
    private readonly venuesService: VenuesService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  async findAll(
    @Query() filters: VenueFiltersDto,
    @Req() req: any,
  ): Promise<{
    data: VenueResponseDto[];
    meta: {
      total: number;
      limit: number;
      offset: number;
      nextCursor?: string;
    };
  }> {
    const result = await this.venuesService.search(filters);

    // Track search event
    this.metricsService.trackProductEvent({
      event: 'search',
      userId: req.headers['x-user-id'] as string,
      cityId: filters.cityId,
      query: filters.q,
      category: Array.isArray(filters.category) ? filters.category.join(',') : filters.category,
      resultCount: result.total,
      timestamp: new Date(),
    });

    return {
      data: result.venues,
      meta: {
        total: result.total,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        nextCursor: result.nextCursor,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any): Promise<{ data: VenueResponseDto }> {
    const venue = await this.venuesService.findById(id);
    if (!venue) {
      throw new NotFoundException(`Venue with id ${id} not found`);
    }

    // Track open_place event
    this.metricsService.trackProductEvent({
      event: 'open_place',
      userId: req.headers['x-user-id'] as string,
      venueId: id,
      cityId: venue.cityId,
      timestamp: new Date(),
    });

    return { data: venue };
  }
}
