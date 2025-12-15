import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from '../entities/city.entity';

@Injectable()
export class CityRepository {
  constructor(
    @InjectRepository(City)
    private readonly repository: Repository<City>,
  ) {}

  async findAll(): Promise<City[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<City | null> {
    return this.repository.findOne({
      where: { id, isActive: true },
    });
  }

  async create(city: Partial<City>): Promise<City> {
    const newCity = this.repository.create(city);
    return this.repository.save(newCity);
  }

  async update(id: string, updates: Partial<City>): Promise<City> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`City with id ${id} not found`);
    }
    return updated;
  }
}
