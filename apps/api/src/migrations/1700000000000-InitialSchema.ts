import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Using native PostgreSQL types (no PostGIS required)

    // Cities table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        country_code CHAR(2) NOT NULL,
        center_lat DECIMAL(10, 8) NOT NULL,
        center_lng DECIMAL(11, 8) NOT NULL,
        bounds JSONB,
        timezone VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cities_active ON cities(is_active) WHERE is_active = true;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cities_location ON cities(center_lat, center_lng);
    `);

    // Venues table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS venues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        location POINT,
        categories JSONB,
        rating DECIMAL(3, 2),
        rating_count INTEGER,
        photo_refs JSONB,
        hours JSONB,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'duplicate')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status) WHERE status = 'active';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_venues_location ON venues USING GIST(location);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_venues_categories ON venues USING GIN(categories);
    `);

    // Venue Sources table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS venue_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        source VARCHAR(50) NOT NULL,
        external_id VARCHAR(255) NOT NULL,
        last_synced_at TIMESTAMP WITH TIME ZONE,
        raw_hash VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(source, external_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_venue_sources_venue ON venue_sources(venue_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_venue_sources_external ON venue_sources(source, external_id);
    `);

    // Venue Overrides table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS venue_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        name_override VARCHAR(255),
        address_override TEXT,
        pin_override POINT,
        category_overrides JSONB,
        hidden BOOLEAN DEFAULT false,
        note TEXT,
        updated_by VARCHAR(255),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(venue_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_venue_overrides_venue ON venue_overrides(venue_id);
    `);

    // Venue Partners table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS venue_partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        merchant_user_id VARCHAR(255),
        response_time_target_seconds INTEGER DEFAULT 300,
        subscription_tier VARCHAR(20),
        subscription_expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(venue_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_venue_partners_venue ON venue_partners(venue_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_venue_partners_active ON venue_partners(is_active) WHERE is_active = true;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_venue_partners_merchant ON venue_partners(merchant_user_id);
    `);

    // User Saved Venues table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_saved_venues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, venue_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_saved_venues_user ON user_saved_venues(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_saved_venues_venue ON user_saved_venues(venue_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_saved_venues;`);
    await queryRunner.query(`DROP TABLE IF EXISTS venue_partners;`);
    await queryRunner.query(`DROP TABLE IF EXISTS venue_overrides;`);
    await queryRunner.query(`DROP TABLE IF EXISTS venue_sources;`);
    await queryRunner.query(`DROP TABLE IF EXISTS venues;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cities;`);
  }
}
