import { Controller, Get, Param, Query, NotFoundException, Req, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
  ApiHeader,
} from '@nestjs/swagger';
import { VenuesService } from '../services/venues.service';
import { VenueFilters } from '../dto/venue-filters';
import { VenueResponse } from '../dto/venue-response';
import { MetricsService } from '../../common/services/metrics.service';
import { ItemResponse, PaginatedResponse, Meta } from '../../common/dto/response';
import { VenuesResponse, VenueDetailsResponse } from '../dto/catalog-responses';

@ApiTags('catalog')
@ApiExtraModels(
  VenueResponse,
  ItemResponse,
  PaginatedResponse,
  Meta,
  VenuesResponse,
  VenueDetailsResponse,
)
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
    type: VenuesResponse,
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
    @Query() filters: VenueFilters,
    @Req() req: Request,
  ): Promise<{
    data: VenueResponse[];
    meta: {
      total: number;
      limit: number;
      offset: number;
      nextCursor?: string;
    };
  }> {
    // Convert DTO to service filters interface
    const serviceFilters: VenueFilters = {
      cityId: filters.cityId,
      q: filters.q,
      category: filters.category,
      lat: filters.lat,
      lng: filters.lng,
      radiusMeters: filters.radiusMeters,
      bbox: filters.bbox,
      minRating: filters.minRating,
      openNow: filters.openNow,
      limit: filters.limit,
      offset: filters.offset,
      cursor: filters.cursor,
      sort: filters.sort,
    };
    const result = await this.venuesService.search(serviceFilters);

    // Track search event
    const headers = req.headers as unknown as Record<string, string | string[] | undefined>;
    const userIdHeader = headers['x-user-id'];
    const userId = userIdHeader
      ? Array.isArray(userIdHeader)
        ? userIdHeader[0]
        : userIdHeader
      : undefined;

    this.metricsService.trackProductEvent({
      event: 'search',
      userId,
      cityId: filters.cityId ?? undefined,
      query: filters.q ?? undefined,
      category: filters.category ?? undefined,
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
    type: VenueDetailsResponse,
  })
  @ApiNotFoundResponse({ description: 'Venue not found' })
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<{ data: VenueResponse }> {
    const venue = await this.venuesService.findById(id);
    if (!venue) {
      throw new NotFoundException(`Venue with id ${id} not found`);
    }

    // Track open_place event
    const headers = req.headers as unknown as Record<string, string | string[] | undefined>;
    const userIdHeader = headers['x-user-id'];
    const userId = userIdHeader
      ? Array.isArray(userIdHeader)
        ? userIdHeader[0]
        : userIdHeader
      : undefined;

    this.metricsService.trackProductEvent({
      event: 'open_place',
      userId,
      venueId: id,
      cityId: venue.cityId,
      timestamp: new Date(),
    });

    return { data: venue };
  }
}
