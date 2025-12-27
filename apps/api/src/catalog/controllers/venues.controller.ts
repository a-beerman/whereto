import { Controller, Get, Param, Query, NotFoundException, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
  ApiHeader,
  getSchemaPath,
} from '@nestjs/swagger';
import { VenuesService } from '../services/venues.service';
import { VenueFiltersDto } from '../dto/venue-filters.dto';
import { VenueResponseDto } from '../dto/venue-response.dto';
import { MetricsService } from '../../common/services/metrics.service';
import { ItemResponseDto, PaginatedResponseDto, MetaDto } from '../../common/dto/response.dto';

@ApiTags('catalog')
@ApiExtraModels(VenueResponseDto, ItemResponseDto, PaginatedResponseDto, MetaDto)
@Controller('venues')
export class VenuesController {
  constructor(
    private readonly venuesService: VenuesService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search and filter venues', operationId: 'Venues_findAll' })
  @ApiHeader({
    name: 'X-User-Id',
    description: 'Optional user ID for metrics attribution',
    required: false,
  })
  @ApiOkResponse({
    description: 'List of venues matching the search criteria',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(VenueResponseDto) },
            },
          },
        },
      ],
    },
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query (name, address)' })
  @ApiQuery({ name: 'cityId', required: false, description: 'Filter by city ID' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'lat', required: false, description: 'User latitude' })
  @ApiQuery({ name: 'lng', required: false, description: 'User longitude' })
  @ApiQuery({ name: 'radiusMeters', required: false, description: 'Search radius in meters' })
  @ApiQuery({ name: 'minRating', required: false, description: 'Minimum rating (0-5)' })
  @ApiQuery({
    name: 'openNow',
    required: false,
    description: 'Filter venues that are currently open',
  })
  @ApiQuery({
    name: 'bbox',
    required: false,
    description: 'Bounding box: "minLat,minLng,maxLat,maxLng"',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort order: "distance", "rating", "name"',
  })
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
      userId: ((req.headers as any)['x-user-id'] as string | string[] | undefined)
        ? Array.isArray((req.headers as any)['x-user-id'])
          ? (req.headers as any)['x-user-id'][0]
          : (req.headers as any)['x-user-id']
        : undefined,
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
  @ApiOperation({ summary: 'Get venue details by ID', operationId: 'Venues_findOne' })
  @ApiHeader({
    name: 'X-User-Id',
    description: 'Optional user ID for metrics attribution',
    required: false,
  })
  @ApiParam({ name: 'id', description: 'Venue ID (UUID)' })
  @ApiOkResponse({
    description: 'Venue details',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ItemResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(VenueResponseDto) },
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: 'Venue not found' })
  async findOne(@Param('id') id: string, @Req() req: any): Promise<{ data: VenueResponseDto }> {
    const venue = await this.venuesService.findById(id);
    if (!venue) {
      throw new NotFoundException(`Venue with id ${id} not found`);
    }

    // Track open_place event
    this.metricsService.trackProductEvent({
      event: 'open_place',
      userId: ((req.headers as any)['x-user-id'] as string | string[] | undefined)
        ? Array.isArray((req.headers as any)['x-user-id'])
          ? (req.headers as any)['x-user-id'][0]
          : (req.headers as any)['x-user-id']
        : undefined,
      venueId: id,
      cityId: venue.cityId,
      timestamp: new Date(),
    });

    return { data: venue };
  }
}
