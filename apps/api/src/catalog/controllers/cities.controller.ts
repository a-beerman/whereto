import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CitiesService } from '../services/cities.service';

@ApiTags('catalog')
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List available cities' })
  @ApiOkResponse({
    description: 'List of cities',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              countryCode: { type: 'string' },
              center: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
              },
              timezone: { type: 'string' },
              isActive: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  async findAll() {
    const cities = await this.citiesService.findAll();
    return { data: cities };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get city details by ID' })
  @ApiParam({ name: 'id', description: 'City ID (UUID)' })
  @ApiOkResponse({
    description: 'City details',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            countryCode: { type: 'string' },
            center: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
            },
            timezone: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'City not found' })
  async findOne(@Param('id') id: string) {
    const city = await this.citiesService.findById(id);
    if (!city) {
      throw new NotFoundException(`City with id ${id} not found`);
    }
    return { data: city };
  }
}
