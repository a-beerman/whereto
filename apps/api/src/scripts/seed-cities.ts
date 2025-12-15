/**
 * Database seeding script for initial cities
 * Run with: npx ts-node apps/api/src/scripts/seed-cities.ts
 */

import { DataSource } from 'typeorm';
import { City } from '../catalog/entities/city.entity';
import databaseConfig from '../config/database.config';

async function seed() {
  const config = databaseConfig();
  const dataSource = new DataSource({
    ...config,
    entities: [City],
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const cityRepository = dataSource.getRepository(City);

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
