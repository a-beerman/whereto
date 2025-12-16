/**
 * Database seeding script for initial cities
 * Run with: npx ts-node apps/api/src/scripts/seed-cities.ts
 *
 * Uses dotenv to load environment variables from .env file
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Simple City entity definition for seeding (avoids importing full entity with dependencies)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cities')
class CityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'char', length: 2 })
  countryCode!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  centerLat!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  centerLng!: number;

  @Column({ type: 'jsonb', nullable: true })
  bounds?: any;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || process.env.DB_HOSTNAME || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1973',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'whereto_catalog',
    entities: [CityEntity],
    synchronize: true, // Create table if it doesn't exist (for seeding)
    logging: ['error', 'warn'],
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const cityRepository = dataSource.getRepository(CityEntity);

    // Check if cities already exist
    const existingCities = await cityRepository.count();
    if (existingCities > 0) {
      console.log(`Found ${existingCities} existing cities. Skipping seed.`);
      await dataSource.destroy();
      return;
    }

    // Seed initial cities
    const cities = [
      {
        name: 'Chișinău',
        countryCode: 'MD',
        centerLat: 47.0104,
        centerLng: 28.8638,
        bounds: {
          minLat: 46.9,
          minLng: 28.7,
          maxLat: 47.1,
          maxLng: 29.0,
        },
        timezone: 'Europe/Chisinau',
        isActive: true,
      },
      // Add more cities as needed
    ];

    const savedCities = await cityRepository.save(cities);
    console.log(`✅ Seeded ${savedCities.length} cities`);

    await dataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding cities:', error);
    process.exit(1);
  }
}

seed();
