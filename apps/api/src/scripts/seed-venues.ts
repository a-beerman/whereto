/**
 * Database seeding script for sample venues
 * Run with: npx ts-node apps/api/src/scripts/seed-venues.ts
 *
 * Requires: Cities to be seeded first (run seed-cities.ts)
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createCoordinates } from '../catalog/types/coordinates.type';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Simple entity definitions for seeding
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
}

@Entity('venues')
class VenueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  cityId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'point', nullable: true })
  location!: string; // Stored as PostgreSQL POINT format "(lng,lat)"

  @Column({ type: 'jsonb', nullable: true })
  categories?: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating?: number;

  @Column({ type: 'int', nullable: true })
  ratingCount?: number;

  @Column({ type: 'jsonb', nullable: true })
  photoRefs?: string[];

  @Column({ type: 'jsonb', nullable: true })
  hours?: unknown;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

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
    entities: [CityEntity, VenueEntity],
    synchronize: false,
    logging: ['error', 'warn'],
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const cityRepository = dataSource.getRepository(CityEntity);
    const venueRepository = dataSource.getRepository(VenueEntity);

    // Get Chișinău city
    const chisinau = await cityRepository.findOne({ where: { name: 'Chișinău' } });
    if (!chisinau) {
      console.error('❌ City "Chișinău" not found. Please run seed-cities.ts first.');
      await dataSource.destroy();
      process.exit(1);
    }

    // Check if venues already exist
    const existingVenues = await venueRepository.count({ where: { cityId: chisinau.id } });
    if (existingVenues > 0) {
      console.log(`Found ${existingVenues} existing venues. Skipping seed.`);
      await dataSource.destroy();
      return;
    }

    // Sample venues in Chișinău
    const venues = [
      {
        cityId: chisinau.id,
        name: 'La Plăcinte',
        address: 'Strada Mitropolit Varlaam 77, Chișinău',
        location: createCoordinates(47.0104, 28.8638), // Center of Chișinău
        categories: ['restaurant', 'moldovan'],
        rating: 4.5,
        ratingCount: 1200,
        photoRefs: [],
        hours: {
          periods: [
            { open: { day: 0, time: '0900' }, close: { day: 0, time: '2200' } },
            { open: { day: 1, time: '0900' }, close: { day: 1, time: '2200' } },
            { open: { day: 2, time: '0900' }, close: { day: 2, time: '2200' } },
            { open: { day: 3, time: '0900' }, close: { day: 3, time: '2200' } },
            { open: { day: 4, time: '0900' }, close: { day: 4, time: '2200' } },
            { open: { day: 5, time: '0900' }, close: { day: 5, time: '2200' } },
            { open: { day: 6, time: '0900' }, close: { day: 6, time: '2200' } },
          ],
        },
        status: 'active',
      },
      {
        cityId: chisinau.id,
        name: 'Propaganda Cafe',
        address: 'Bulevardul Ștefan cel Mare și Sfânt 123, Chișinău',
        location: createCoordinates(47.015, 28.857),
        categories: ['cafe', 'restaurant'],
        rating: 4.7,
        ratingCount: 850,
        photoRefs: [],
        hours: {
          periods: [
            { open: { day: 0, time: '0800' }, close: { day: 0, time: '2300' } },
            { open: { day: 1, time: '0800' }, close: { day: 1, time: '2300' } },
            { open: { day: 2, time: '0800' }, close: { day: 2, time: '2300' } },
            { open: { day: 3, time: '0800' }, close: { day: 3, time: '2300' } },
            { open: { day: 4, time: '0800' }, close: { day: 4, time: '2300' } },
            { open: { day: 5, time: '0800' }, close: { day: 5, time: '2300' } },
            { open: { day: 6, time: '0800' }, close: { day: 6, time: '2300' } },
          ],
        },
        status: 'active',
      },
      {
        cityId: chisinau.id,
        name: 'Carpe Diem',
        address: 'Strada 31 August 1989 127, Chișinău',
        location: createCoordinates(47.012, 28.86),
        categories: ['restaurant', 'bar'],
        rating: 4.3,
        ratingCount: 650,
        photoRefs: [],
        hours: {
          periods: [
            { open: { day: 0, time: '1200' }, close: { day: 0, time: '0100' } },
            { open: { day: 1, time: '1200' }, close: { day: 1, time: '0100' } },
            { open: { day: 2, time: '1200' }, close: { day: 2, time: '0100' } },
            { open: { day: 3, time: '1200' }, close: { day: 3, time: '0100' } },
            { open: { day: 4, time: '1200' }, close: { day: 4, time: '0100' } },
            { open: { day: 5, time: '1200' }, close: { day: 5, time: '0100' } },
            { open: { day: 6, time: '1200' }, close: { day: 6, time: '0100' } },
          ],
        },
        status: 'active',
      },
    ];

    // Convert Coordinates to PostgreSQL POINT format "(lng,lat)"
    const venuesToSave = venues.map((venue) => {
      const coords = venue.location;
      const pointString = `(${coords.coordinates[0]},${coords.coordinates[1]})`;
      return {
        ...venue,
        location: pointString,
      };
    });

    const savedVenues = await venueRepository.save(venuesToSave);
    console.log(`✅ Seeded ${savedVenues.length} venues`);

    await dataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding venues:', error);
    process.exit(1);
  }
}

void seed();
