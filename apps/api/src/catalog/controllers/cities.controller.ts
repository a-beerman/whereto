import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CitiesService } from '../services/cities.service';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  async findAll() {
    const cities = await this.citiesService.findAll();
    return { data: cities };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const city = await this.citiesService.findById(id);
    if (!city) {
      throw new NotFoundException(`City with id ${id} not found`);
    }
    return { data: city };
  }
}
