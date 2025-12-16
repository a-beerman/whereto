/**
 * Drop all tables to reset database schema
 * Run with: npx tsx apps/api/src/scripts/drop-tables.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function dropTables() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || process.env.DB_HOSTNAME || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1973',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'whereto_catalog',
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const queryRunner = dataSource.createQueryRunner();

    console.log('Dropping existing tables...');
    await queryRunner.query('DROP TABLE IF EXISTS user_saved_venues CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS venue_partners CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS venue_overrides CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS venue_sources CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS venues CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS cities CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS migrations CASCADE');

    console.log('✅ All tables dropped successfully');
    await dataSource.destroy();
  } catch (error) {
    console.error('Error dropping tables:', error);
    process.exit(1);
  }
}

dropTables();
