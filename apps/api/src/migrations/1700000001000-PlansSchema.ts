import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlansSchema1700000001000 implements MigrationInterface {
  name = 'PlansSchema1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Plans table
    await queryRunner.query(`
      CREATE TABLE plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_chat_id BIGINT NOT NULL,
        initiator_id VARCHAR(255) NOT NULL,
        city_id UUID,
        date DATE NOT NULL,
        time TIME NOT NULL,
        area VARCHAR(255),
        location_lat DECIMAL(10, 8),
        location_lng DECIMAL(11, 8),
        budget VARCHAR(10),
        format VARCHAR(50),
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'voting', 'closed', 'cancelled')),
        voting_ends_at TIMESTAMP WITH TIME ZONE,
        winning_venue_id UUID REFERENCES venues(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_plans_telegram_chat ON plans(telegram_chat_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_plans_status ON plans(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_plans_initiator ON plans(initiator_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_plans_date ON plans(date);
    `);

    // Participants table
    await queryRunner.query(`
      CREATE TABLE participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        preferences JSONB,
        location_lat DECIMAL(10, 8),
        location_lng DECIMAL(11, 8),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(plan_id, user_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_participants_plan ON participants(plan_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_participants_user ON participants(user_id);
    `);

    // Votes table
    await queryRunner.query(`
      CREATE TABLE votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ended_at TIMESTAMP WITH TIME ZONE,
        winner_venue_id UUID REFERENCES venues(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_votes_plan ON votes(plan_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_votes_status ON votes(status);
    `);

    // Vote casts table
    await queryRunner.query(`
      CREATE TABLE vote_casts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        venue_id UUID NOT NULL REFERENCES venues(id),
        cast_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(vote_id, user_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vote_casts_vote ON vote_casts(vote_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vote_casts_plan ON vote_casts(plan_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vote_casts_user ON vote_casts(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vote_casts_venue ON vote_casts(venue_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vote_casts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS votes;`);
    await queryRunner.query(`DROP TABLE IF EXISTS participants;`);
    await queryRunner.query(`DROP TABLE IF EXISTS plans;`);
  }
}
