import { Injectable } from '@nestjs/common';
import { CityRepository } from '../repositories/city.repository';

@Injectable()
export class CitiesService {
  constructor(private readonly cityRepository: CityRepository) {}

  async findAll() {
    return this.cityRepository.findAll();
  }

  async findById(id: string) {
    return this.cityRepository.findById(id);
  }
}
