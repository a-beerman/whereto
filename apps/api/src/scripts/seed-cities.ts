/**
 * Database seeding script for initial cities
 * Run with: npx tsx apps/api/src/scripts/seed-cities.ts
 *
 * Uses dotenv to load environment variables from .env file
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || process.env.DB_HOSTNAME || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1973',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'whereto_catalog',
    synchronize: false,
    logging: ['error', 'warn'],
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const queryRunner = dataSource.createQueryRunner();

    // Check if cities already exist
    const existingCities = await queryRunner.query('SELECT COUNT(*) as count FROM cities');
    const count = parseInt(existingCities[0].count, 10);
    if (count > 0) {
      console.log(`Found ${count} existing cities. Skipping seed.`);
      await dataSource.destroy();
      return;
    }

    // Seed initial cities using raw SQL
    await queryRunner.query(`
      INSERT INTO cities (name, country_code, center_lat, center_lng, bounds, timezone, is_active)
      VALUES (
        'Chișinău',
        'MD',
        47.0104,
        28.8638,
        '{"minLat": 46.9, "minLng": 28.7, "maxLat": 47.1, "maxLng": 29.0}'::jsonb,
        'Europe/Chisinau',
        true
      )
    `);

    console.log('✅ Seeded 1 city (Chișinău)');

    await dataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding cities:', error);
    process.exit(1);
  }
}

seed();
