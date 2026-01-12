import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { CitiesService } from '../services/cities.service';
import { CitiesResponse, CityResponse } from '../dto/catalog-responses';

@ApiTags('catalog')
@ApiExtraModels(CitiesResponse, CityResponse)
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List available cities', operationId: 'Cities_findAll' })
  @ApiOkResponse({
    description: 'List of cities',
    type: CitiesResponse,
  })
  async findAll() {
    const cities = await this.citiesService.findAll();
    return { data: cities };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get city details by ID', operationId: 'Cities_findOne' })
  @ApiParam({ name: 'id', description: 'City ID (UUID)' })
  @ApiOkResponse({
    description: 'City details',
    type: CityResponse,
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
