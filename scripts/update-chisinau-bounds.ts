#!/usr/bin/env tsx

/**
 * Script to update Chisinau city bounds
 * Run with: npx tsx scripts/update-chisinau-bounds.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

async function updateBounds() {
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
    console.log('✅ Database connection established\n');

    const queryRunner = dataSource.createQueryRunner();

    // Chisinau bounds (more accurate)
    // Approximate bounds covering the entire city area
    const bounds = {
      minLat: 46.95, // South
      minLng: 28.75, // West
      maxLat: 47.08, // North
      maxLng: 28.95, // East
    };

    console.log('📍 Updating Chisinau bounds:');
    console.log(`   South: ${bounds.minLat}`);
    console.log(`   West: ${bounds.minLng}`);
    console.log(`   North: ${bounds.maxLat}`);
    console.log(`   East: ${bounds.maxLng}\n`);

    // Update bounds for Chisinau (try different name variations)
    const result = await queryRunner.query(
      `
      UPDATE cities 
      SET bounds = $1::jsonb
      WHERE name ILIKE '%chisinau%' 
         OR name ILIKE '%chișinău%' 
         OR name ILIKE '%kishinev%'
         OR (country_code = 'MD' AND name ILIKE '%chi%')
      RETURNING id, name, country_code
    `,
      [JSON.stringify(bounds)],
    );

    if (result.length === 0) {
      console.log('⚠️  Chisinau city not found. Creating it...\n');

      // Create city if not exists
      await queryRunner.query(
        `
        INSERT INTO cities (name, country_code, center_lat, center_lng, bounds, timezone, is_active)
        VALUES (
          'Chișinău',
          'MD',
          47.0104,
          28.8638,
          $1::jsonb,
          'Europe/Chisinau',
          true
        )
      `,
        [JSON.stringify(bounds)],
      );

      console.log('✅ Created Chisinau city with bounds\n');
    } else {
      console.log(`✅ Updated bounds for: ${result[0].name} (${result[0].id})\n`);
    }

    // Verify update
    const city = await queryRunner.query(
      `
      SELECT id, name, country_code, bounds, center_lat, center_lng
      FROM cities
      WHERE name ILIKE '%chisinau%' 
         OR name ILIKE '%chișinău%' 
         OR name ILIKE '%kishinev%'
         OR (country_code = 'MD' AND name ILIKE '%chi%')
      LIMIT 1
    `,
    );

    if (city.length > 0) {
      console.log('📊 City data:');
      console.log(`   ID: ${city[0].id}`);
      console.log(`   Name: ${city[0].name}`);
      console.log(`   Country: ${city[0].country_code}`);
      console.log(`   Center: ${city[0].center_lat}, ${city[0].center_lng}`);
      console.log(`   Bounds: ${JSON.stringify(city[0].bounds, null, 2)}\n`);
    }

    await dataSource.destroy();
    console.log('✅ Database connection closed\n');
    console.log('🎉 Bounds updated successfully!');
    console.log('💡 You can now run: npm run sync:chisinau\n');
  } catch (error) {
    console.error('❌ Error updating bounds:', error);
    process.exit(1);
  }
}

updateBounds();
