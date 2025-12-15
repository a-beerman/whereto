import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { VenuesService } from '../services/venues.service';
import { VenueFiltersDto } from '../dto/venue-filters.dto';
import { VenueResponseDto } from '../dto/venue-response.dto';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  async findAll(@Query() filters: VenueFiltersDto): Promise<{
    data: VenueResponseDto[];
    meta: {
      total: number;
      limit: number;
      offset: number;
      nextCursor?: string;
    };
  }> {
    const result = await this.venuesService.search(filters);
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
  async findOne(@Param('id') id: string): Promise<{ data: VenueResponseDto }> {
    const venue = await this.venuesService.findById(id);
    if (!venue) {
      throw new NotFoundException(`Venue with id ${id} not found`);
    }
    return { data: venue };
  }
}
